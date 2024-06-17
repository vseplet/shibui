import type { Pot } from "$core/entities";
import {
  SourceType,
  type TAnyCore,
  type TEventDrivenLogger,
  type TPot,
  type TTask,
} from "$core/types";

export class FillerInMemory {
  // #log = new EventDrivenLogger({
  //   sourceType: SourceType.CORE,
  //   sourceName: "SlotFiller",
  // });

  #slots: {
    [taskName: string]: {
      slots: Array<Array<TPot | undefined>>;
    };
  } = {};

  // TODO: вывести сигнатуру
  #rowFillHandler: any = () => {};

  public fill(
    taskName: string,
    pot: TPot,
    slot: number,
    row?: number,
  ): boolean {
    try {
      // this.#log.trc(
      //   `try to fill slots for '${taskName}' by pot '${pot.name} ${pot.uuid}' to slot ${slot}...'`,
      // );

      if (row !== undefined) {
        this.#slots[taskName].slots[slot][row] = pot;
      } else this.#slots[taskName].slots[slot].push(pot);

      const rowIndex = row || this.#slots[taskName].slots[slot].length - 1;
      const rowIsFilled = this.#slots[taskName].slots.every((arr) =>
        arr[rowIndex]
      );

      if (rowIsFilled) {
        // this.#log.trc(
        //   `row for'${taskName}' has been filled'`,
        // );

        const row = this.#slots[taskName].slots.map((arr) => arr[rowIndex]);
        // remove row before run do handler
        this.#slots[taskName].slots.forEach((arr) => arr.splice(rowIndex, 1));
        this.#rowFillHandler(taskName, row);
      }

      return true;
    } catch (err) {
      if (err instanceof Error) {
        // this.#log.err(
        //   `trying to fill slots for '${taskName}' by pot '${pot.name}' to slot ${slot} failed with error: '${err.message}'`,
        // );
      }
      return false;
    }
  }

  public allocateSlots(task: TTask) {
    this.#slots[task.name] = {
      slots: Array.from({ length: task.slotsCount }, () => []),
    };
  }

  public getRowWithContext(
    taskName: string,
    rowIndex: number,
  ): Array<TPot | undefined> | null {
    if (rowIndex < this.#slots[taskName].slots[0].length) {
      return this.#slots[taskName].slots.map((arr) => arr[rowIndex]);
    } else {
      return null;
    }
  }

  public getContext(taskName: string, slot = 0): TPot | undefined {
    const maxRow = this.#slots[taskName].slots[0].length;
    const freeRow = this.#slots[taskName].slots[slot].length;
    const contextPot = this.#slots[taskName].slots[0][freeRow];

    if (contextPot) {
      return contextPot;
    } else {
      return undefined;
    }
  }

  public getContexts(taskName: string): Map<number, TPot> {
    const contexts: Map<number, TPot> = new Map();
    this.#slots[taskName].slots[0].forEach((value, index) => {
      if (value) {
        contexts.set(index, value);
      }
    });

    return contexts;
  }

  public onRowFill(handler: Function) {
    this.#rowFillHandler = handler;
  }
}

export class FillerKV {}

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
