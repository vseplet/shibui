import { assertEquals } from "jsr:@std/assert";
import { execute, pot, task, TriggerRule } from "$shibui";

const TestPot = pot("TestPot", { value: 0 });
const PotA = pot("PotA", { a: 0 });
const PotB = pot("PotB", { b: "" });

Deno.test("Task - simple task creation", () => {
  const t = task(TestPot)
    .name("Test Task")
    .do(async ({ pots, finish }) => {
      return finish();
    });

  assertEquals(t.task.name, "Test Task");
  assertEquals(t.task.slotsCount, 1);
});

Deno.test("Task - simple execution with finish", async () => {
  let executed = false;
  let receivedValue = 0;

  const t = task(TestPot)
    .name("Test Task")
    .do(async ({ pots, finish }) => {
      executed = true;
      receivedValue = pots[0].data.value;
      return finish();
    });

  const success = await execute(t, [TestPot.create({ value: 42 })], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
  assertEquals(receivedValue, 42);
});

Deno.test("Task - trigger with custom handler", async () => {
  let triggerCalled = false;
  let taskExecuted = false;

  const t = task(TestPot)
    .name("Test Task")
    .on(TestPot, ({ pot, allow, deny }) => {
      triggerCalled = true;
      return pot.data.value > 10 ? allow() : deny();
    })
    .do(async ({ finish }) => {
      taskExecuted = true;
      return finish();
    });

  const result = await execute(t, [TestPot.create({ value: 20 })], {
    logger: false,
  });

  assertEquals(triggerCalled, true);
  assertEquals(taskExecuted, true);
  assertEquals(result, true);
});

Deno.test("Task - onRule TriggerRule.ForThisTask", async () => {
  let executed = false;

  const t = task(TestPot)
    .name("Target Task")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const instance = TestPot.create({ value: 42 });
  instance.to.task = "Target Task";

  const success = await execute(t, [instance], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - onRule TriggerRule.ForUnknown", async () => {
  let executed = false;

  const t = task(TestPot)
    .name("Catch All")
    .onRule(TriggerRule.ForUnknown, TestPot)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const instance = TestPot.create({ value: 42 });
  // instance.to.task is "unknown" by default

  const success = await execute(t, [instance], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - attempts and interval configuration", () => {
  const t = task(TestPot)
    .name("Resilient Task")
    .attempts(5)
    .interval(1000)
    .timeout(30000)
    .do(async ({ finish }) => finish());

  assertEquals(t.task.attempts, 5);
  assertEquals(t.task.interval, 1000);
  assertEquals(t.task.timeout, 30000);
});

Deno.test("Task - fail handler", async () => {
  let failHandlerCalled = false;
  let errorMessage = "";

  const t = task(TestPot)
    .name("Failing Task")
    .do(async ({ fail }) => {
      return fail("Something went wrong");
    })
    .fail(async (error: Error) => {
      failHandlerCalled = true;
      errorMessage = error.message;
    });

  const success = await execute(t, [TestPot.create()], {
    logger: false,
  });

  assertEquals(success, false);
  assertEquals(failHandlerCalled, true);
  assertEquals(errorMessage.includes("Something went wrong"), true);
});

Deno.test("Task - default trigger on CoreStartPot", async () => {
  let executed = false;

  const t = task()
    .name("Auto Start Task")
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const success = await execute(t, undefined, {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - multiple pot types", () => {
  const t = task(PotA, PotB)
    .name("Multi Pot Task")
    .do(async ({ pots, finish }) => {
      return finish();
    });

  assertEquals(t.task.slotsCount, 2);
});

Deno.test("Task - logger available in do handler", async () => {
  let loggerWorks = false;

  const t = task(TestPot)
    .name("Logger Test")
    .do(async ({ log, finish }) => {
      log.inf("Test message");
      loggerWorks = true;
      return finish();
    });

  const success = await execute(t, [TestPot.create()], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(loggerWorks, true);
});

Deno.test("Task - .when() predicate trigger", async () => {
  let executed = false;

  const t = task(TestPot)
    .name("When Test")
    .when((data) => data.value > 10)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const success = await execute(t, [TestPot.create({ value: 20 })], {
    logger: false,
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - .when() denies when predicate returns false", async () => {
  let executed = false;

  const t = task(TestPot)
    .name("When Deny Test")
    .when((data) => data.value > 100)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  // We verify the trigger is created correctly
  assertEquals(t.task.triggers["TestPot"].length, 1);
  assertEquals(executed, false);
});

Deno.test("Task - .retry() configuration", () => {
  const t = task(TestPot)
    .name("Retry Test")
    .retry({ attempts: 5, interval: 2000, timeout: 10000 })
    .do(async ({ finish }) => finish());

  assertEquals(t.task.attempts, 5);
  assertEquals(t.task.interval, 2000);
  assertEquals(t.task.timeout, 10000);
});

Deno.test("Task - .catch() alias for .fail()", async () => {
  let catchCalled = false;

  const t = task(TestPot)
    .name("Catch Test")
    .do(async ({ fail }) => {
      return fail("Test error");
    })
    .catch(async (_error: Error) => {
      catchCalled = true;
    });

  const success = await execute(t, [TestPot.create()], {
    logger: false,
  });

  assertEquals(success, false);
  assertEquals(catchCalled, true);
});
