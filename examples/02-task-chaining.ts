import shibui, { pot, task, TriggerRule } from "$shibui";

const c = shibui();
const SimplePot = pot("SimplePot", { value: 0 }, { ttl: 1 });

const task3 = task(SimplePot)
  .name("Task 3")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, finish }) => {
    log.dbg(`Task 3 received value: ${pots[0].data.value}`);
    return finish();
  });

const task2 = task(SimplePot)
  .name("Task 2")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`Task 2 received value: ${pots[0].data.value}`);
    return next(task3, { value: pots[0].data.value + 1 });
  });

const task1 = task(SimplePot)
  .name("Task 1")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, pots, next }) => {
    log.dbg(`Task 1 received value: ${pots[0].data.value}`);
    return next(task2, { value: pots[0].data.value + 1 });
  });

c.register(task1);
c.register(task2);
c.register(task3);

await c.start();
c.send(SimplePot, task1);
