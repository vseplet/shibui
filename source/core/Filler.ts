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

import { Pot } from "$shibui/core";
import {
  SourceType,
  type StorageProvider,
  type TAnyCore,
  type TEventDrivenLogger,
  type TPot,
  type TTask,
} from "$shibui/types";

const STORAGE_PREFIX = ["shibui", "filler", "slots"] as const;

export class Filler {
  #core: TAnyCore;
  #provider: StorageProvider | null = null;
  #log: TEventDrivenLogger;

  #slots: {
    [taskName: string]: {
      slots: Array<Array<TPot | undefined>>;
      slotsCount: number;
    };
  } = {};

  constructor(core: TAnyCore) {
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.Core,
      sourceName: "Filler",
    });
  }

  async init(provider: StorageProvider): Promise<void> {
    this.#provider = provider;
    await this.#restoreSlots();
  }

  async #restoreSlots(): Promise<void> {
    if (!this.#provider) return;

    const entries = this.#provider.scan([...STORAGE_PREFIX]);

    for await (const entry of entries) {
      // Key format: ["shibui", "filler", "slots", taskName, slot, row]
      const key = entry.key;
      const taskName = key[3] as string;
      const slot = Number(key[4]);
      const row = Number(key[5]);

      if (!this.#slots[taskName]) {
        this.#log.wrn(
          `Found orphaned slot data for unregistered task '${taskName}', skipping`,
        );
        continue;
      }

      const pot = new Pot().deserialize(entry.pot);
      if (pot) {
        // Ensure array is large enough
        while (this.#slots[taskName].slots[slot].length <= row) {
          this.#slots[taskName].slots[slot].push(undefined);
        }
        this.#slots[taskName].slots[slot][row] = pot;
        this.#log.vrb(
          `Restored pot '${pot.name}' for task '${taskName}' slot ${slot} row ${row}`,
        );
      }
    }
  }

  async #persistSlot(
    taskName: string,
    slot: number,
    row: number,
    pot: TPot,
  ): Promise<void> {
    if (!this.#provider) return;
    const key = [...STORAGE_PREFIX, taskName, String(slot), String(row)];
    await this.#provider.store(key, pot);
  }

  async #removeSlotRow(taskName: string, row: number): Promise<void> {
    if (!this.#provider) return;
    const slotsCount = this.#slots[taskName]?.slotsCount || 0;
    const keys: string[][] = [];
    for (let slot = 0; slot < slotsCount; slot++) {
      keys.push([...STORAGE_PREFIX, taskName, String(slot), String(row)]);
    }
    await this.#provider.removeMany(keys);
  }

  private allocateSlots(task: TTask) {
    this.#slots[task.name] = {
      slots: Array.from({ length: task.slotsCount }, () => []),
      slotsCount: task.slotsCount,
    };
  }

  registerTask(task: TTask) {
    this.allocateSlots(task);
  }

  async fill(taskName: string, pot: Pot, slot: number, row?: number): Promise<
    {
      taskName: string;
      pots: Array<Pot>;
    } | null
  > {
    try {
      const actualRow = row !== undefined
        ? row
        : this.#slots[taskName].slots[slot].length;

      if (row !== undefined) {
        this.#slots[taskName].slots[slot][row] = pot;
      } else {
        this.#slots[taskName].slots[slot].push(pot);
      }

      // Persist to KV
      await this.#persistSlot(taskName, slot, actualRow, pot);

      const rowIsFilled = this.#slots[taskName].slots.every((arr) =>
        arr[actualRow]
      );

      if (rowIsFilled) {
        const filledRow = this.#slots[taskName].slots.map((arr) =>
          arr[actualRow]
        );
        // Remove row from memory
        this.#slots[taskName].slots.forEach((arr) => arr.splice(actualRow, 1));
        // Remove row from KV
        await this.#removeSlotRow(taskName, actualRow);

        return {
          taskName,
          pots: filledRow.filter((pot) => pot !== undefined) as Array<Pot>,
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
