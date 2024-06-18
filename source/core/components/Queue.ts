import type { TAnyCore, TEventDrivenLogger } from "$core/types";

export class QueueInMemory {
  #core: TAnyCore;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;

  constructor(core: TAnyCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({});
  }
}

export class QueueKV {
  #core: TAnyCore;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;

  constructor(core: TAnyCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({});
  }
}

export class Queue {}
