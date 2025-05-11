// deno-lint-ignore-file require-await
import shibuiCore from "$core";
import { InternalPot } from "$core/pots";

const core = shibuiCore<{ x: number }>({
  spicy: {
    x: 100,
  },
});

class SimplePot extends InternalPot<{ value: number }> {
  override ttl = 1;
  override data = {
    value: 0,
  };
}

const task1 = core.task(SimplePot)
  .onRule("ForThisTask", SimplePot)
  .name`Task 1`
  .do(async ({ log, next, x }) => {
    log.dbg(`value: ${x}`);
    return next(task2, {
      value: x += 1,
    });
  });

const task2 = core.task(SimplePot)
  .name`Task 2`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ pots, log, next }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task3, {
      value: pots[0].data.value += 1,
    });
  });

const task3 = core.task(SimplePot)
  .name`Task 3`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, finish, pots }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

core.register(task1);
core.register(task2);
core.register(task3);

await core.start();
core.send(new SimplePot(), task1);
