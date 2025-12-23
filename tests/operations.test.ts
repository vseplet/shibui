import { assertEquals } from "jsr:@std/assert";
import { task, execute, core } from "$shibui";
import { InternalPot } from "$shibui/pots";
import { TriggerRule } from "$shibui/constants";

Deno.test("Operations - finish() completes task successfully", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  let executed = false;

  const t = task(TestPot)
    .name("Finish Task")
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const success = await execute(t, [new TestPot()], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Operations - fail() completes task with error", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const t = task(TestPot)
    .name("Fail Task")
    .do(async ({ fail }) => {
      return fail("Task failed intentionally");
    });

  const success = await execute(t, [new TestPot()], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, false);
});

Deno.test("Operations - next() sends pot to another task", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let task1Executed = false;
  let task2Executed = false;
  let receivedValue = 0;

  const task2 = c.task(TestPot)
    .name("Task 2")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ pots, finish }) => {
      task2Executed = true;
      receivedValue = pots[0].data.value;
      return finish();
    });

  const task1 = c.task(TestPot)
    .name("Task 1")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ next }) => {
      task1Executed = true;
      return next(task2, { value: 42 });
    });

  c.register(task1);
  c.register(task2);

  await c.start();

  const pot = new TestPot();
  pot.to.task = "Task 1";
  c.send(pot, task1);

  // Wait for execution
  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(task1Executed, true);
  assertEquals(task2Executed, true);
  assertEquals(receivedValue, 42);
});

Deno.test("Operations - next() with multiple tasks", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let task1Executed = false;
  let task2AExecuted = false;
  let task2BExecuted = false;

  const task2A = c.task(TestPot)
    .name("Task 2A")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ finish }) => {
      task2AExecuted = true;
      return finish();
    });

  const task2B = c.task(TestPot)
    .name("Task 2B")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ finish }) => {
      task2BExecuted = true;
      return finish();
    });

  const task1 = c.task(TestPot)
    .name("Task 1")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ next }) => {
      task1Executed = true;
      return next([task2A, task2B], { value: 10 });
    });

  c.register(task1);
  c.register(task2A);
  c.register(task2B);

  await c.start();

  const pot = new TestPot();
  pot.to.task = "Task 1";
  c.send(pot, task1);

  // Wait for execution
  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(task1Executed, true);
  assertEquals(task2AExecuted, true);
  assertEquals(task2BExecuted, true);
});

Deno.test("Operations - next() passes data", async () => {
  class TestPot extends InternalPot<{ a: number; b: string }> {
    data = { a: 0, b: "" };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let receivedA = 0;
  let receivedB = "";

  const task2 = c.task(TestPot)
    .name("Task 2")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ pots, finish }) => {
      receivedA = pots[0].data.a;
      receivedB = pots[0].data.b;
      return finish();
    });

  const task1 = c.task(TestPot)
    .name("Task 1")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ next }) => {
      return next(task2, { a: 123, b: "hello" });
    });

  c.register(task1);
  c.register(task2);

  await c.start();

  const pot = new TestPot();
  pot.to.task = "Task 1";
  c.send(pot, task1);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(receivedA, 123);
  assertEquals(receivedB, "hello");
});

Deno.test("Operations - repeat() retries task", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override ttl = 3;
    data = { value: 0 };
  }

  let attemptCount = 0;

  const t = task(TestPot)
    .name("Retry Task")
    .attempts(3)
    .do(async ({ finish, repeat }) => {
      attemptCount++;
      if (attemptCount < 2) {
        return repeat();
      }
      return finish();
    });

  const success = await execute(t, [new TestPot()], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(attemptCount >= 2, true);
});

Deno.test("Operations - chaining multiple tasks", async () => {
  class TestPot extends InternalPot<{ count: number }> {
    data = { count: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  const results: number[] = [];

  const task3 = c.task(TestPot)
    .name("Task 3")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ pots, finish }) => {
      results.push(pots[0].data.count);
      return finish();
    });

  const task2 = c.task(TestPot)
    .name("Task 2")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ pots, next }) => {
      const count = pots[0].data.count + 1;
      results.push(count);
      return next(task3, { count });
    });

  const task1 = c.task(TestPot)
    .name("Task 1")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ pots, next }) => {
      const count = pots[0].data.count + 1;
      results.push(count);
      return next(task2, { count });
    });

  c.register(task1);
  c.register(task2);
  c.register(task3);

  await c.start();

  const pot = new TestPot().init({ count: 0 });
  pot.to.task = "Task 1";
  c.send(pot, task1);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(results, [1, 2, 3]);
});
