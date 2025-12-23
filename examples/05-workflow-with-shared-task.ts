/**
 * Example 5: Workflow with Shared Reusable Task
 *
 * Demonstrates:
 * - Creating reusable task factories
 * - Using shared() to include external tasks
 * - Custom context with typed data
 * - Integration with external commands (git)
 * - Parsing commit messages for versioning
 */

import { ContextPot, CoreStartPot, execute, task, workflow } from "$shibui";
import { sh } from "https://deno.land/x/shelly@v0.1.1/mod.ts";
import type { TaskBuilder } from "$shibui";

/**
 * Reusable task factory: Check update type from git commit message
 *
 * Looks for [major], [minor], or [patch] tags in last commit
 */
export const checkUpdateTypeByCommitMessage = <
  CTX extends ContextPot<{
    updateType: string;
  }>,
>(
  contextPot: new () => CTX,
  nextTask?: TaskBuilder<{}, [CTX], CTX>,
) =>
  task<[CTX], CTX>(contextPot)
    .name("checkUpdateTypeByCommitMessage")
    .do(async ({ ctx, log, next, finish }) => {
      // Get last commit message
      const lastCommitText = (await sh("git log -1 --pretty=%B")).stdout;

      // Parse version type from commit message
      if (lastCommitText.indexOf("[major]") != -1) {
        ctx.data.updateType = "major";
      } else if (lastCommitText.indexOf("[minor]") != -1) {
        ctx.data.updateType = "minor";
      } else if (lastCommitText.indexOf("[patch]") != -1) {
        ctx.data.updateType = "patch";
      }

      log.inf(`Detected update type: ${ctx.data.updateType}`);

      // Continue to next task or finish
      if (nextTask) {
        return next(nextTask, {
          updateType: ctx.data.updateType,
        });
      } else {
        return finish();
      }
    });

// Define custom context for workflow
class CTX extends ContextPot<{
  updateType: string;
}> {
  override data = { updateType: "" };
}

// Create workflow using shared task
const simpleWorkflow = workflow(CTX)
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task, shared }) => {
    // Task 2: Process the update type
    const t2 = task()
      .name("task 2")
      .do(async ({ ctx, log, finish }) => {
        log.dbg(`Processing update type: ${ctx.data.updateType}`);
        return finish();
      });

    // Task 1: Another step
    const t1 = task()
      .name("task 1")
      .do(async ({ ctx, log, next }) => {
        log.dbg(`Context data in task 1`);
        return next(t2);
      });

    // Task 0: Use shared reusable task
    const t0 = shared(checkUpdateTypeByCommitMessage(CTX, t1));

    return t0;
  });

// Execute workflow
const res = await execute(simpleWorkflow);
Deno.exit(res ? 0 : 1);
