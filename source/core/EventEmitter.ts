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
