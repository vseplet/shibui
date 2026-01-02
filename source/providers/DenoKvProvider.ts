import type { StorageEntry, StorageProvider, TPot } from "$shibui/types";

/**
 * Storage provider implementation using Deno KV.
 * This is the default provider for Shibui.
 *
 * @example
 * ```typescript
 * // In-memory (for tests)
 * const provider = new DenoKvProvider(":memory:");
 *
 * // Persistent storage
 * const provider = new DenoKvProvider("./data/shibui.db");
 *
 * core({ provider })
 * ```
 */
export class DenoKvProvider implements StorageProvider {
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

  async store(key: string[], pot: TPot): Promise<void> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    await this.#kv.set(key, pot);
  }

  async retrieve(key: string[]): Promise<TPot | null> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    const result = await this.#kv.get<TPot>(key);
    return result.value;
  }

  async remove(key: string[]): Promise<void> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    await this.#kv.delete(key);
  }

  async *scan(prefix: string[]): AsyncIterableIterator<StorageEntry> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    const entries = this.#kv.list<TPot>({ prefix });
    for await (const entry of entries) {
      yield {
        key: entry.key as string[],
        pot: entry.value,
      };
    }
  }

  async removeMany(keys: string[][]): Promise<void> {
    if (!this.#kv) {
      throw new Error("Provider not initialized. Call open() first.");
    }
    const atomic = this.#kv.atomic();
    for (const key of keys) {
      atomic.delete(key);
    }
    await atomic.commit();
  }
}
