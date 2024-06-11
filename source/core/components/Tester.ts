// deno-lint-ignore-file no-unused-vars
import { TRIGGER_OP_ALLOW, TRIGGER_OP_DENY } from "../constants.ts";
import type { Pot } from "../entities/mod.ts";
import STRS from "../strings.ts";
import {
  type IEventDrivenLogger,
  type IPot,
  type IShibuiCore,
  type ITask,
  type IWorkflow,
  PotType,
  SourceType,
  type TasksStorage,
  type TaskTriggerStorage,
  type WorkflowsStorage,
  type WorkflowTriggersStorage,
} from "$core/types";
import { Filler } from "./Filler.ts";
import Runner from "./Runner.ts";

export class Tester {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;
  #filler: Filler;
  #runner: Runner;

  #tasks: TasksStorage = {};
  #workflows: WorkflowsStorage = {};

  #taskTriggers: TaskTriggerStorage = {}; // запускаются от одного пота
  #dependentTaskTriggers: TaskTriggerStorage = {}; // запускаются от нескольких потов
  #workflowTriggers: WorkflowTriggersStorage = {}; // запускаются от одного пота и генерирует контекст в очередь
  #workflowTaskTriggers: TaskTriggerStorage = {}; // запускаются от одного контекстного пота
  #workflowDependentTaskTriggers: TaskTriggerStorage = {}; // запускаются от нескольких потов, но при наличии контекста

  constructor(core: IShibuiCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Tester",
    });
    this.#filler = new Filler(core, kv);
    this.#runner = new Runner(core, kv);
  }

  registerTask(task: ITask) {
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

  registerWorkflow(workflow: IWorkflow) {
    this.#workflows[workflow.name] = workflow;
    workflow.tasks.forEach((task) => this.registerTask(task));
    for (const potName in workflow.triggers) {
      this.#workflowTriggers[potName] ||= [];
      this.#workflowTriggers[potName].push(workflow.triggers[potName]);
    }
    this.#log.vrb(STRS.rwn(workflow));
  }

  show() {
    console.log(this.#taskTriggers);
    console.log(this.#dependentTaskTriggers);
    // console.log(this.#workflowTriggers);
    // console.log(this.#workflowDependentTaskTriggers);
  }

  test(pot: Pot): boolean {
    if (pot.type == PotType.CONTEXT) {
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

  #createTriggerHandlerContext(
    potName: string,
    taskName: string,
    slot: number,
    pots: [
      IPot,
      IPot | undefined,
      IPot | undefined,
      IPot | undefined,
      IPot | undefined,
    ],
  ) {
    return {
      core: this.#core,
      allow: (index?: number) => ({
        op: TRIGGER_OP_ALLOW,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: TRIGGER_OP_DENY }),
      log: this.#core.createLogger({
        sourceType: SourceType.TASK,
        sourceName: `ON (${[potName]}): ${taskName}`,
      }),
      pots,
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

      const triggerContext = this.#createTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        [pot, undefined, undefined, undefined, undefined],
      );

      const result = trigger.handler(triggerContext);

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
      this.#log.trc(
        `not found depended task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec depended task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const triggerContext = this.#createTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        [pot, undefined, undefined, undefined, undefined],
      );

      const result = trigger.handler(triggerContext);

      if (result.op === TRIGGER_OP_ALLOW) {
        this.#log.inf(
          `allow run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );

        const pack = this.#filler.fill(
          trigger.taskName,
          pot,
          result.potIndex || 0,
        );

        if (pack) this.#runner.run(pack.taskName, pack.pots);
        return true;
      } else if (result.op === TRIGGER_OP_DENY) {
        this.#log.inf(
          `deny run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        return false;
      }
    }).includes(true);
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

  #testWorkflowTaskTriggers(pot: Pot): boolean {
    const triggers = this.#workflowTaskTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec workflow '${trigger.belongsToWorkflow}' task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const triggerContext = this.#createTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        [pot, undefined, undefined, undefined, undefined],
      );

      const result = trigger.handler(triggerContext);

      if (result.op === TRIGGER_OP_ALLOW) {
        this.#log.inf(
          `allow run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        this.#runner.run(trigger.taskName, [pot]);
        return true;
      } else if (result.op === TRIGGER_OP_DENY) {
        this.#log.inf(
          `deny run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        return false;
      }
    }).includes(true);
  }

  #testWorkflowDependedTaskTriggers(pot: Pot): boolean {
    return false;
  }
}
