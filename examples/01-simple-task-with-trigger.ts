/**
 * Example 1: Simple Task with Conditional Trigger
 *
 * Demonstrates:
 * - Creating a simple task
 * - Using custom trigger handler with allow()/deny()
 * - Conditional execution based on data
 * - Logging inside triggers and handlers
 */

import { InternalPot } from "$shibui/pots";
import { execute, task } from "$shibui";

// Define a pot with random value
class SimplePot extends InternalPot<{ value: number }> {
  override ttl = 100;
  override data = {
    value: Math.random(),
  };
}

// Create a task that only executes if trigger condition is met
const mySimpleTask = task(SimplePot)
  .name("Simple Task")
  .on(SimplePot, ({ allow, deny, log, pot }) => {
    // Trigger: Check if pot value is greater than random threshold
    log.dbg(`Testing trigger: pot.value = ${pot.data.value}`);

    // Allow execution if value > random threshold
    return pot.data.value > Math.random() ? allow() : deny();
  })
  .do(async ({ finish, pots, log }) => {
    // This only executes if trigger allowed
    log.dbg(`Task executing...`);
    log.dbg(`Processing value: ${pots[0].data.value}`);
    return finish();
  });

// Execute the task with a new pot
const res = await execute(mySimpleTask, [new SimplePot()]);

// Exit with appropriate code
Deno.exit(res ? 0 : 1);
