// deno-lint-ignore-file require-await
import shibuiCore from "$core";
import { ContextPot, InternalPot } from "$core/pots";

const core = shibuiCore<{ x: number }>({
  useDenoKV: false,
  spicy: {
    x: 100,
  },
});

class CTX extends ContextPot<{}> {}

core.workflow(CTX)
  .name`Workflow 1`
  .on(InternalPot)
  .sq(({ task }) => {
    return task()
      .name`Task 1`
      .do(async ({ log, finish, x }) => {
        log.dbg(`${x}`);
        return finish();
      });
  });

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 1;
  data = {
    value: 0,
  };
}

const task1 = core.task(SimplePot)
  .name`Task 1`
  .do(async ({ log, pots, next, x }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task2, {
      value: pots[0].data.value += 1,
    });
  });

const task2 = core.task(SimplePot)
  .name`Task 2`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, next, x }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return next(task3, {
      value: pots[0].data.value += 1,
    });
  });

const task3 = core.task(SimplePot)
  .name`Task 3`
  .onRule("ForThisTask", SimplePot)
  .do(async ({ log, pots, finish, x }) => {
    log.dbg(`value: ${pots[0].data.value}`);
    return finish();
  });

core.register(task1);
core.register(task2);
core.register(task3);

await core.start();
core.send(new SimplePot(), task1);
