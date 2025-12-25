/**
 * Example 3: Simple Workflow with One Task
 *
 * Demonstrates:
 * - Creating a workflow with auto-generated context
 * - Single task workflow
 * - Using fail() for error handling
 * - Random failure simulation
 */

import { execute, workflow } from "$shibui";

// Create a workflow with single task
const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) =>
    task()
      .name("single workflow task")
      .do(async ({ ctx, log, finish, fail }) => {
        // Randomly fail to demonstrate error handling
        if (Math.random() > 0.5) {
          return fail("Random failure occurred!");
        }

        // On success, log context and finish
        log.dbg(`Context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      })
      // v1.0 API: Use .catch() for error handling
      .catch(async (error) => {
        console.error(`Workflow task failed: ${error.message}`);
      })
  );

// Execute workflow
const res = await execute(simpleWorkflow);

// Exit code indicates success/failure
Deno.exit(res ? 0 : 1);
