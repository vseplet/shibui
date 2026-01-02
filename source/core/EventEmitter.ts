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

import type { Constructor } from "$helpers/types";
import type { SEvent } from "$shibui/core";

export class EventEmitter<
  T extends SEvent,
> {
  readonly name: string;
  #channelA: BroadcastChannel;
  #channelB: BroadcastChannel;

  constructor(name: string = "default") {
    this.name = name;
    this.#channelA = new BroadcastChannel(this.name);
    this.#channelB = new BroadcastChannel(this.name);
  }

  addListener(callback: (event: T) => void) {
    this.#channelA.addEventListener("message", (event) => {
      callback(event.data);
    });
  }

  addListenerByType(
    EventConstructor: Constructor<T>,
    callback: (event: T) => void,
  ) {
    const targetEventType = (new EventConstructor()).type;
    this.#channelA.addEventListener(
      "message",
      (event: MessageEvent<T>) => {
        if (event.data.type == targetEventType) {
          callback(
            event.data,
          );
        }
      },
    );
  }

  addListenerByName<D extends T>(
    EventConstructor: new (args: any) => D,
    callback: (event: D) => void,
  ) {
    const targetEventName = EventConstructor.name;
    this.#channelA.addEventListener("message", (event) => {
      if (event.data.name == targetEventName) {
        callback(event.data);
      }
    });
  }

  onError(callback: (event: MessageEvent) => void) {
    this.#channelA.onmessageerror = callback;
  }

  emit(event: SEvent) {
    this.#channelB.postMessage(event);
  }
}
