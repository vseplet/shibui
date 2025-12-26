import { execute, workflow } from "$shibui";

const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) => {
    const t2 = task()
      .name("task 2")
      .do(async ({ ctx, log, finish }) => {
        log.dbg(`Task 2 - Context: ${JSON.stringify(ctx.data)}`);
        return finish();
      });

    const t1 = task()
      .name("task 1")
      .retry({ attempts: 2, timeout: 10000 })
      .do(async ({ ctx, log, next }) => {
        log.dbg(`Task 1 - Context: ${JSON.stringify(ctx.data)}`);
        return next(t2);
      });

    return t1;
  });

const res = await execute(simpleWorkflow);
Deno.exit(res ? 0 : 1);
