import type { Pot } from "$core/entities";
import {
  type IEventDrivenLogger,
  type IShibuiCore,
  type ITask,
  SourceType,
} from "$core/types";

export class Filler {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;

  constructor(core: IShibuiCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Filler",
    });
  }

  registerTask(task: ITask) {
  }

  fill(taskkName: string, pot: Pot, slot: number): {
    taskName: string;
    pots: Array<Pot>;
  } | null {
    // тут что-то

    return {
      taskName: "",
      pots: [],
    };
  }
}
