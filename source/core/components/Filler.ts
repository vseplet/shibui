import type { Pot } from "../entities/mod.ts";
import {
  type IEventDrivenLogger,
  type IShibuiCore,
  type ITask,
  SourceType,
} from "../types.ts";
import Runner from "./Runner.ts";

export class Filler {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;
  #runner: Runner;

  constructor(core: IShibuiCore, kv: Deno.Kv) {
    this.#core = core;
    this.#runner = new Runner(core, kv);
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Filler",
    });
  }

  registerTask(task: ITask) {
    this.#runner.registerTask(task);
  }

  fill(taskkName: string, pot: Pot, slot: number): {
    taskName: string;
    pots: Array<Pot>;
  } | null {
    return {
      taskName: "",
      pots: [],
    };
  }
}
