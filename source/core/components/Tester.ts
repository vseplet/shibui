import type { Pot } from "../entities/mod.ts";
import {
  type IEventDrivenLogger,
  type IShibuiCore,
  type ITask,
  type IWorkflow,
  SourceType,
} from "../types.ts";

export class Tester {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;
  #tasks: { [name: string]: ITask } = {};
  #workflows: { [name: string]: IWorkflow } = {};

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
    this.#log.inf(`registered task '${task.name}'`);
  }

  registerWorkflow(workflows: IWorkflow) {
    this.#workflows[workflows.name] = workflows;
    this.#log.inf(`registered workflows '${workflows.name}'`);
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
