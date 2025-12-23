/**
 * Example 6: Dependent Task with Multiple Pots
 *
 * Demonstrates:
 * - Creating a task that waits for multiple inputs (5 pots)
 * - Slot system for collecting data from different sources
 * - Processing all pots when collection is complete
 * - Manual core management
 */

import core from "$shibui";
import { InternalPot } from "$shibui/pots";

const c = core();

// Define 5 different pot types
class PotA extends InternalPot<{ value: number }> {
  override data = { value: 1 };
}

class PotB extends InternalPot<{ value: number }> {
  override data = { value: 2 };
}

class PotC extends InternalPot<{ value: number }> {
  override data = { value: 3 };
}

class PotD extends InternalPot<{ value: number }> {
  override data = { value: 4 };
}

class PotE extends InternalPot<{ value: number }> {
  override data = { value: 5 };
}

// Create array of pot instances
const pots = [new PotA(), new PotB(), new PotC(), new PotD(), new PotE()];

/**
 * This task waits for ALL 5 pots before executing
 * The order of pots in do() matches the order in task() declaration
 */
const mySimpleTask = core()
  .task(PotA, PotB, PotC, PotD, PotE)
  .name("Simple Task")
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
    log.dbg(`Total sum: ${sum}`);  // Should be 15

    return finish();
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
