// deno-lint-ignore-file require-await
import { execute, workflow } from "$core";
import { ContextPot, CoreStartPot } from "$core/pots";

class CTX extends ContextPot<{}> {}

const simpleWorkflow = workflow(CTX)
  .name("simple workflow")
  .on(CoreStartPot, (_pot) => new CTX())
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
