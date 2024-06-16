import type { Pot } from "$core/entities";
import {
  SourceType,
  type TCore,
  type TEventDrivenLogger,
  type TTask,
} from "$core/types";
import { TNewTask } from "../entities/TaskBuilder.ts";

export class Filler {
  #core: TAnyCore;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;

  constructor(core: TAnyCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Filler",
    });
  }

  registerTask(task: TNewTask) {
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
