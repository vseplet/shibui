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

import Runner from "./Runner.ts";
import SlotFiller from "../components/SlotFiller.ts";
import { CoreStartPot } from "../pots/CoreStartPot.ts";
import { Pot } from "../entities/Pot.ts";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import { WorkflowBuilder } from "../entities/WorkflowBuilder.ts";
import {
  type IEventDrivenLogger,
  type IPot,
  type IShibuiCore,
  type ITask,
  type ITaskBuilder,
  type IWorkflow,
  type IWorkflowBuilder,
  PotType,
  SourceType,
  type TaskTrigger,
  TriggerHandlerOp,
  type WorkflowTrigger,
} from "../types.ts";
import { Tester } from "./Tester.ts";

export default class Distributor {
  #kv: Deno.Kv = undefined as unknown as Deno.Kv;
  #core: IShibuiCore;
  #log: IEventDrivenLogger;

  #defaultRunner: Runner;
  #defaultTester: Tester;

  #filler = new SlotFiller();

  #workflows: { [name: string]: IWorkflow } = {};
  #workflowTriggers: {
    [name: string]: Array<WorkflowTrigger>;
  } = {};
  #tasks: { [name: string]: ITask } = {};
  #taskTriggers: {
    [name: string]: Array<TaskTrigger>;
  } = {};

  constructor(core: IShibuiCore) {
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Distributor",
    });
    this.#defaultRunner = new Runner(core, this.#kv);
    this.#defaultTester = new Tester(core, this.#kv);

    this.#filler.onRowFill((
      name: string,
      pots: Array<Pot<any>>,
    ) => (this.#defaultRunner.run(name, pots)));
  }

  #runWorkflowTriggerHandler(pot: IPot, trigger: WorkflowTrigger): boolean {
    try {
      this.#log.trc(
        `trying to exec trigger handler from workflow '${trigger.workflowName}' by pot '${pot.name}'...`,
      );

      const contextPot = trigger.test({
        core: this.#core,
        log: this.#core.createLogger({
          sourceType: SourceType.WORKFLOW,
          sourceName: `ON (${[pot.name]}): ${trigger.workflowName}`,
        }),
        pot,
      });

      if (!contextPot) {
        this.#log.trc(
          `deny run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
        );
        return false;
      }

      this.#log.vrb(
        `allow run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
      );

      // TODO: переделать
      contextPot.to.task = this.#workflows[trigger.workflowName].firstTaskName;
      contextPot.to.workflow = trigger.workflowName;
      contextPot.from.workflow = trigger.workflowName;

      this.#core.send(contextPot);

      return true;
    } catch (err) {
      this.#log.err(err);
      return false;
    }
  }

  #runSingleTaskTriggerHandler(pot: IPot, trigger: TaskTrigger): boolean {
    try {
      this.#log.trc(
        `trying to exec trigger handler from task '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const result = trigger.handler({
        core: this.#core,
        allow: (index?: number) => ({
          op: TriggerHandlerOp.ALLOW,
          potIndex: index ? index : trigger.slot,
        }),
        deny: () => ({ op: TriggerHandlerOp.DENY }),
        log: this.#core.createLogger({
          sourceType: SourceType.TASK,
          sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
        }),
        pots: [pot],
      });

      if (result.op == TriggerHandlerOp.ALLOW) {
        this.#log.vrb(
          `allow run '${trigger.taskName}' by pot '${pot.name}'`,
        );
        this.#filler.fill(trigger.taskName, pot, result.potIndex);
        return true;
      } else if (result.op == TriggerHandlerOp.DENY) {
        this.#log.trc(`deny run '${trigger.taskName}' by pot '${pot.name}'`);
        return false;
      }

      return false;
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#log.err(
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

        this.#log.trc(
          `trying to exec trigger handler from '${trigger.taskName}' by context pot '${pot.name}'...`,
        );

        const result = trigger.handler({
          core: this.#core,
          allow: (index?: number) => ({
            op: TriggerHandlerOp.ALLOW,
            potIndex: index ? index : trigger.slot,
          }),
          deny: () => ({ op: TriggerHandlerOp.DENY }),
          log: this.#core.createLogger({
            sourceType: SourceType.TASK,
            sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
          }),
          pots: [pot],
        });

        if (result.op == TriggerHandlerOp.ALLOW) {
          this.#log.vrb(
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
          this.#log.trc(
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
        this.#log.trc(
          `trying to exec trigger handler from '${trigger.taskName}' by context pot ${ctx.name} and pot '${pot.name}'...`,
        );

        const result = trigger.handler({
          core: this.#core,
          allow: (index?: number) => ({
            op: TriggerHandlerOp.ALLOW,
            potIndex: index ? index : trigger.slot,
          }),
          deny: () => ({ op: TriggerHandlerOp.DENY }),
          log: this.#core.createLogger({
            sourceType: SourceType.TASK,
            sourceName: `ON (${[pot.name]}): ${trigger.taskName}`,
          }),
          pots: [ctx, pot],
        });

        if (result.op == TriggerHandlerOp.ALLOW) {
          this.#log.vrb(
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
          this.#log.trc(
            `deny run '${trigger.taskName}' by pot '${pot.name}'`,
          );
        }
      }

      return res;
    } catch (err) {
      this.#log.err(`${err}, ${err.stack}`);
      return false;
    }
  }

  #testWorkflowTriggers(pot: IPot): boolean {
    const triggers = this.#workflowTriggers[pot.name];
    if (!triggers) {
      this.#log.trc(
        `not found workflow triggers for pot '${pot.name}'`,
      );
      return false;
    }

    this.#log.trc(
      `found ${triggers.length} workflow triggers for pot '${pot.name}'`,
    );

    return triggers.map((trigger) =>
      this.#runWorkflowTriggerHandler(pot, trigger)
    ).includes(true);
  }

  #testTaskTriggers(pot: IPot): boolean {
    const triggers = this.#taskTriggers[pot.name];
    if (!triggers) {
      this.#log.trc(
        `not found task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    this.#log.trc(
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

  #registerTask(builder: ITaskBuilder) {
    const task = builder.build();
    this.#tasks[builder.task.name] = task;
    this.#defaultRunner.registerTask(task);

    for (const potName in task.triggers) {
      if (!this.#taskTriggers[potName]) this.#taskTriggers[potName] = [];

      task.triggers[potName].forEach((trigger) =>
        this.#taskTriggers[potName].push(trigger)
      );
    }

    this.#filler.allocateSlots(task);

    if (task.belongsToWorkflow) {
      this.#log.inf(
        `registered task '${task.name}' of workflow '${task.belongsToWorkflow}'`,
      );
    } else {
      this.#log.inf(`registered task '${task.name}'`);
    }
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

    this.#log.inf(`registered workflow '${workflow.name}'`);
  }

  #processPot(pot: Pot) {
    const { forward, name, pots } = this.#defaultTester.test(pot);
    if (!forward) return false;
    this.#defaultRunner.run(name, pots);
    return true;
  }

  async start() {
    this.#log.inf(`init deno kv...`);
    this.#kv = await Deno.openKv();

    this.#log.inf(`starting update cycle...`);
    this.#core.send(new CoreStartPot());

    this.#kv.listenQueue((rawPotObj: IPot) => {
      try {
        const pot = new Pot().deserialize(rawPotObj);

        if (pot) {
          this.#log.vrb(`received a pot '${pot.name}, ttl:{${pot.ttl}}'`);

          if (!this.#test(pot) && pot.ttl > 0) {
            this.resend(pot);
          } else {
            this.#log.vrb(`drop the pot '${pot.name} from queue`);
          }
        } else {
          return;
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.#log.flt(
            `failure in pot processing cycle with error: ${err.message} ${err.stack}`,
          );
        }
      }
    });
  }

  register(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
      this.#registerWorkflow(builder);

      // const workflow = builder.build();
      // this.#defaultTester.registerWorkflow(workflow);
      // this.#defaultRunner.registerWorkflow(workflow);
    } else if (builder instanceof TaskBuilder) {
      this.#registerTask(builder);

      // const task = builder.build();
      // this.#defaultTester.registerTask(task);
      // this.#defaultRunner.registerTask(task);
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

  resend(pot: IPot) {
    if (pot.ttl > 0) {
      this.#log.trc(
        `return pot '${pot.name}' with ttl:{${pot.ttl}} back to the queue`,
      );
      pot.ttl--;
      this.#kv.enqueue(pot);
    } else {
      this.#log.wrn(
        `pot '${pot.name}' ran out of ttl =(`,
      );
    }
  }

  send(pot: IPot) {
    this.#log.trc(`sending pot '${pot.name} to queue'`);
    this.#kv.enqueue(pot);
  }
}
