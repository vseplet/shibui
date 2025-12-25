/**
 * Example 1: Simple Task with Conditional Trigger
 *
 * Demonstrates:
 * - Creating a pot using pot() factory (v1.0 API)
 * - Using .when() predicate for conditional execution
 * - Logging inside handlers
 */

import { execute, pot, task } from "$shibui";

// v1.0 API: Define pot using pot() factory
const SimplePot = pot("SimplePot", {
  value: Math.random(),
}, { ttl: 100 });

// Create a task using pot (v1.0 API - no ._class needed!)
const mySimpleTask = task(SimplePot)
  .name("Simple Task")
  // v1.0 API: Use .when() for simple predicate triggers
  .when((data) => data.value > 0.5)
  .do(async ({ finish, pots, log }) => {
    // This only executes if .when() predicate returned true
    log.dbg(`Task executing...`);
    log.dbg(`Processing value: ${pots[0].data.value}`);
    return finish();
  });

// Execute the task - just pass the pot factory, it auto-creates!
const res = await execute(mySimpleTask, [SimplePot]);

// Exit with appropriate code
Deno.exit(res ? 0 : 1);
