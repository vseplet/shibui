import { assertEquals } from "jsr:@std/assert";
import { context, execute, pot, workflow } from "$shibui";

// Context pots using context() factory - simple and type-safe!
const MyContext = context("MyContext", { count: 0 });
const StepContext = context("StepContext", { step: 0 });
const ValuesContext = context("ValuesContext", { values: [] as number[] });
const InitialContext = context("InitialContext", { initial: 0 });
const SourceContext = context("SourceContext", { source: "" });
const ValueContext = context("ValueContext", { value: 0 });

// Regular pots using pot() factory
const TriggerPot = pot("TriggerPot", { value: 0 });
const PotA = pot("PotA", { a: 0 });
const PotB = pot("PotB", { b: 0 });
const DataPot = pot("DataPot", { value: 0 });

Deno.test("Workflow - simple workflow creation", () => {
  const wf = workflow(MyContext)
    .name("Test Workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  wf.build();

  assertEquals(wf.workflow.name, "Test Workflow");
  assertEquals(wf.workflow.tasks.length, 1);
  assertEquals(wf.workflow.firstTaskName, "[Test Workflow] Task 1");
});

Deno.test("Workflow - two task sequence", async () => {
  const wf = workflow(StepContext)
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
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});

Deno.test("Workflow - context shared across tasks", async () => {
  const wf = workflow(ValuesContext)
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
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});

Deno.test("Workflow - custom trigger handler", async () => {
  const wf = workflow(InitialContext)
    .name("Custom Trigger")
    .on(TriggerPot, (p) => {
      const triggerPot = p as typeof TriggerPot._class.prototype;
      return new InitialContext._class().init({
        initial: triggerPot.data.value * 2,
      });
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

  const success = await execute(wf, [TriggerPot.create({ value: 10 })], {
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});

Deno.test("Workflow - multiple triggers", () => {
  const wf = workflow(SourceContext)
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
  const wf = workflow(MyContext)
    .name("Additional Pot")
    .sq(({ task }) => {
      const t1 = task(DataPot._class)
        .name("Task 1")
        .do(async ({ ctx, pots, finish }) => {
          ctx.data.count = pots[0].data.value;
          assertEquals(pots[0].data.value, 42);
          return finish();
        });
      return t1;
    });

  wf.build();

  assertEquals(wf.workflow.tasks[0].slotsCount, 2); // Context + DataPot
});

Deno.test("Workflow - default trigger on CoreStartPot", () => {
  const wf = workflow(ValueContext)
    .name("Auto Start")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  wf.build();

  assertEquals(wf.workflow.triggers["CoreStartPot"] !== undefined, true);
});

Deno.test("Workflow - workflow without explicit context", async () => {
  const wf = workflow()
    .name("No Context")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ ctx, finish }) => {
          assertEquals(ctx.type, "CONTEXT");
          return finish();
        });
      return t1;
    });

  const success = await execute(wf, undefined, {
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});

Deno.test("Workflow - task names include workflow prefix", () => {
  const wf = workflow(ValueContext)
    .name("MyWorkflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Step1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  wf.build();

  assertEquals(wf.workflow.tasks[0].name, "[MyWorkflow] Step1");
});

Deno.test("Workflow - type-safe context with context() factory", async () => {
  const OrderContext = context("OrderContext", {
    orderId: "",
    status: "pending" as "pending" | "processing" | "completed",
    items: [] as string[],
    total: 0,
  });

  const wf = workflow(OrderContext)
    .name("Order Processing")
    .sq(({ task }) => {
      const initOrder = task()
        .name("Init Order")
        .do(async ({ ctx, next }) => {
          ctx.data.orderId = "ORD-001";
          ctx.data.status = "processing";
          return next(addItems);
        });

      const addItems = task()
        .name("Add Items")
        .do(async ({ ctx, next }) => {
          ctx.data.items.push("item1", "item2");
          ctx.data.total = 100;
          return next(complete);
        });

      const complete = task()
        .name("Complete")
        .do(async ({ ctx, finish }) => {
          ctx.data.status = "completed";
          assertEquals(ctx.data.orderId, "ORD-001");
          assertEquals(ctx.data.status, "completed");
          assertEquals(ctx.data.items.length, 2);
          assertEquals(ctx.data.total, 100);
          return finish();
        });

      return initOrder;
    });

  const success = await execute(wf, undefined, {
    storage: "memory",
    logging: false,
  });

  assertEquals(success, true);
});
