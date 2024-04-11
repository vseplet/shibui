import { ContextPot } from "../../pots/ContextPot.ts";
import { CoreStartPot } from "../../pots/CoreStartPot.ts";
import core from "../mod.ts";

const w1 = core.workflow(class CTX extends ContextPot<{}> {})
  .on(CoreStartPot)
  .sq(({ task1 }) =>
    task1()
      .do(async ({ pots, log, finish }) => {
        log.dbg(`ctx data: ${pots[0].data}`);
        return finish();
      })
  );
