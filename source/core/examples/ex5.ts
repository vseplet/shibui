// deno-lint-ignore-file require-await
import { ContextPot } from "../pots/ContextPot.ts";
import { CoreStartPot } from "../pots/CoreStartPot.ts";
import core from "../mod.ts";
import { sh } from "https://deno.land/x/shelly@v0.1.1/mod.ts";
import type { TaskBuilder } from "../entities/TaskBuilder.ts";
import type { IPot } from "../types.ts";

export const checkUpdateTypeByCommitMessage = <
  CTX extends ContextPot<{
    updateType: string;
  }>,
>(
  contextPot: new () => CTX,
  nextTask?: TaskBuilder<CTX>,
) =>
  core.task(contextPot)
    .name("checkUpdateTypeByCommitMessage")
    .do(async ({ pots, log, next, finish }) => {
      const ctx = pots[0].data;

      const lastCommitText = (await sh("git log -1 --pretty=%B")).stdout;
      if (lastCommitText.indexOf("[major]") != -1) {
        ctx.updateType = "major";
      } else if (lastCommitText.indexOf("[minor]") != -1) {
        ctx.updateType = "minor";
      } else if (lastCommitText.indexOf("[patch]") != -1) {
        ctx.updateType = "patch";
      }

      log.inf(ctx.updateType);
      if (nextTask) {
        return next(nextTask, {
          updateType: ctx.updateType,
        });
      } else {
        return finish();
      }
    });

class CTX extends ContextPot<{
  updateType: string;
}> {
  data = { updateType: "" };
}

const w1 = core.workflow(CTX)
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task1, shared1 }) => {
    const t2 = task1()
      .name("task 2")
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${ctx.data} 2`);
        return finish();
      });

    const t1 = task1()
      .name("task 1")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${ctx.data} 1`);
        return next(t2);
      });

    const t0 = shared1(checkUpdateTypeByCommitMessage(CTX, t1));

    return t0;
  });

core.api.register(w1);
await core.api.start();
