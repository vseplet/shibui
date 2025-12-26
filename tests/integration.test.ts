import { assertEquals } from "jsr:@std/assert";
import {
  context,
  core,
  execute,
  pot,
  task,
  TriggerRule,
  workflow,
} from "$shibui";

const SimplePot = pot("SimplePot", { value: 0 }, { ttl: 100 });
const ChainPot = pot("ChainPot", { value: 0 }, { ttl: 1 });
const PotA = pot("PotA", { value: 1 });
const PotB = pot("PotB", { value: 2 });
const PotC = pot("PotC", { value: 3 });
const PotD = pot("PotD", { value: 4 });
const PotE = pot("PotE", { value: 5 });
const DataPot = pot("DataPot", { value: 0 });
const RetryPot = pot("RetryPot", { attempt: 0 }, { ttl: 5 });

// Context pots using context() factory
const BuildContext = context("BuildContext", {
  steps: [] as string[],
  status: "pending",
});
const ErrorContext = context("ErrorContext", { error: "" });

// Based on ex1.ts - simple task with trigger
Deno.test("Integration - simple task with conditional trigger", async () => {
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

  const res = await execute(mySimpleTask, [SimplePot.create({ value: 0.8 })], {
    storage: "memory",
    logging: false,
  });

  assertEquals(res, true);
  assertEquals(executed, true);
  assertEquals(testPassed, true);
});

// Based on ex2.ts - task chaining
Deno.test("Integration - task chain with data passing", async () => {
  const c = core({ storage: "memory", logging: false });

  const results: number[] = [];

  const task3 = c.task(ChainPot)
    .name("Task 3")
    .onRule(TriggerRule.ForThisTask, ChainPot)
    .do(async ({ pots, finish }) => {
      results.push(pots[0].data.value);
      return finish();
    });

  const task2 = c.task(ChainPot)
    .name("Task 2")
    .onRule(TriggerRule.ForThisTask, ChainPot)
    .do(async ({ pots, next }) => {
      results.push(pots[0].data.value);
      return next(task3, { value: pots[0].data.value + 1 });
    });

  const task1 = c.task(ChainPot)
    .name("Task 1")
    .onRule(TriggerRule.ForThisTask, ChainPot)
    .do(async ({ pots, next }) => {
      results.push(pots[0].data.value);
      return next(task2, { value: pots[0].data.value + 1 });
    });

  c.register(task1);
  c.register(task2);
  c.register(task3);

  await c.start();
  c.send(ChainPot, task1);

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
    storage: "memory",
    logging: false,
  });

  assertEquals(res, true);
  assertEquals(results, [1, 2]);
});

// Based on ex6.ts - dependent task with 5 pots
Deno.test("Integration - five slot dependent task", async () => {
  const c = core({ storage: "memory", logging: false });

  let sum = 0;

  const mySimpleTask = task(PotA, PotB, PotC, PotD, PotE)
    .name("Simple Task")
    .do(async ({ finish, pots }) => {
      sum = pots.reduce((acc, pot) => acc + pot.data.value, 0);
      return finish();
    });

  c.register(mySimpleTask);
  await c.start();

  c.send(PotA);
  c.send(PotB);
  c.send(PotC);
  c.send(PotD);
  c.send(PotE);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(sum, 15);

  c.close();
});

// Complex workflow with context mutation
Deno.test("Integration - workflow with context mutation", async () => {
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
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});

// Error handling and fail propagation
Deno.test("Integration - error handling in workflow", async () => {
  let failHandlerCalled = false;

  const errorWorkflow = workflow(ErrorContext)
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
    storage: "memory",
    logging: false,
  });

  assertEquals(success, false);
  assertEquals(failHandlerCalled, true);
});

// Parallel next() to multiple tasks
Deno.test("Integration - parallel task execution", async () => {
  const c = core({ storage: "memory", logging: false });

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
  c.send(DataPot, starter);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(results.includes("Start"), true);
  assertEquals(results.includes("A"), true);
  assertEquals(results.includes("B"), true);

  c.close();
});

// Timeout and retry
Deno.test("Integration - retry mechanism", async () => {
  let attemptCount = 0;

  const resilientTask = task(RetryPot)
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

  const success = await execute(resilientTask, [RetryPot], {
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
  assertEquals(attemptCount >= 2, true);
});
