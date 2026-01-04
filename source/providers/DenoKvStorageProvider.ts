import type { StorageEntry, StorageProvider, TPot } from "$shibui/types";

/**
 * Storage provider implementation using Deno KV.
 *
 * @example
 * ```typescript
 * // In-memory (for tests)
 * shibui({ storage: new DenoKvStorageProvider() })
 *
 * // Persistent storage
 * shibui({ storage: new DenoKvStorageProvider("./data.db") })
 * ```
 */
export class DenoKvStorageProvider implements StorageProvider {
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
