/**
 * Example 8: Custom Context Injection (Spicy)
 *
 * Demonstrates:
 * - Injecting custom data into task handlers
 * - Using spicy parameter in core config
 * - Accessing custom data in do() handlers
 * - Type-safe custom context
 */

import shibuiCore, { InternalPot, type TriggerRule } from "$shibui";

/**
 * Create core with custom "spicy" context
 * This makes custom data available in all task handlers
 */
const core = shibuiCore<{ x: number }>({
  spicy: {
    x: 100, // This value will be accessible in all task handlers
  },
});

// Define a pot for data passing
class SimplePot extends InternalPot<{ value: number }> {
  override ttl = 1;
  override data = {
    value: 0,
  };
}

// Task 3: Final task
const task3 = core.task(SimplePot)
  .name("Task 3")
  .onRule("TriggerRule.ForThisTask", SimplePot)
  .do(async ({ log, finish, pots }) => {
    log.dbg(`Task 3 - Final value: ${pots[0].data.value}`);
    return finish();
  });

// Task 2: Middle task
const task2 = core.task(SimplePot)
  .name("Task 2")
  .onRule("TriggerRule.ForThisTask", SimplePot)
  .do(async ({ pots, log, next }) => {
    const value = pots[0].data.value;
    log.dbg(`Task 2 - Received value: ${value}`);

    return next(task3, {
      value: value + 1,
    });
  });

// Task 1: First task with custom context access
const task1 = core.task(SimplePot)
  .onRule("TriggerRule.ForThisTask", SimplePot)
  .name("Task 1")
  .do(async ({ log, next, x }) => {
    // Access custom spicy data
    log.dbg(`Task 1 - Spicy value: ${x}`);

    // Can use spicy value in logic
    return next(task2, {
      value: x + 1, // Use custom context value
    });
  });

// Register all tasks
core.register(task1);
core.register(task2);
core.register(task3);

// Start and execute
await core.start();
core.send(new SimplePot(), task1);

/**
 * Flow:
 * 1. Task 1: Gets x=100 from spicy, increments to 101, passes to Task 2
 * 2. Task 2: Receives 101, increments to 102, passes to Task 3
 * 3. Task 3: Receives 102, finishes
 *
 * This demonstrates how to inject configuration, constants, or
 * shared utilities into all task handlers without global variables
 */
