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

import type { Pot } from "$shibui/entities";
import {
  SourceType,
  type TAnyCore,
  type TEventDrivenLogger,
  type TPot,
  type TTask,
} from "$shibui/types";

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
      if (row !== undefined) {
        this.#slots[taskName].slots[slot][row] = pot;
      } else this.#slots[taskName].slots[slot].push(pot);

      const rowIndex = row || this.#slots[taskName].slots[slot].length - 1;
      const rowIsFilled = this.#slots[taskName].slots.every((arr) =>
        arr[rowIndex]
      );

      if (rowIsFilled) {
        const row = this.#slots[taskName].slots.map((arr) => arr[rowIndex]);
        // remove row before run do handler
        this.#slots[taskName].slots.forEach((arr) => arr.splice(rowIndex, 1));
        return {
          taskName,
          pots: row.filter((pot) => pot !== undefined) as Array<Pot>,
        };
      }

      return null;
    } catch (err) {
      if (err instanceof Error) {
        this.#log.err(
          `Filling slots for '${taskName}' by pot '${pot.name}' to slot ${slot} failed: ${err.message}`,
        );
      }
      return null;
    }
  }
}
