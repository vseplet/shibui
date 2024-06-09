import type { Pot } from "../entities/mod.ts";
import {
  type IEventDrivenLogger,
  type IShibuiCore,
  SourceType,
} from "../types.ts";

export class Filler {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;

  constructor(core: IShibuiCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Runner",
    });
  }

  fill(pot: Pot) {}
}
