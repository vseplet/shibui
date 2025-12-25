/**
 * Example 4: Workflow with Task Sequence
 *
 * Demonstrates:
 * - Creating a workflow with multiple tasks
 * - Sequential task execution using next()
 * - Shared context across workflow tasks
 * - Task ordering in workflows
 */

import { execute, workflow } from "$shibui";

// Create a workflow with two sequential tasks
const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) => {
    // Define task 2 first (can reference later)
    const t2 = task()
      .name("task 2")
      .do(async ({ ctx, log, finish }) => {
        // Access shared context from previous task
        log.dbg(`Task 2 - Context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      });

    // Define task 1 (executes first)
    const t1 = task()
      .name("task 1")
      // v1.0 API: Use .retry() for configuration
      .retry({ attempts: 2, timeout: 10000 })
      .do(async ({ ctx, log, next }) => {
        // Modify shared context
        log.dbg(`Task 1 - Context data: ${JSON.stringify(ctx.data)}`);

        // Pass control to task 2
        return next(t2);
      });

    // Return first task to execute
    return t1;
  });

// Execute workflow
const res = await execute(simpleWorkflow);

// Exit with status
Deno.exit(res ? 0 : 1);
