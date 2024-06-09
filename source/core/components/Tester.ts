import type { Pot } from "../entities/mod.ts";
import STRS from "../strings.ts";
import {
  type IEventDrivenLogger,
  type IShibuiCore,
  type ITask,
  type IWorkflow,
  SourceType,
  type TasksStorage,
  type TaskTriggerStorage,
  type WorkflowsStorage,
  type WorkflowTriggersStorage,
} from "../types.ts";

export class Tester {
  #core: IShibuiCore;
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
  }

  registerTask(task: ITask) {
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

  test(pot: Pot): {
    forward: boolean;
    name: string;
    pots: Array<Pot>;
  } {
    return {
      forward: false,
      name: "",
      pots: [],
    };
  }
}
