/*
 * Copyright 2023 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { IPot } from "../entities/Pot.ts";
import { EventDrivenLogger } from "../components/EventDrivenLogger.ts";
import { SourceType } from "../../events/LogEvents.ts";

export default class PotQueue<T extends IPot> {
  #logger = new EventDrivenLogger({
    sourceType: SourceType.CORE,
    sourceName: "PotQueue",
  });

  #queue: Array<T> = [];
  #db: Deno.Kv = undefined as unknown as Deno.Kv;

  constructor() {
    // this.#db.listenQueue(async (pot) => {
      
    // });
  }

  get() {
    return this.#queue;
  }

  pushLast(pot: T) {
    this.#logger.trc(
      `push last pot ${pot.name} to queue'`,
    );

    this.#queue.push(pot);
  }

  popFirst(): T | undefined {
    const pot = this.#queue.shift();
    if (pot) {
      this.#logger.trc(
        `pop first pot ${pot.name} from queue'`,
      );
    }
    return pot;
  }

  async init(path?: string) {
    this.#db = await Deno.openKv(path);
  }
}
