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

// deno-lint-ignore-file no-unused-vars
import {
  POT_TYPE_CONTEXT,
  TRIGGER_OP_ALLOW,
  TRIGGER_OP_DENY,
} from "$core/constants";
import type { Pot } from "$core/entities";
import STRS from "$core/strings";
import {
  SourceType,
  type TAnyCore,
  type TasksStorage,
  type TEventDrivenLogger,
  type TSpicy,
  type TTask,
  type TTaskTriggerStorage,
  type TWorkflow,
  type TWorkflowTriggersStorage,
  type WorkflowsStorage,
} from "$core/types";
import { Filler, Runner } from "$core/components";

export class Tester {
  #core: TAnyCore;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;
  #filler: Filler;
  #runner: Runner;
  #spicy: TSpicy;

  #tasks: TasksStorage = {};
  #workflows: WorkflowsStorage = {};

  #taskTriggers: TTaskTriggerStorage = {}; // запускаются от одного пота
  #dependentTaskTriggers: TTaskTriggerStorage = {}; // запускаются от нескольких потов
  #workflowTriggers: TWorkflowTriggersStorage = {}; // запускаются от одного пота и генерирует контекст в очередь
  #workflowTaskTriggers: TTaskTriggerStorage = {}; // зап��скаются от одного контекстного пота
  #workflowDependentTaskTriggers: TTaskTriggerStorage = {}; // запускаются от нескольких потов, но при наличии контекста

  constructor(core: TAnyCore, kv: Deno.Kv, spicy = {}) {
    this.#spicy = spicy;
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Tester",
    });
    this.#filler = new Filler(core, kv);
    this.#runner = new Runner(core, kv, this.#spicy);
  }

  registerTask(task: TTask) {
    this.#filler.registerTask(task);
    this.#runner.registerTask(task);

    this.#tasks[task.name] = task;
    const triggersCount = Object.keys(task.triggers).length;
    const storage = task.belongsToWorkflow
      ? triggersCount > 1
        ? this.#workflowDependentTaskTriggers
        : this.#workflowTaskTriggers
      : triggersCount > 1
      ? this.#dependentTaskTriggers
      : this.#taskTriggers;

    for (const potName in task.triggers) {
      storage[potName] ||= [];
      storage[potName].push(...task.triggers[potName]);
    }

    this.#log.vrb(STRS.rtn$own(task));
  }

  registerWorkflow(workflow: TWorkflow) {
    this.#workflows[workflow.name] = workflow;
    workflow.tasks.forEach((task) => this.registerTask(task));
    for (const potName in workflow.triggers) {
      this.#workflowTriggers[potName] ||= [];
      this.#workflowTriggers[potName].push(workflow.triggers[potName]);
    }
    // this.#log.vrb(STRS.rwn(workflow));
  }

  show() {
    console.log(this.#taskTriggers);
    console.log(this.#dependentTaskTriggers);
    // console.log(this.#workflowTriggers);
    // console.log(this.#workflowDependentTaskTriggers);
  }

  test(pot: Pot): boolean {
    if (pot.type == POT_TYPE_CONTEXT) {
      return this.#testWorkflowTaskTriggers(pot) ||
        this.#testWorkflowDependedTaskTriggers(pot);
    } else {
      return this.#testTaskTriggers(pot) ||
        this.#testDependedTaskTriggers(pot) ||
        this.#testWorkflowTriggers(pot) ||
        this.#testWorkflowTaskTriggers(pot) ||
        this.#testWorkflowDependedTaskTriggers(pot);
    }
  }

  #createTaskTriggerHandlerContext(
    potName: string,
    taskName: string,
    slot: number,
    pot: Pot,
  ) {
    return {
      core: this.#core,
      ...this.#spicy,
      allow: (index?: number) => ({
        op: TRIGGER_OP_ALLOW,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: TRIGGER_OP_DENY }),
      log: this.#core.createLogger({
        sourceType: SourceType.TASK,
        sourceName: `ON (${[potName]}): ${taskName}`,
      }),
      pot,
    };
  }

  #createWorkflowTaskTriggerHandlerContext(
    potName: string,
    taskName: string,
    slot: number,
    ctx: Pot,
    pot?: Pot,
  ) {
    return {
      core: this.#core,
      ...this.#spicy,
      allow: (index?: number) => ({
        op: TRIGGER_OP_ALLOW,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: TRIGGER_OP_DENY }),
      log: this.#core.createLogger({
        sourceType: SourceType.TASK,
        sourceName: `ON (${[potName]}): ${taskName}`,
      }),
      ctx,
      pot,
    };
  }

  #testTaskTriggers(pot: Pot): boolean {
    const triggers = this.#taskTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const result = trigger.handler(this.#createTaskTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        pot,
      ));

      if (result.op === TRIGGER_OP_ALLOW) {
        this.#log.inf(
          `allow run task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        this.#runner.run(trigger.taskName, [pot]);
        return true;
      } else if (result.op === TRIGGER_OP_DENY) {
        this.#log.inf(
          `deny run task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        return false;
      }
    }).includes(true);
  }

  #testDependedTaskTriggers(pot: Pot): boolean {
    const triggers = this.#dependentTaskTriggers[pot.name];
    if (!triggers) {
      this.#log.trc(`not found depended task triggers for pot '${pot.name}'`);
      return false;
    }

    return triggers.some((trigger) => {
      this.#log.trc(
        `trying to exec depended task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );
      const triggerContext = this.#createTaskTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        pot,
      );

      const result = trigger.handler(triggerContext);
      if (result.op === TRIGGER_OP_ALLOW) {
        this.#log.inf(
          `allow run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        const pack = this.#filler.fill(
          trigger.taskName,
          pot,
          result?.potIndex || 0,
        );
        if (pack) {
          this.#runner.run(pack.taskName, pack.pots);
        }
        return true;
      } else if (result.op === TRIGGER_OP_DENY) {
        this.#log.inf(
          `deny run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );
      }
      return false;
    });
  }

  #testWorkflowTriggers(pot: Pot): boolean {
    const triggers = this.#workflowTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec trigger handler from workflow '${trigger.workflowName}' by pot '${pot.name}'...`,
      );

      // TODO: переделать
      const contextPot = trigger.handler({
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
    }).includes(true);
  }

  #testWorkflowTaskTriggers(ctx: Pot): boolean {
    const triggers = this.#workflowTaskTriggers[ctx.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow task triggers for pot '${ctx.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec workflow '${trigger.belongsToWorkflow}' task trigger handler '${trigger.taskName}' by ctx '${ctx.name}'...`,
      );

      const result = trigger.handler(
        this.#createWorkflowTaskTriggerHandlerContext(
          ctx.name,
          trigger.taskName,
          trigger.slot,
          ctx,
        ),
      );

      if (result.op === TRIGGER_OP_ALLOW) {
        this.#log.inf(
          `allow run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by ctx '${ctx.name}'`,
        );
        this.#runner.run(trigger.taskName, [], ctx);
        return true;
      } else if (result.op === TRIGGER_OP_DENY) {
        this.#log.inf(
          `deny run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by ctx '${ctx.name}'`,
        );
        return false;
      }
    }).includes(true);
  }

  #testWorkflowDependedTaskTriggers(pot: Pot): boolean {
    return false;
  }
}
