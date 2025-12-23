import { assertEquals } from "jsr:@std/assert";
import { task, execute, InternalPot, CoreStartPot, TriggerRule } from "$shibui";

Deno.test("Task - simple task creation", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const t = task(TestPot)
    .name("Test Task")
    .do(async ({ pots, finish }) => {
      return finish();
    });

  assertEquals(t.task.name, "Test Task");
  assertEquals(t.task.slotsCount, 1);
});

Deno.test("Task - simple execution with finish", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 42 };
  }

  let executed = false;
  let receivedValue = 0;

  const t = task(TestPot)
    .name("Test Task")
    .do(async ({ pots, finish }) => {
      executed = true;
      receivedValue = pots[0].data.value;
      return finish();
    });

  const success = await execute(t, [new TestPot().init({ value: 42 })], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(executed, true);
  assertEquals(receivedValue, 42);
});

Deno.test("Task - trigger with custom handler", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  let triggerCalled = false;

  const t = task(TestPot)
    .name("Test Task")
    .on(TestPot, ({ pot, allow, deny }) => {
      triggerCalled = true;
      return pot.data.value > 10 ? allow() : deny();
    })
    .do(async ({ finish }) => finish());

  // Should deny
  const result1 = await execute(t, [new TestPot().init({ value: 5 })], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  // Trigger was called but denied, so task never executes
  assertEquals(triggerCalled, true);

  triggerCalled = false;

  // Should allow
  const result2 = await execute(t, [new TestPot().init({ value: 20 })], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(triggerCalled, true);
  assertEquals(result2, true);
});

Deno.test("Task - onRule TriggerRule.ForThisTask", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  let executed = false;

  const t = task(TestPot)
    .name("Target Task")
    .onRule("TriggerRule.ForThisTask", TestPot)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const pot = new TestPot().init({ value: 42 });
  pot.to.task = "Target Task";

  const success = await execute(t, [pot], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - onRule TriggerRule.ForUnknown", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  let executed = false;

  const t = task(TestPot)
    .name("Catch All")
    .onRule("TriggerRule.ForUnknown", TestPot)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  const pot = new TestPot().init({ value: 42 });
  // pot.to.task is "unknown" by default

  const success = await execute(t, [pot], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - attempts and interval configuration", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

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
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

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

  const success = await execute(t, [new TestPot()], {
    kv: { inMemory: true },
    logger: { enable: false },
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
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(executed, true);
});

Deno.test("Task - multiple pot types", () => {
  class PotA extends InternalPot<{ a: number }> {
    data = { a: 0 };
  }
  class PotB extends InternalPot<{ b: string }> {
    data = { b: "" };
  }

  const t = task(PotA, PotB)
    .name("Multi Pot Task")
    .do(async ({ pots, finish }) => {
      return finish();
    });

  assertEquals(t.task.slotsCount, 2);
});

Deno.test("Task - logger available in do handler", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  let loggerWorks = false;

  const t = task(TestPot)
    .name("Logger Test")
    .do(async ({ log, finish }) => {
      log.inf("Test message");
      loggerWorks = true;
      return finish();
    });

  const success = await execute(t, [new TestPot()], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
  assertEquals(loggerWorks, true);
});
