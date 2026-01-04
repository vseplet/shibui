import shibui, { pot, task, TriggerRule } from "$shibui";

// Custom context that will be available in all task handlers
const appContext = { x: 100 };

const c = shibui<typeof appContext>({
  context: appContext,
});

const SimplePot = pot("SimplePot", { value: 0 }, { ttl: 1 });

const task3 = task(SimplePot)
  .name("Task 3")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ log, finish, pots }) => {
    log.dbg(`Task 3 - Final value: ${pots[0].data.value}`);
    return finish();
  });

const task2 = task(SimplePot)
  .name("Task 2")
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .do(async ({ pots, log, next }) => {
    log.dbg(`Task 2 - Received value: ${pots[0].data.value}`);
    return next(task3, { value: pots[0].data.value + 1 });
  });

// Access custom context via closure
const task1 = task(SimplePot)
  .onRule(TriggerRule.ForThisTask, SimplePot)
  .name("Task 1")
  .do(async ({ log, next }) => {
    // Access appContext.x via closure
    log.dbg(`Task 1 - Context value: ${appContext.x}`);
    return next(task2, { value: appContext.x + 1 });
  });

c.register(task1);
c.register(task2);
c.register(task3);

await c.start();
c.send(SimplePot, task1);
