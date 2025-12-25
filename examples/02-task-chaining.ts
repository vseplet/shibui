/**
 * Example 2: Task Chaining
 *
 * Demonstrates:
 * - Creating pot using pot() factory (v1.0 API)
 * - Using next() to chain tasks
 * - Using TriggerRule.ForThisTask for routing
 * - Passing data between tasks
 */

import core, { pot, TriggerRule } from "$shibui";

const c = core();

// v1.0 API: Define pot using pot() factory
const SimplePot = pot("SimplePot", { value: 0 }, { ttl: 1 });

// Task 3: Final task in chain
const task3 = c.task(SimplePot)
  .name("Task 3")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, finish }) => {
    log.dbg(`Task 3 received value: ${pots[0].data.value}`);
    return finish();
  });

// Task 2: Middle task in chain
const task2 = c.task(SimplePot)
  .name("Task 2")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, next }) => {
    const value = pots[0].data.value;
    log.dbg(`Task 2 received value: ${value}`);
    return next(task3, { value: value + 1 });
  });

// Task 1: First task in chain
const task1 = c.task(SimplePot)
  .name("Task 1")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, next }) => {
    const value = pots[0].data.value;
    log.dbg(`Task 1 received value: ${value}`);
    return next(task2, { value: value + 1 });
  });

// Register all tasks
c.register(task1);
c.register(task2);
c.register(task3);

// Start core and send initial pot to task1
await c.start();
c.send(SimplePot, task1);  // Auto-creates!

// Result: value goes 0 -> 1 -> 2 -> 3 through the chain
