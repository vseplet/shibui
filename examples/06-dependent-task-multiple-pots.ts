/**
 * Example 6: Dependent Task with Multiple Pots
 *
 * Demonstrates:
 * - Creating pots using pot() factory (v1.0 API)
 * - Creating a task that waits for multiple inputs (5 pots)
 * - Slot system for collecting data from different sources
 * - Using pipe() for data aggregation
 */

import core, { pipe, pot } from "$shibui";

const c = core();

// v1.0 API: Define 5 different pot types using pot() factory
const PotA = pot("PotA", { value: 1 });
const PotB = pot("PotB", { value: 2 });
const PotC = pot("PotC", { value: 3 });
const PotD = pot("PotD", { value: 4 });
const PotE = pot("PotE", { value: 5 });

// Just pass the factories - they auto-create!
const pots = [PotA, PotB, PotC, PotD, PotE];

// v1.0 API: Use pipe() for data transformation
const doubleAndSum = pipe(
  (values: number[]) => values.map((v) => v * 2),
  (values) => values.reduce((a, b) => a + b, 0),
);

/**
 * This task waits for ALL 5 pots before executing
 * The order of pots in do() matches the order in task() declaration
 */
const mySimpleTask = core()
  .task(PotA, PotB, PotC, PotD, PotE)
  .name("Simple Task")
  // v1.0 API: Use .retry() for configuration
  .retry({ attempts: 2, timeout: 60000 })
  .do(async ({ finish, pots, log }) => {
    log.dbg(`Received all 5 pots!`);

    // Process each pot in order
    log.dbg(`PotA value: ${pots[0].data.value}`);
    log.dbg(`PotB value: ${pots[1].data.value}`);
    log.dbg(`PotC value: ${pots[2].data.value}`);
    log.dbg(`PotD value: ${pots[3].data.value}`);
    log.dbg(`PotE value: ${pots[4].data.value}`);

    // Calculate sum
    const sum = pots.reduce((acc, pot) => acc + pot.data.value, 0);
    log.dbg(`Total sum: ${sum}`); // Should be 15

    // v1.0 API: Use pipe() for transformation
    const values = pots.map((p) => p.data.value);
    const doubledSum = doubleAndSum(values);
    log.dbg(`Doubled sum: ${doubledSum}`); // Should be 30

    return finish();
  })
  // v1.0 API: Use .catch() for error handling
  .catch(async (error) => {
    console.error(`Task failed: ${error.message}`);
  });

// Configure logging
c.settings.DEFAULT_LOGGING_LEVEL = 2;

// Register task
c.register(mySimpleTask);

// Start core
await c.start();

// Send pots with delay (simulating async arrival)
for (const pot of pots) {
  c.send(pot);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

// Task will only execute after ALL 5 pots are received
