// deno-lint-ignore-file
import { InternalPot } from "../../pots/InternalPot.ts";
import core from "../mod.ts";

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 5;
  data = {
    value: Math.random(),
  };
}

const task = core.task<SimplePot>()
  .name`Simple Task`
  .on(SimplePot, ({ allow, deny, ctx, log }) => {
    log.dbg(`run test function... `);
    return Math.random() > 0.7 ? allow() : deny();
  })
  .do(async ({ finish, ctx, log }) => {
    log.dbg(`run do function...`);
    log.dbg(`value: ${ctx.data.value}`);

    return finish();
  });

core.api.register(task);
core.api.send(new SimplePot());
core.api.start();