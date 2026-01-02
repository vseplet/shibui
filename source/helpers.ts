// deno-lint-ignore-file no-explicit-any

import type { Runtime } from "$shibui/types";

// ============================================================================
// Runtime Detection
// ============================================================================

export function detectRuntime(): Runtime {
  // @ts-ignore: Deno global
  if (typeof Deno !== "undefined" && Deno.version?.deno) {
    return "deno";
  }
  // @ts-ignore: Bun global
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  // deno-lint-ignore no-process-global
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  return "unknown";
}

export const runtime: Runtime = detectRuntime();
export const isDeno = runtime === "deno";
export const isBun = runtime === "bun";
export const isNode = runtime === "node";

export function getRuntimeVersion(): string {
  switch (runtime) {
    case "deno":
      // @ts-ignore: Deno global
      return Deno.version.deno;
    case "bun":
      // @ts-ignore: Bun global
      return Bun.version;
    case "node":
      // deno-lint-ignore no-process-global
      return process.versions.node;
    default:
      return "unknown";
  }
}

export function exit(code: number = 0): void {
  switch (runtime) {
    case "deno":
      // @ts-ignore: Deno global
      Deno.exit(code);
      break;
    case "bun":
    case "node":
      // deno-lint-ignore no-process-global
      process.exit(code);
      break;
    default:
      throw new Error(`exit() not supported in runtime: ${runtime}`);
  }
}

export function getRuntimeInfo() {
  return {
    runtime,
    version: getRuntimeVersion(),
    isDeno,
    isBun,
    isNode,
  };
}

// ============================================================================
// Promise Utilities
// ============================================================================

export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T | null> {
  let timeoutId: number | undefined = undefined;

  try {
    const timeoutPromise = new Promise<T | null>(
      (resolve) => {
        timeoutId = setTimeout(() => {
          resolve(null);
        }, timeout);
      },
    );

    const result = await Promise.race([
      promise,
      timeoutPromise,
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function syncPromiseWithTimeout<T>(
  asyncFunc: () => Promise<T>,
  timeoutMs = 10000,
): T {
  let result: T | undefined;
  let error: Error | undefined;
  let finished = false;

  (async () => {
    try {
      result = await asyncFunc();
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      finished = true;
    }
  })();

  const startTime = Date.now();
  while (!finished && Date.now() - startTime < timeoutMs) {
    // Busy-wait loop
  }

  if (!finished) {
    throw new Error("Timeout!");
  }

  if (error !== undefined) {
    throw error;
  }

  return result!;
}

// ============================================================================
// Context Utilities
// ============================================================================

export function createRandomContext(BaseClass: any) {
  const className = "CTX_" + Math.random().toString(36).substring(2, 15);
  return new Function(
    "BaseClass",
    `
    return class ${className} extends BaseClass {
      constructor(...args) {
        super(...args);
        this.name = "${className}";
      }
    }
  `,
  )(BaseClass);
}
