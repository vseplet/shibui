import { execute, workflow } from "$shibui";

const simpleWorkflow = workflow()
  .name("simple workflow")
  .sq(({ task }) =>
    task()
      .name("single workflow task")
      .do(async ({ ctx, log, finish, fail }) => {
        if (Math.random() > 0.5) {
          return fail("Random failure occurred!");
        }
        log.dbg(`Context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      })
      .catch(async (error) => {
        console.error(`Workflow task failed: ${error.message}`);
      })
  );

const res = await execute(simpleWorkflow);
Deno.exit(res ? 0 : 1);
