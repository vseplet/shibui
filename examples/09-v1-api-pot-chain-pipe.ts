/**
 * Example 9: v1.0 API - pot(), chain(), and pipe()
 *
 * Demonstrates all new v1.0 API features:
 * - pot() factory for creating data containers
 * - context() factory for workflow contexts
 * - pipe() for functional composition
 * - chain() for task chains
 * - .when() for simple triggers
 * - .retry() and .catch()
 */

import { chain, context, execute, pipe, pot, task } from "$shibui";

// ============================================================================
// pot() factory - simplified way to create data containers
// ============================================================================

// Create pots using pot() factory
const Counter = pot("Counter", { value: 0 });
const Message = pot("Message", { text: "", from: "" }, { ttl: 100 });

// Create workflow context
const WorkflowCtx = context("MyWorkflow", { count: 0, status: "pending" });

// Create instances using factory methods
console.log("Counter instance:", Counter.create({ value: 42 }));
console.log("Message instance:", Message.create({ text: "Hello" }));
console.log("Context instance:", WorkflowCtx.create({ count: 5 }));

// ============================================================================
// pipe() - functional composition for data transformations
// ============================================================================

const transform = pipe(
  (d: { value: number }) => ({ value: d.value + 1 }),
  (d) => ({ value: d.value * 2 }),
  (d) => ({ value: Math.min(d.value, 100) }),
);

console.log("\npipe() examples:");
console.log("Transform 10:", transform({ value: 10 })); // (10+1)*2 = 22
console.log("Transform 50:", transform({ value: 50 })); // (50+1)*2 = 102 -> 100

// ============================================================================
// Task with pot(), .when(), .retry(), .catch()
// ============================================================================

const NumberPot = pot("NumberPot", { value: 0 });

const processTask = task(NumberPot)
  .name("Process Number")
  // v1.0: Simple predicate trigger
  .when((data) => data.value > 0)
  // v1.0: Retry configuration in one call
  .retry({ attempts: 3, interval: 100, timeout: 5000 })
  .do(async ({ pots, finish, log }) => {
    const value = pots[0].data.value;
    log.inf(`Processing value: ${value}`);

    // Use pipe() for transformation
    const result = transform({ value });
    log.inf(`Transformed to: ${result.value}`);

    return finish();
  })
  // v1.0: .catch() alias for .fail()
  .catch(async (error) => {
    console.error(`Task failed: ${error.message}`);
  });

// ============================================================================
// chain() - declarative task chains
// ============================================================================

const ChainPot = pot("ChainPot", { value: 0 });

const task1 = task(ChainPot)
  .name("Start")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`Start: ${chainPot.data.value}`);
    return finish();
  });

const task2 = task(ChainPot)
  .name("Process")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`Process: ${chainPot.data.value}`);
    return finish();
  });

const task3 = task(ChainPot)
  .name("End")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`End: ${chainPot.data.value}`);
    return finish();
  });

const pipeline = chain(task1, task2, task3);
console.log("\nChain:", pipeline.name);

// ============================================================================
// Execute example
// ============================================================================

console.log("\n--- Executing processTask ---");
const result = await execute(
  processTask,
  [NumberPot.create({ value: 10 })],
  { kv: { inMemory: true }, logger: { enable: false } },
);
console.log(`Execution ${result ? "succeeded" : "failed"}`);

/**
 * v1.0 API Summary:
 *
 * 1. pot("Name", defaults, options) - Create pot factory
 *    const Counter = pot("Counter", { value: 0 });
 *
 * 2. task(PotFactory) - Direct usage (no ._class needed!)
 *    task(Counter).name("Task").do(...)
 *
 * 3. Create instances
 *    Counter.create({ value: 42 })
 *
 * 4. .when(predicate) - Simple trigger
 *    .when(data => data.value > 0)
 *
 * 5. .retry({ attempts, interval, timeout })
 *    .retry({ attempts: 3, interval: 1000 })
 *
 * 6. .catch(handler) - Error handling
 *    .catch(async (err) => console.error(err))
 *
 * 7. pipe(fn1, fn2, ...) - Compose transformations
 *    const transform = pipe(inc, double, clamp)
 *
 * 8. chain(task1, task2, ...) - Create task chains
 *    const pipeline = chain(start, process, end)
 */
