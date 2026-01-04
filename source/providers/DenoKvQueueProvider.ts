import type { QueueProvider, TPot } from "$shibui/types";

/**
 * Queue provider implementation using Deno KV.
 *
 * @example
 * ```typescript
 * // In-memory (for tests)
 * shibui({ queue: new DenoKvQueueProvider() })
 *
 * // Persistent storage
 * shibui({ queue: new DenoKvQueueProvider("./data.db") })
 * ```
 */
export class DenoKvQueueProvider implements QueueProvider {
  #kv: Deno.Kv | null = null;
  #path: string | undefined;

  constructor(path?: string) {
    this.#path = path;
  }

  async open(): Promise<void> {
    this.#kv = await Deno.openKv(this.#path);
  }

  close(): void {
    this.#kv?.close();
    this.#kv = null;
  }

  async enqueue(pot: TPot): Promise<void> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    await this.#kv.enqueue(pot);
  }

  listen(handler: (pot: TPot) => void): void {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    this.#kv.listenQueue((message: unknown) => {
      handler(message as TPot);
    });
  }
}
