/**
 * Example 2: Task Chaining
 *
 * Demonstrates:
 * - Creating multiple tasks
 * - Using next() to chain tasks
 * - Using onRule(TriggerRule.TriggerRule.ForThisTask) to target specific tasks
 * - Passing data between tasks
 * - Manual task registration
 */

import core from "$core";
import { InternalPot } from "$core/pots";
import { TriggerRule } from "$core/constants";

const c = core();

// Define a pot for data passing
class SimplePot extends InternalPot<{ value: number }> {
  override ttl = 1;
  override data = {
    value: 0,
  };
}

// Task 3: Final task in chain
const task3 = c.task(SimplePot)
  .name("Task 3")
  .onRule("TriggerRule.ForThisTask", SimplePot)  // Only accept pots sent to this task
  .do(async ({ log, pots, finish }) => {
    log.dbg(`Task 3 received value: ${pots[0].data.value}`);
    return finish();  // End of chain
  });

// Task 2: Middle task in chain
const task2 = c.task(SimplePot)
  .name("Task 2")
  .onRule("TriggerRule.ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    const value = pots[0].data.value;
    log.dbg(`Task 2 received value: ${value}`);

    // Increment and pass to task 3
    return next(task3, {
      value: value + 1,
    });
  });

// Task 1: First task in chain
const task1 = c.task(SimplePot)
  .name("Task 1")
  .onRule("TriggerRule.ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    const value = pots[0].data.value;
    log.dbg(`Task 1 received value: ${value}`);

    // Increment and pass to task 2
    return next(task2, {
      value: value + 1,
    });
  });

// Register all tasks
c.register(task1);
c.register(task2);
c.register(task3);

// Start core and send initial pot to task1
await c.start();
c.send(new SimplePot(), task1);

// Result: value goes 0 -> 1 -> 2 -> 3 through the chain
