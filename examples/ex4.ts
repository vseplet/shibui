// deno-lint-ignore-file require-await
import { execute, workflow } from "$core";

const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) => {
    const t1 = task()
      .name("task 1")
      .do(async ({ ctx, log, next }) => {
        log.dbg(`context data: ${ctx.data} 1`);
        return next(t2);
      });

    const t2 = task()
      .name("task 2")
      .do(async ({ ctx, log, finish }) => {
        log.dbg(`context data: ${ctx.data} 2`);
        return finish();
      });

    return t1;
  });

const res = await execute(simpleWorkflow);
Deno.exit(res ? 1 : -1);
