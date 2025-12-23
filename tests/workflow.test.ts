import { assertEquals } from "jsr:@std/assert";
import { workflow, execute, ContextPot, InternalPot, CoreStartPot } from "$shibui";

Deno.test("Workflow - simple workflow creation", () => {
  class MyContext extends ContextPot<{ count: number }> {
    data = { count: 0 };
  }

  const wf = workflow(MyContext)
    .name("Test Workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  assertEquals(wf.workflow.name, "Test Workflow");
  assertEquals(wf.workflow.tasks.length, 1);
  assertEquals(wf.workflow.firstTaskName, "[Test Workflow] Task 1");
});

Deno.test("Workflow - two task sequence", async () => {
  class MyContext extends ContextPot<{ step: number }> {
    data = { step: 0 };
  }

  const wf = workflow(MyContext)
    .name("Two Step")
    .sq(({ task }) => {
      const t1 = task()
        .name("Step 1")
        .do(async ({ ctx, next }) => {
          ctx.data.step = 1;
          return next(t2);
        });

      const t2 = task()
        .name("Step 2")
        .do(async ({ ctx, finish }) => {
          ctx.data.step = 2;
          return finish();
        });

      return t1;
    });

  const success = await execute(wf, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
});

Deno.test("Workflow - context shared across tasks", async () => {
  class MyContext extends ContextPot<{ values: number[] }> {
    data = { values: [] };
  }

  const wf = workflow(MyContext)
    .name("Shared Context")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ ctx, next }) => {
          ctx.data.values.push(1);
          return next(t2);
        });

      const t2 = task()
        .name("Task 2")
        .do(async ({ ctx, next }) => {
          ctx.data.values.push(2);
          return next(t3);
        });

      const t3 = task()
        .name("Task 3")
        .do(async ({ ctx, finish }) => {
          ctx.data.values.push(3);
          assertEquals(ctx.data.values, [1, 2, 3]);
          return finish();
        });

      return t1;
    });

  const success = await execute(wf, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
});

Deno.test("Workflow - custom trigger handler", async () => {
  class MyContext extends ContextPot<{ initial: number }> {
    data = { initial: 0 };
  }

  class TriggerPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const wf = workflow(MyContext)
    .name("Custom Trigger")
    .on(TriggerPot, ({ pot }) => {
      return new MyContext().init({ initial: pot.data.value * 2 });
    })
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ ctx, finish }) => {
          assertEquals(ctx.data.initial, 20); // 10 * 2
          return finish();
        });
      return t1;
    });

  const success = await execute(
    wf,
    [new TriggerPot().init({ value: 10 })],
    {
      kv: { inMemory: true },
      logger: { enable: false },
    },
  );

  assertEquals(success, true);
});

Deno.test("Workflow - multiple triggers", () => {
  class MyContext extends ContextPot<{ source: string }> {
    data = { source: "" };
  }

  class PotA extends InternalPot<{ a: number }> {
    data = { a: 0 };
  }
  class PotB extends InternalPot<{ b: number }> {
    data = { b: 0 };
  }

  const wf = workflow(MyContext)
    .name("Multi Trigger")
    .triggers(PotA, PotB)
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  assertEquals(Object.keys(wf.workflow.triggers).length, 2);
  assertEquals(wf.workflow.triggers["PotA"] !== undefined, true);
  assertEquals(wf.workflow.triggers["PotB"] !== undefined, true);
});

Deno.test("Workflow - workflow task with additional pot", async () => {
  class MyContext extends ContextPot<{ count: number }> {
    data = { count: 0 };
  }

  class DataPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const wf = workflow(MyContext)
    .name("Additional Pot")
    .sq(({ task }) => {
      const t1 = task(DataPot)
        .name("Task 1")
        .do(async ({ ctx, pots, finish }) => {
          // ctx is MyContext, pots[0] is DataPot
          ctx.data.count = pots[0].data.value;
          assertEquals(pots[0].data.value, 42);
          return finish();
        });
      return t1;
    });

  // Note: This test shows structure but won't execute properly
  // as workflow tasks with additional pots need special handling
  assertEquals(wf.workflow.tasks[0].slotsCount, 2); // Context + DataPot
});

Deno.test("Workflow - default trigger on CoreStartPot", () => {
  class MyContext extends ContextPot<{ value: number }> {
    data = { value: 0 };
  }

  const wf = workflow(MyContext)
    .name("Auto Start")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  // Should have CoreStartPot trigger by default
  assertEquals(wf.workflow.triggers["CoreStartPot"] !== undefined, true);
});

Deno.test("Workflow - workflow without explicit context", async () => {
  const wf = workflow()
    .name("No Context")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ ctx, finish }) => {
          // ctx should be auto-generated ContextPot
          assertEquals(ctx.type, "CONTEXT");
          return finish();
        });
      return t1;
    });

  const success = await execute(wf, undefined, {
    kv: { inMemory: true },
    logger: { enable: false },
  });

  assertEquals(success, true);
});

Deno.test("Workflow - task names include workflow prefix", () => {
  class MyContext extends ContextPot<{ value: number }> {
    data = { value: 0 };
  }

  const wf = workflow(MyContext)
    .name("MyWorkflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Step1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  assertEquals(wf.workflow.tasks[0].name, "[MyWorkflow] Step1");
});
