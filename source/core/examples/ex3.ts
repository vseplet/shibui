// deno-lint-ignore-file require-await
import { ContextPot } from "../pots/ContextPot.ts";
import { CoreStartPot } from "../pots/CoreStartPot.ts";
import core from "../mod.ts";

const w1 = core.workflow(class CTX extends ContextPot<{}> {})
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task1 }) =>
    task1()
      .name("single workflow task")
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      })
  );

core.register(w1);
await core.start();
