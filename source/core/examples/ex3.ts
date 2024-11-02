// deno-lint-ignore-file require-await
import { execute, workflow } from "$core";

const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) =>
    task()
      .name("single workflow task")
      .do(async ({ ctx, log, finish, fail }) => {
        if (Math.random() > 0.5) return fail("random!");
        log.dbg(`context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      })
  );

const res = await execute(simpleWorkflow);
Deno.exit(res ? 1 : -1);
