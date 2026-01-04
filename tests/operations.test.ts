import { assertEquals } from "jsr:@std/assert";
import { execute, pot, shibui, task, TriggerRule } from "$shibui";

const TestPot = pot("TestPot", { value: 0 });
const DataPot = pot("DataPot", { a: 0, b: "" });
const CountPot = pot("CountPot", { count: 0 });
const RetryPot = pot("RetryPot", { value: 0 }, { ttl: 3 });

Deno.test("Operations - finish() completes task successfully", async () => {
  let executed = false;

  const t = task(TestPot)
    .name("Finish Task")
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const success = await execute(t, [TestPot.create()], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Operations - fail() completes task with error", async () => {
  const t = task(TestPot)
    .name("Fail Task")
    .do(async ({ fail }) => {
      return fail("Task failed intentionally");
    });

  const success = await execute(t, [TestPot.create()], {
    logger: false,
  });

  assertEquals(success, false);
});

Deno.test("Operations - next() sends pot to another task", async () => {
  const c = shibui({ logger: false });

  let task1Executed = false;
  let task2Executed = false;
  let receivedValue = 0;

  const task2 = task(TestPot)
    .name("Task 2")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ pots, finish }) => {
      task2Executed = true;
      receivedValue = pots[0].data.value;
      return finish();
    });

  const task1 = task(TestPot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ next }) => {
      task1Executed = true;
      return next(task2, { value: 42 });
    });

  c.register(task1);
  c.register(task2);

  await c.start();

  const instance = TestPot.create();
  instance.to.task = "Task 1";
  c.send(instance, task1);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(task1Executed, true);
  assertEquals(task2Executed, true);
  assertEquals(receivedValue, 42);

  c.close();
});

Deno.test("Operations - next() with multiple tasks", async () => {
  const c = shibui({ logger: false });

  let task1Executed = false;
  let task2AExecuted = false;
  let task2BExecuted = false;

  const task2A = task(TestPot)
    .name("Task 2A")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ finish }) => {
      task2AExecuted = true;
      return finish();
    });

  const task2B = task(TestPot)
    .name("Task 2B")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ finish }) => {
      task2BExecuted = true;
      return finish();
    });

  const task1 = task(TestPot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ next }) => {
      task1Executed = true;
      return next([task2A, task2B], { value: 10 });
    });

  c.register(task1);
  c.register(task2A);
  c.register(task2B);

  await c.start();

  const instance = TestPot.create();
  instance.to.task = "Task 1";
  c.send(instance, task1);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(task1Executed, true);
  assertEquals(task2AExecuted, true);
  assertEquals(task2BExecuted, true);

  c.close();
});

Deno.test("Operations - next() passes data", async () => {
  const c = shibui({ logger: false });

  let receivedA = 0;
  let receivedB = "";

  const task2 = task(DataPot)
    .name("Task 2")
    .onRule(TriggerRule.ForThisTask, DataPot)
    .do(async ({ pots, finish }) => {
      receivedA = pots[0].data.a;
      receivedB = pots[0].data.b;
      return finish();
    });

  const task1 = task(DataPot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, DataPot)
    .do(async ({ next }) => {
      return next(task2, { a: 123, b: "hello" });
    });

  c.register(task1);
  c.register(task2);

  await c.start();

  const instance = DataPot.create();
  instance.to.task = "Task 1";
  c.send(instance, task1);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(receivedA, 123);
  assertEquals(receivedB, "hello");

  c.close();
});

Deno.test("Operations - repeat() retries task", async () => {
  let attemptCount = 0;

  const t = task(RetryPot)
    .name("Retry Task")
    .attempts(3)
    .do(async ({ finish, repeat }) => {
      attemptCount++;
      if (attemptCount < 2) {
        return repeat();
      }
      return finish();
    });

  const success = await execute(t, [RetryPot.create()], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(attemptCount >= 2, true);
});

Deno.test("Operations - chaining multiple tasks", async () => {
  const c = shibui({ logger: false });

  const results: number[] = [];

  const task3 = task(CountPot)
    .name("Task 3")
    .onRule(TriggerRule.ForThisTask, CountPot)
    .do(async ({ pots, finish }) => {
      const count = pots[0].data.count + 1;
      results.push(count);
      return finish();
    });

  const task2 = task(CountPot)
    .name("Task 2")
    .onRule(TriggerRule.ForThisTask, CountPot)
    .do(async ({ pots, next }) => {
      const count = pots[0].data.count + 1;
      results.push(count);
      return next(task3, { count });
    });

  const task1 = task(CountPot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, CountPot)
    .do(async ({ pots, next }) => {
      const count = pots[0].data.count + 1;
      results.push(count);
      return next(task2, { count });
    });

  c.register(task1);
  c.register(task2);
  c.register(task3);

  await c.start();

  const instance = CountPot.create({ count: 0 });
  instance.to.task = "Task 1";
  c.send(instance, task1);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(results, [1, 2, 3]);

  c.close();
});
