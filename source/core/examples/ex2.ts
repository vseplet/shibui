// deno-lint-ignore-file require-await
import core from "$core";
import { InternalPot } from "$core/pots";

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 1;
  data = {
    value: 0,
  };
}

const task1 = core.task(SimplePot)
  .name`Task 1`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task2, {
      value: pots[0].data.value += 1,
    });
  });

const task2 = core.task(SimplePot)
  .name`Task 2`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task3, {
      value: pots[0].data.value += 1,
    });
  });

const task3 = core.task(SimplePot)
  .name`Task 3`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, finish }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

core.register(task1);
core.register(task2);
core.register(task3);

await core.start();
core.send(new SimplePot(), task1);
