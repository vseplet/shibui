import type { StorageEntry, StorageProvider, TPot } from "$shibui/types";

/**
 * In-memory storage provider for testing and development.
 * Data is not persisted between restarts.
 *
 * @example
 * ```typescript
 * shibui({ storage: new MemoryStorageProvider() })
 * ```
 */
export class MemoryStorageProvider implements StorageProvider {
  #storage = new Map<string, TPot>();

  async open(): Promise<void> {
    // No-op for memory provider
  }

  close(): void {
    this.#storage.clear();
  }

  store(key: string[], pot: TPot): Promise<void> {
    this.#storage.set(this.#keyToString(key), pot);
    return Promise.resolve();
  }

  retrieve(key: string[]): Promise<TPot | null> {
    return Promise.resolve(this.#storage.get(this.#keyToString(key)) ?? null);
  }

  remove(key: string[]): Promise<void> {
    this.#storage.delete(this.#keyToString(key));
    return Promise.resolve();
  }

  async *scan(prefix: string[]): AsyncIterableIterator<StorageEntry> {
    const prefixStr = this.#keyToString(prefix);
    for (const [keyStr, pot] of this.#storage) {
      if (keyStr.startsWith(prefixStr)) {
        yield {
          key: this.#stringToKey(keyStr),
          pot,
        };
      }
    }
  }

  removeMany(keys: string[][]): Promise<void> {
    for (const key of keys) {
      this.#storage.delete(this.#keyToString(key));
    }
    return Promise.resolve();
  }

  #keyToString(key: string[]): string {
    return key.join("\x00");
  }

  #stringToKey(str: string): string[] {
    return str.split("\x00");
  }
}
