/**
 * Provider Configuration Example
 *
 * Demonstrates different ways to configure shibui:
 * - Default (Memory providers + ConsoleLogger)
 * - DenoKV for persistence
 * - Custom logger configuration
 * - Disabling logging
 *
 * Run: deno task example:providers
 */

import {
  ConsoleLogger,
  DenoKvQueueProvider,
  DenoKvStorageProvider,
  execute,
  pot,
  shibui,
  task,
} from "$shibui";

const Counter = pot("Counter", { value: 0 });

const incrementTask = task(Counter)
  .name("Increment")
  .do(async ({ pots, log, finish }) => {
    const current = pots[0].data.value;
    log.inf(`Value: ${current} -> ${current + 1}`);
    return finish();
  });

// ============================================================================
// Example 1: Default configuration (Memory + ConsoleLogger)
// ============================================================================
console.log("=== Example 1: Default configuration ===\n");

const app1 = shibui();
app1.register(incrementTask);
await app1.start();
app1.send(Counter.create({ value: 1 }));
await new Promise((r) => setTimeout(r, 100));
app1.close();

// ============================================================================
// Example 2: Without logging
// ============================================================================
console.log("\n=== Example 2: No logging ===\n");

await execute(incrementTask, [Counter.create({ value: 10 })], {
  logger: false,
});
console.log("(no log output expected)");

// ============================================================================
// Example 3: Custom logger level
// ============================================================================
console.log("\n=== Example 3: Info level only ===\n");

await execute(incrementTask, [Counter.create({ value: 20 })], {
  logger: new ConsoleLogger({ level: "info" }),
});

// ============================================================================
// Example 4: DenoKV for persistence
// ============================================================================
console.log("\n=== Example 4: DenoKV persistence ===\n");

const kvPath = await Deno.makeTempFile({ suffix: ".db" });

const app4 = shibui({
  queue: new DenoKvQueueProvider(kvPath),
  storage: new DenoKvStorageProvider(kvPath),
  logger: new ConsoleLogger({ level: "info" }),
});

app4.register(incrementTask);
await app4.start();
app4.send(Counter.create({ value: 100 }));
await new Promise((r) => setTimeout(r, 100));
app4.close();

// Cleanup
try {
  await Deno.remove(kvPath);
} catch { /* ignore */ }

console.log("\n=== Done! ===");
