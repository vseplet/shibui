/**
 * Runtime environment detection utilities
 */

export type Runtime = "deno" | "bun" | "node" | "unknown";

/**
 * Detect current JavaScript runtime environment
 */
export function detectRuntime(): Runtime {
  // Deno
  // @ts-ignore: Deno global
  if (typeof Deno !== "undefined" && Deno.version?.deno) {
    return "deno";
  }

  // Bun
  // @ts-ignore: Bun global
  if (typeof Bun !== "undefined") {
    return "bun";
  }

  // Node.js
  // deno-lint-ignore no-process-global
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }

  return "unknown";
}

/**
 * Cached runtime value (detected once)
 */
export const runtime: Runtime = detectRuntime();

/**
 * Runtime check helpers
 */
export const isDeno = runtime === "deno";
export const isBun = runtime === "bun";
export const isNode = runtime === "node";

/**
 * Get runtime version
 */
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

/**
 * Exit process with code (works in deno/node/bun)
 */
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

/**
 * Runtime info object
 */
export function getRuntimeInfo() {
  return {
    runtime,
    version: getRuntimeVersion(),
    isDeno,
    isBun,
    isNode,
  };
}
