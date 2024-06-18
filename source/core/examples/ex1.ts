// deno-lint-ignore-file
import { InternalPot } from "$core/pots";
import { execute, task } from "$core";

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 100;
  data = {
    value: Math.random(),
  };
}

const mySimpleTask = task(SimplePot)
  .name`Simple Task`
  .on(SimplePot, ({ allow, deny, log, pot }) => {
    log.dbg(`run test function... `);
    return pot.data.value > Math.random() ? allow() : deny();
  })
  .do(async ({ finish, pots, log }) => {
    log.dbg(`run do function...`);
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

const res = await execute(mySimpleTask, [new SimplePot()]);
Deno.exit(res ? 1 : -1);
