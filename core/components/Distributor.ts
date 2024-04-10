/*
 * Copyright 2023 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { IPot, Pot, PotType } from "../entities/Pot.ts";
import {
  ITask,
  ITaskBuilder,
  TaskBuilder,
  TaskTrigger,
  TriggerHandlerOp,
} from "../entities/TaskBuilder.ts";
import {
  IWorkflow,
  IWorkflowBuilder,
  WorkflowBuilder,
  WorkflowTrigger,
} from "../entities/WorkflowBuilder.ts";
import { EventDrivenLogger } from "./EventDrivenLogger.ts";
import PotQueue from "./PotQueue.ts";
import Runner from "./Runner.ts";
import core from "../mod.ts";
import { delay } from "https://deno.land/std@0.196.0/async/delay.ts";
import SlotFiller from "../components/SlotFiller.ts";
import { CoreStartPot } from "../../pots/CoreStartPot.ts";
import { SourceType } from "../../events/LogEvents.ts";

export default class Distributor {
  #logger = new EventDrivenLogger({
    sourceType: SourceType.CORE,
    sourceName: "Distributor",
  });
  #queue = new PotQueue<IPot>();
  #filler = new SlotFiller();
  #defaultRunner = new Runner();

  #workflows: { [name: string]: IWorkflow } = {};
  #workflowTriggers: {
    [name: string]: Array<WorkflowTrigger>;
  } = {};
  #tasks: { [name: string]: ITask } = {};
  #taskTriggers: {
    [name: string]: Array<TaskTrigger>;
  } = {};

  constructor() {
    this.#filler.onRowFill((
      name: string,
      pots: Array<Pot<any>>,
    ) => (this.#defaultRunner.runDoHandler(name, pots)));
  }

  #registerTask(builder: ITaskBuilder) {
    const task = builder.build();
    this.#tasks[builder.task.name] = task;

    for (const potName in task.triggers) {
      if (!this.#taskTriggers[potName]) this.#taskTriggers[potName] = [];

      task.triggers[potName].forEach((trigger) =>
        this.#taskTriggers[potName].push(trigger)
      );
    }

    this.#filler.allocateSlots(task);

    if (task.belongsToWorkflow) {
      this.#logger.inf(
        `registered task '${task.name}' of workflow '${task.belongsToWorkflow}'`,
      );
    } else {
      this.#logger.inf(`registered task '${task.name}'`);
    }

    this.#defaultRunner.registerTask(task);
  }

  #registerWorkflow(builder: IWorkflowBuilder) {
    const workflow = builder.build();
    this.#workflows[workflow.name] = workflow;

    for (const potName in workflow.triggers) {
      if (!this.#workflowTriggers[potName]) {
        this.#workflowTriggers[potName] = [];
      }
      const trigger = workflow.triggers[potName];

      this.#workflowTriggers[potName].push(trigger);
    }

    builder.taskBuilders.forEach((builder) => {
      this.#registerTask(builder);
    });

    this.#logger.inf(`registered workflow '${workflow.name}'`);
  }

  #resend(pot: IPot) {
    if (pot.ttl > 0) {
      this.#logger.trc(
        `return pot '${pot.name}' with ttl:{${pot.ttl}} back to the queue`,
      );
      pot.ttl--;
      this.#queue.pushLast(pot);
    } else {
      this.#logger.wrn(
        `pot '${pot.name}' ran out of ttl =(`,
      );
    }
  }

  #runWorkflowTriggerHandler(pot: IPot, trigger: WorkflowTrigger): boolean {
    try {
      this.#logger.trc(
        `trying to exec trigger handler from workflow '${trigger.workflowName}' by pot '${pot.name}'...`,
      );

      const contextPot = trigger.test({
        api: core.api,
        log: new EventDrivenLogger({
          sourceType: SourceType.WORKFLOW,
          sourceName: `ON (${[pot.name]}): ${trigger.workflowName}`,
        }),
        pot,
      });

      if (!contextPot) {
        this.#logger.trc(
          `deny run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
        );
        return false;
      }

      this.#logger.vrb(
        `allow run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
      );

      // TODO: переделать
      contextPot.to.task = this.#workflows[trigger.workflowName].firstTaskName;
      contextPot.to.workflow = trigger.workflowName;
      contextPot.from.workflow = trigger.workflowName;

      core.api.send(contextPot);

      return true;
    } catch (err) {
      this.#logger.err(err);
      return false;
    }
  }

  #runSingleTaskTriggerHandler(pot: IPot, trigger: TaskTrigger): boolean {
    try {
      this.#logger.trc(
        `trying to exec trigger handler from task '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const result = trigger.handler({
        api: core.api,
        allow: (index?: number) => ({
          op: TriggerHandlerOp.ALLOW,
          potIndex: index ? index : trigger.slot,
        }),
        deny: () => ({ op: TriggerHandlerOp.DENY }),
        log: new EventDrivenLogger({
          sourceType: SourceType.TASK,
          sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
        }),
        ctx: pot,
      });

      if (result.op == TriggerHandlerOp.ALLOW) {
        this.#logger.vrb(
          `allow run '${trigger.taskName}' by pot '${pot.name}'`,
        );
        this.#filler.fill(trigger.taskName, pot, result.potIndex);
        return true;
      } else if (result.op == TriggerHandlerOp.DENY) {
        this.#logger.trc(`deny run '${trigger.taskName}' by pot '${pot.name}'`);
        return false;
      }

      return false;
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#logger.err(
          `trying to exec trigger handler from task '${trigger.taskName}' by pot '${pot.name}' failed with error: '${err.message}'`,
        );
      }

      return true;
    }
  }

  // TODO: ПЕРЕПИШИ ЭТО ГОВНИЩЕ, ПЖ)))
  #runWorkflowTaskTriggerHandler(pot: IPot, trigger: TaskTrigger): boolean {
    try {
      let contextPots: Map<number, IPot> = new Map();
      if (pot.type === PotType.CONTEXT) {
        if (
          pot.to.task !== trigger.taskName ||
          pot.to.workflow !== trigger.belongsToWorkflow
        ) {
          return false;
        }

        this.#logger.trc(
          `trying to exec trigger handler from '${trigger.taskName}' by context pot '${pot.name}'...`,
        );

        const result = trigger.handler({
          api: core.api,
          allow: (index?: number) => ({
            op: TriggerHandlerOp.ALLOW,
            potIndex: index ? index : trigger.slot,
          }),
          deny: () => ({ op: "deny" }),
          log: new EventDrivenLogger({
            sourceType: SourceType.TASK,
            sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
          }),
          ctx: pot,
        });

        if (result.op == TriggerHandlerOp.ALLOW) {
          this.#logger.vrb(
            `allow run '${trigger.taskName}' by pot '${pot.name}'`,
          );
          if (
            this.#filler.fill(
              trigger.taskName,
              pot,
              result.potIndex,
            )
          ) {
            return true;
          }
        } else if (result.op == TriggerHandlerOp.DENY) {
          this.#logger.trc(
            `deny run '${trigger.taskName}' by pot '${pot.name}'`,
          );
          return false;
        }
      } else {
        contextPots = this.#filler.getContexts(trigger.taskName);
      }

      let dec = 0;
      let res = false;
      for (const [rowIndex, ctx] of contextPots) {
        this.#logger.trc(
          `trying to exec trigger handler from '${trigger.taskName}' by context pot ${ctx.name} and pot '${pot.name}'...`,
        );

        const result = trigger.handler({
          api: core.api,
          allow: (index?: number) => ({
            op: TriggerHandlerOp.ALLOW,
            potIndex: index ? index : trigger.slot,
          }),
          deny: () => ({ op: "deny" }),
          log: new EventDrivenLogger({
            sourceType: SourceType.TASK,
            sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
          }),
          ctx: ctx,
          pot: pot,
        });

        if (result.op == TriggerHandlerOp.ALLOW) {
          this.#logger.vrb(
            `allow run '${trigger.taskName}' by pot '${pot.name}'`,
          );
          if (
            this.#filler.fill(
              trigger.taskName,
              pot,
              result.potIndex,
              rowIndex - dec,
            )
          ) dec++;
          res = true;
        } else if (result.op == TriggerHandlerOp.DENY) {
          this.#logger.trc(
            `deny run '${trigger.taskName}' by pot '${pot.name}'`,
          );
        }
      }

      return res;
    } catch (err) {
      this.#logger.err(`${err}, ${err.stack}`);
      return false;
    }
  }

  #testWorkflowTriggers(pot: IPot): boolean {
    const triggers = this.#workflowTriggers[pot.name];
    if (!triggers) {
      this.#logger.trc(
        `not found workflow triggers for pot '${pot.name}'`,
      );
      return false;
    }

    this.#logger.trc(
      `found ${triggers.length} workflow triggers for pot '${pot.name}'`,
    );

    return triggers.map((trigger) =>
      this.#runWorkflowTriggerHandler(pot, trigger)
    ).includes(true);
  }

  #testTaskTriggers(pot: IPot): boolean {
    const triggers = this.#taskTriggers[pot.name];
    if (!triggers) {
      this.#logger.trc(
        `not found task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    this.#logger.trc(
      `found ${triggers.length} task triggers for pot '${pot.name}'`,
    );

    return triggers.map((trigger) =>
      trigger.belongsToWorkflow === undefined
        ? this.#runSingleTaskTriggerHandler(pot, trigger)
        // @ts-ignore
        : this.#runWorkflowTaskTriggerHandler(pot, trigger)
    ).includes(true);
  }

  #test(pot: IPot): boolean {
    const a = this.#testWorkflowTriggers(pot);
    const b = this.#testTaskTriggers(pot);
    return a || b;
  }

  start() {
    // deno-lint-ignore require-await
    const update = async () => {
      for (let i = 100; i--;) { // WARN: ? при i > 1 TTL может истечь быстрее, чем смогут отработать do handler'ы
        // console.log(`----------------- update queue -----------------`);
        // console.log(this.#queue.get());

        try {
          const pot = this.#queue.popFirst();
          if (pot) {
            this.#logger.vrb(`received a pot '${pot.name}, ttl:{${pot.ttl}}'`);

            if (!this.#test(pot) && pot.ttl > 0) {
              this.#resend(pot);
            } else {
              this.#logger.vrb(`drop the pot '${pot.name} from queue`);
            }
          } else {
            break;
          }
        } catch (err: unknown) {
          if (err instanceof Error) {
            this.#logger.flt(
              `failure in pot processing cycle with error: ${err.message} ${err.stack}`,
            );

            // core.api.send(new core.pots.core.CoreLoopCrushedPot());
          }
        }

        await delay(0); // WARN: позволяем отработать другим микротаскам (обработать резульатат do handler'ов?)
      }

      setTimeout(update);
    };

    this.#logger.inf(`starting update cycle...`);
    core.api.send(new CoreStartPot());
    update();
  }

  register(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
      this.#registerWorkflow(builder);
    } else if (builder instanceof TaskBuilder) {
      this.#registerTask(builder);
    }
  }

  disable(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
    }
  }

  enable(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
    }
  }

  send(pot: IPot) {
    this.#logger.trc(`sending pot '${pot.name} to queue'`);
    this.#queue.pushLast(pot);
  }
}
