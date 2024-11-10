// deno-lint-ignore-file
import core, { task } from "$core";
import { InternalPot } from "$core/pots";

class PotA extends InternalPot<{ value: number }> {
  override data = {
    value: Math.random(),
  };
}

class PotB extends InternalPot<{ value: number }> {
  override data = {
    value: Math.random(),
  };
}

class PotC extends InternalPot<{ value: number }> {
  override data = {
    value: Math.random(),
  };
}

class PotD extends InternalPot<{ value: number }> {
  override data = {
    value: Math.random(),
  };
}

class PotE extends InternalPot<{ value: number }> {
  override data = {
    value: Math.random(),
  };
}

const pots = [new PotA(), new PotB(), new PotC(), new PotD(), new PotE()];

const mySimpleTask = task(PotA, PotB, PotC, PotD, PotE)
  .name`Simple Task`
  .do(async ({ finish, pots, log }) => {
    log.dbg(`run do function...`);
    log.dbg(`value: ${pots[0].data.value}`);
    log.dbg(`value: ${pots[1].data.value}`);
    log.dbg(`value: ${pots[2].data.value}`);
    log.dbg(`value: ${pots[3].data.value}`);
    log.dbg(`value: ${pots[4].data.value}`);
    return finish();
  });

const c = core();
c.settings.DEFAULT_LOGGING_LEVEL = 2;
c.register(mySimpleTask);
await c.start();
for (const pot of pots) {
  c.send(pot);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
