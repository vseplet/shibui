// deno-lint-ignore-file require-await
import core from "$core";
import { InternalPot } from "$core/pots";

const c = core();

class SimplePot extends InternalPot<{ value: number }> {
  override ttl = 1;
  override data = {
    value: 0,
  };
}

const task1 = c.task(SimplePot)
  .name`Task 1`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task2, {
      value: pots[0].data.value += 1,
    });
  });

const task2 = c.task(SimplePot)
  .name`Task 2`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task3, {
      value: pots[0].data.value += 1,
    });
  });

const task3 = c.task(SimplePot)
  .name`Task 3`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, finish }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

c.register(task1);
c.register(task2);
c.register(task3);

await c.start();
c.send(new SimplePot(), task1);
