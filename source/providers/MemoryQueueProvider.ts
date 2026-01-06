import type { QueueProvider, TPot } from "$shibui/types";

/**
 * In-memory queue provider for testing and development.
 * Messages are not persisted between restarts.
 *
 * @example
 * ```typescript
 * shibui({ queue: new MemoryQueueProvider() })
 * ```
 */
export class MemoryQueueProvider implements QueueProvider {
  #queue: TPot[] = [];
  #handler: ((pot: TPot) => void) | null = null;
  #processing = false;

  async open(): Promise<void> {
    // No-op for memory provider
  }

  close(): void {
    this.#queue = [];
    this.#handler = null;
    this.#processing = false;
  }

  enqueue(pot: TPot): Promise<void> {
    this.#queue.push(pot);
    this.#processQueue();
    return Promise.resolve();
  }

  listen(handler: (pot: TPot) => void): void {
    this.#handler = handler;
    this.#processQueue();
  }

  #processQueue(): void {
    if (this.#processing || !this.#handler) return;
    this.#processing = true;

    queueMicrotask(() => {
      while (this.#queue.length > 0 && this.#handler) {
        const pot = this.#queue.shift()!;
        this.#handler(pot);
      }
      this.#processing = false;
    });
  }

  getQueueState() {
    return {
      length: this.#queue.length,
      pots: this.#queue.map((pot) => ({
        name: pot.name,
        uuid: pot.uuid,
        type: pot.type,
      })),
    };
  }
}
