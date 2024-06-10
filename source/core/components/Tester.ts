// deno-lint-ignore-file no-unused-vars
import type { Pot } from "../entities/mod.ts";
import STRS from "../strings.ts";
import {
  type IEventDrivenLogger,
  IPot,
  type IShibuiCore,
  type ITask,
  type IWorkflow,
  SourceType,
  type TasksStorage,
  type TaskTriggerStorage,
  TriggerHandlerContext,
  TriggerHandlerOp,
  type WorkflowsStorage,
  type WorkflowTriggersStorage,
} from "../types.ts";
import { Filler } from "./Filler.ts";

export class Tester {
  #core: IShibuiCore;
  #filler: Filler;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;

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
  }

  registerTask(task: ITask) {
    this.#filler.registerTask(task);
    this.#tasks[task.name] = task;
    const triggersCount = Object.keys(task.triggers).length;
    const storage = task.belongsToWorkflow
      ? triggersCount > 1
        ? this.#workflowTaskTriggers
        : this.#workflowDependentTaskTriggers
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
    console.log(this.#workflowTriggers);
  }

  test(pot: Pot): boolean {
    return this.#testTaskTriggers(pot) ||
      this.#testDependedTaskTriggers(pot) ||
      this.#testWorkflowTriggers(pot) ||
      this.#testWorkflowTaskTriggers(pot) ||
      this.#testWorkflowDependedTaskTriggers(pot);
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
        op: "ALLOW" as TriggerHandlerOp,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: "DENY" as TriggerHandlerOp }),
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

    for (const trigger of triggers) {
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

      if (result.op == "ALLOW") {
        this.#log.inf(
          `allow run task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        this.#filler.fill(trigger.taskName, pot, result.potIndex || 0);
        return true;
      } else if (result.op == "DENY") {
        this.#log.inf(
          `deny run task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        return false;
      }
    }

    return false;
  }

  #testDependedTaskTriggers(pot: Pot): boolean {
    return false;
  }

  #testWorkflowTriggers(pot: Pot): boolean {
    const triggers = this.#workflowTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow triggers for pot '${pot.name}'`,
      );
      return false;
    }

    for (const trigger of triggers) {
      trigger.test;
    }

    return false;
  }

  #testWorkflowTaskTriggers(pot: Pot): boolean {
    const triggers = this.#workflowTaskTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    for (const trigger of triggers) {
      trigger.handler;
    }

    return false;
  }

  #testWorkflowDependedTaskTriggers(pot: Pot): boolean {
    return false;
  }
}
