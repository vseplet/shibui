// deno-lint-ignore-file require-await
import { execute, workflow } from "$core";
import { ContextPot, CoreStartPot } from "$core/pots";

const simpleWorkflow = workflow(class CTX extends ContextPot<{}> {})
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task1 }) => {
    const t1 = task1()
      .name("task 1")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${ctx.data} 1`);
        return next(t2);
      });

    const t2 = task1()
      .name("task 2")
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${ctx.data} 2`);
        return finish();
      });

    return t1;
  });

const res = await execute(simpleWorkflow);
Deno.exit(res ? 1 : -1);
