// deno-lint-ignore-file require-await
import core from "$core";
import { ContextPot, InternalPot } from "$core/pots";

const c = core({
  useDenoKV: false,
  spicy: {
    x: 100,
  },
});

c.workflow(class CTX extends ContextPot<{}> {})
  .name`Workflow 1`
  .on(InternalPot, ({ x, pot }) => {
    throw new Error("Not allowed");
  })
  .sq(({ task1 }) => {
    return task1()
      .name`Task 1`
      .do(async ({ log, pots, finish, x }) => {
        log.dbg(``);
        return finish();
      });
  });

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 1;
  data = {
    value: 0,
  };
}

const task1 = c.task(SimplePot)
  .name`Task 1`
  .on(SimplePot, ({ x, allow }) => allow())
  .do(async ({ log, pots, next, x }) => {
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
