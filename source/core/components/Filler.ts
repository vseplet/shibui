import type { Pot } from "$core/entities";
import {
  SourceType,
  type TCore,
  type TEventDrivenLogger,
  type TTask,
} from "$core/types";

export class Filler {
  #core: TCore<{}>;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;

  constructor(core: TCore<{}>, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Filler",
    });
  }

  registerTask(task: TTask) {
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
