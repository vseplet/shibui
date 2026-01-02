import type { StorageEntry, StorageProvider, TPot } from "$shibui/types";

/**
 * In-memory storage provider for testing and development.
 * Data is not persisted between restarts.
 *
 * @example
 * ```typescript
 * const provider = new MemoryProvider();
 * core({ provider })
 * ```
 */
export class MemoryProvider implements StorageProvider {
  #storage = new Map<string, TPot>();
  #queue: TPot[] = [];
  #handler: ((pot: TPot) => void) | null = null;
  #processing = false;

  async open(): Promise<void> {
    // No-op for memory provider
  }

  close(): void {
    this.#storage.clear();
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
