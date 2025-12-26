import shibuiCore, { pot, TriggerRule } from "$shibui";

const core = shibuiCore<{ x: number }>({
  context: { x: 100 },
});

const SimplePot = pot("SimplePot", { value: 0 }, { ttl: 1 });

const task3 = core.task(SimplePot)
  .name("Task 3")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, finish, pots }) => {
    log.dbg(`Task 3 - Final value: ${pots[0].data.value}`);
    return finish();
  });

const task2 = core.task(SimplePot)
  .name("Task 2")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ pots, log, next }) => {
    log.dbg(`Task 2 - Received value: ${pots[0].data.value}`);
    return next(task3, { value: pots[0].data.value + 1 });
  });

const task1 = core.task(SimplePot)
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .name("Task 1")
  .do(async ({ log, next, x }) => {
    log.dbg(`Task 1 - Context value: ${x}`);
    return next(task2, { value: x + 1 });
  });

core.register(task1);
core.register(task2);
core.register(task3);

await core.start();
core.send(SimplePot, task1);
