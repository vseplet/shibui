import { ContextPot, CoreStartPot, execute, task, workflow } from "$shibui";
import { sh } from "https://deno.land/x/shelly@v0.1.1/mod.ts";
import type { TaskBuilder } from "$shibui";

export const checkUpdateTypeByCommitMessage = <
  CTX extends ContextPot<{ updateType: string }>,
>(
  contextPot: new () => CTX,
  nextTask?: TaskBuilder<{}, [CTX], CTX>,
): TaskBuilder<{}, [CTX], CTX> => {
  // deno-lint-ignore no-explicit-any
  const builder = (task as any)(contextPot) as TaskBuilder<{}, [CTX], CTX>;
  return builder
    .name("checkUpdateTypeByCommitMessage")
    .retry({ attempts: 2, timeout: 30000 })
    .do(async ({ ctx, log, next, finish }) => {
      const lastCommitText = (await sh("git log -1 --pretty=%B")).stdout;

      if (lastCommitText.indexOf("[major]") != -1) {
        ctx.data.updateType = "major";
      } else if (lastCommitText.indexOf("[minor]") != -1) {
        ctx.data.updateType = "minor";
      } else if (lastCommitText.indexOf("[patch]") != -1) {
        ctx.data.updateType = "patch";
      }

      log.inf(`Detected update type: ${ctx.data.updateType}`);

      if (nextTask) {
        return next(nextTask, { updateType: ctx.data.updateType });
      }
      return finish();
    })
    .catch(async (error) => {
      console.error(`Failed to check commit message: ${error.message}`);
    });
};

class CTX extends ContextPot<{ updateType: string }> {
  override data = { updateType: "" };
}

const simpleWorkflow = workflow(CTX)
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task, shared }) => {
    const t2 = task()
      .name("task 2")
      .do(async ({ ctx, log, finish }) => {
        log.dbg(`Processing update type: ${ctx.data.updateType}`);
        return finish();
      });

    const t1 = task()
      .name("task 1")
      .do(async ({ log, next }) => {
        log.dbg(`Context data in task 1`);
        return next(t2);
      });

    const t0 = shared(checkUpdateTypeByCommitMessage(CTX, t1));
    return t0;
  });

const res = await execute(simpleWorkflow);
Deno.exit(res ? 0 : 1);
