// deno-lint-ignore-file require-await
import { ContextPot } from "../pots/ContextPot.ts";
import { CoreStartPot } from "../pots/CoreStartPot.ts";
import core from "../mod.ts";

class CTX extends ContextPot<{}> {}

const w1 = core.workflow(CTX)
  .name("simple workflow")
  .on(CoreStartPot)
  .sq(({ task1 }) =>
    task1()
      .name("single workflow task")
      .on(CTX, ({ pots, allow, deny }) => {
        if (pots[0].to.task == "[simple workflow] single workflow task") {
          return allow(0);
        } else {
          return deny();
        }
      })
      .on(CTX, ({ pots, allow, deny }) => {
        if (pots[0].to.task == "[simple workflow] single workflow task") {
          return allow(1);
        } else {
          return deny();
        }
      })
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;
        log.dbg(`context data: ${JSON.stringify(ctx.data)}`);
        return finish();
      })
  );

core.register(w1);
await core.start();
