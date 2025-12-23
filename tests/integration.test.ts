import { assertEquals } from "jsr:@std/assert";
import {
  ContextPot,
  core,
  execute,
  InternalPot,
  task,
  TriggerRule,
  workflow,
} from "$shibui";

// Based on ex1.ts - simple task with trigger
Deno.test("Integration - simple task with conditional trigger", async () => {
  class SimplePot extends InternalPot<{ value: number }> {
    override ttl = 100;
    override data = { value: 0 };
  }

  let executed = false;
  let testPassed = false;

  const mySimpleTask = task(SimplePot)
    .name("Simple Task")
    .on(SimplePot, ({ allow, deny, pot }) => {
      testPassed = pot.data.value > 0.3;
      return testPassed ? allow() : deny();
    })
    .do(async ({ finish, pots }) => {
      executed = true;
      assertEquals(pots[0].data.value > 0.3, true);
      return finish();
    });

  // Try with high value (should execute)
  const pot = new SimplePot();
  pot.data.value = 0.8;

  const res = await execute(mySimpleTask, [pot], {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(res, true);
  assertEquals(executed, true);
  assertEquals(testPassed, true);
});

// Based on ex2.ts - task chaining
Deno.test("Integration - task chain with data passing", async () => {
  class SimplePot extends InternalPot<{ value: number }> {
    override ttl = 1;
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  const results: number[] = [];

  const task3 = c.task(SimplePot)
    .name("Task 3")
    .onRule(TriggerRule.ForThisTask, SimplePot)
    .do(async ({ pots, finish }) => {
      results.push(pots[0].data.value);
      return finish();
    });

  const task2 = c.task(SimplePot)
    .name("Task 2")
    .onRule(TriggerRule.ForThisTask, SimplePot)
    .do(async ({ pots, next }) => {
      results.push(pots[0].data.value);
      return next(task3, {
        value: pots[0].data.value + 1,
      });
    });

  const task1 = c.task(SimplePot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, SimplePot)
    .do(async ({ pots, next }) => {
      results.push(pots[0].data.value);
      return next(task2, {
        value: pots[0].data.value + 1,
      });
    });

  c.register(task1);
  c.register(task2);
  c.register(task3);

  await c.start();
  c.send(new SimplePot(), task1);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(results, [0, 1, 2]);

  c.close();
});

// Based on ex4.ts - simple workflow
Deno.test("Integration - simple workflow execution", async () => {
  const results: number[] = [];

  const simpleWorkflow = workflow()
    .name("simple workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("task 1")
        .do(async ({ ctx, next }) => {
          results.push(1);
          return next(t2);
        });

      const t2 = task()
        .name("task 2")
        .do(async ({ ctx, finish }) => {
          results.push(2);
          return finish();
        });

      return t1;
    });

  const res = await execute(simpleWorkflow, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(res, true);
  assertEquals(results, [1, 2]);
});

// Based on ex6.ts - dependent task with 5 pots
Deno.test("Integration - five slot dependent task", async () => {
  class PotA extends InternalPot<{ value: number }> {
    override data = { value: 1 };
  }
  class PotB extends InternalPot<{ value: number }> {
    override data = { value: 2 };
  }
  class PotC extends InternalPot<{ value: number }> {
    override data = { value: 3 };
  }
  class PotD extends InternalPot<{ value: number }> {
    override data = { value: 4 };
  }
  class PotE extends InternalPot<{ value: number }> {
    override data = { value: 5 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let sum = 0;

  const mySimpleTask = task(PotA, PotB, PotC, PotD, PotE)
    .name("Simple Task")
    .do(async ({ finish, pots }) => {
      sum = pots.reduce((acc, pot) => acc + pot.data.value, 0);
      return finish();
    });

  c.register(mySimpleTask);
  await c.start();

  c.send(new PotA());
  c.send(new PotB());
  c.send(new PotC());
  c.send(new PotD());
  c.send(new PotE());

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(sum, 15);

  c.close();
});

// Complex workflow with context mutation
Deno.test("Integration - workflow with context mutation", async () => {
  class BuildContext extends ContextPot<{
    steps: string[];
    status: string;
  }> {
    override data = {
      steps: [] as string[],
      status: "pending",
    };
  }

  const buildWorkflow = workflow(BuildContext)
    .name("Build Pipeline")
    .sq(({ task }) => {
      const checkout = task()
        .name("Checkout")
        .do(async ({ ctx, next }) => {
          ctx.data.status = "checking out";
          ctx.data.steps.push("checkout");
          return next(build);
        });

      const build = task()
        .name("Build")
        .do(async ({ ctx, next }) => {
          ctx.data.status = "building";
          ctx.data.steps.push("build");
          return next(deploy);
        });

      const deploy = task()
        .name("Deploy")
        .do(async ({ ctx, finish }) => {
          ctx.data.status = "deployed";
          ctx.data.steps.push("deploy");
          assertEquals(ctx.data.steps, ["checkout", "build", "deploy"]);
          assertEquals(ctx.data.status, "deployed");
          return finish();
        });

      return checkout;
    });

  const success = await execute(buildWorkflow, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
});

// Error handling and fail propagation
Deno.test("Integration - error handling in workflow", async () => {
  class MyContext extends ContextPot<{ error: string }> {
    override data = { error: "" };
  }

  let failHandlerCalled = false;

  const errorWorkflow = workflow(MyContext)
    .name("Error Workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ ctx, next }) => {
          return next(t2);
        });

      const t2 = task()
        .name("Task 2")
        .do(async ({ fail }) => {
          return fail("Something went wrong");
        })
        .fail(async (error: Error) => {
          failHandlerCalled = true;
        });

      return t1;
    });

  const success = await execute(errorWorkflow, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, false);
  assertEquals(failHandlerCalled, true);
});

// Parallel next() to multiple tasks
Deno.test("Integration - parallel task execution", async () => {
  class DataPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  const results: string[] = [];

  const taskA = c.task(DataPot)
    .name("Task A")
    .onRule(TriggerRule.ForThisTask, DataPot)
    .do(async ({ finish }) => {
      results.push("A");
      return finish();
    });

  const taskB = c.task(DataPot)
    .name("Task B")
    .onRule(TriggerRule.ForThisTask, DataPot)
    .do(async ({ finish }) => {
      results.push("B");
      return finish();
    });

  const starter = c.task(DataPot)
    .name("Starter")
    .onRule(TriggerRule.ForThisTask, DataPot)
    .do(async ({ next }) => {
      results.push("Start");
      return next([taskA, taskB], { value: 10 });
    });

  c.register(starter);
  c.register(taskA);
  c.register(taskB);

  await c.start();

  const pot = new DataPot();
  pot.to.task = "Starter";
  c.send(pot, starter);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(results.includes("Start"), true);
  assertEquals(results.includes("A"), true);
  assertEquals(results.includes("B"), true);

  c.close();
});

// Timeout and retry
Deno.test("Integration - retry mechanism", async () => {
  class TestPot extends InternalPot<{ attempt: number }> {
    override ttl = 5;
    override data = { attempt: 0 };
  }

  let attemptCount = 0;

  const resilientTask = task(TestPot)
    .name("Resilient Task")
    .attempts(3)
    .interval(100)
    .do(async ({ pots, finish, repeat }) => {
      attemptCount++;
      if (attemptCount < 2) {
        return repeat();
      }
      return finish();
    });

  const success = await execute(
    resilientTask,
    [new TestPot()],
    {
      kv: { inMemory: true },
      logger: { enable: false },
    },
  );

  assertEquals(success, true);
  assertEquals(attemptCount >= 2, true);
});
