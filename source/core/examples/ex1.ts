// deno-lint-ignore-file
import { InternalPot } from "$core/pots";
import core from "$core";

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 5;
  data = {
    value: Math.random(),
  };
}

const task = core.task(SimplePot)
  .name`Simple Task`
  .on(SimplePot, ({ allow, deny, log }) => {
    log.dbg(`run test function... `);
    return Math.random() > 0.7 ? allow() : deny();
  })
  .do(async ({ finish, pots, log }) => {
    log.dbg(`run do function...`);
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

core.register(task);
await core.start();
core.send(new SimplePot());
