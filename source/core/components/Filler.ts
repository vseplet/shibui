/*
 * Copyright 2024 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

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
  //   sourceType: SourceType.Core,
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

  #slots: {
    [taskName: string]: {
      slots: Array<Array<TPot | undefined>>;
    };
  } = {};

  constructor(core: TAnyCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.Core,
      sourceName: "Filler",
    });
  }

  private allocateSlots(task: TTask) {
    this.#slots[task.name] = {
      slots: Array.from({ length: task.slotsCount }, () => []),
    };
  }

  registerTask(task: TTask) {
    this.allocateSlots(task);
  }

  fill(taskName: string, pot: Pot, slot: number, row?: number): {
    taskName: string;
    pots: Array<Pot>;
  } | null {
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
        // this.#rowFillHandler(taskName, row);
        return {
          taskName,
          pots: row.filter((pot) => pot !== undefined) as Array<Pot>,
        };
      }

      return null;
    } catch (err) {
      if (err instanceof Error) {
        // this.#log.err(
        //   `trying to fill slots for '${taskName}' by pot '${pot.name}' to slot ${slot} failed with error: '${err.message}'`,
        // );
      }
      return null;
    }
  }
}
