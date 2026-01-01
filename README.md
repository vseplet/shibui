# SHIBUI

Universal workflow automation engine for Deno.

[![JSR](https://jsr.io/badges/@vseplet/shibui)](https://jsr.io/@vseplet/shibui)

> **Warning**: This package is under active development. API may change.

## Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Examples](#examples)
- [License](#license)

## Quick Start

```typescript
import { execute, pot, task } from "@vseplet/shibui";

const Message = pot("Message", { text: "" });

const printTask = task(Message)
  .name("Print Message")
  .do(async ({ pots, log, finish }) => {
    log.inf(`Received: ${pots[0].data.text}`);
    return finish();
  });

await execute(printTask, [Message.create({ text: "Hello!" })]);
```

Run with:

```bash
deno run --allow-all --unstable-kv your_script.ts
```

## Installation

```bash
deno add jsr:@vseplet/shibui
```

```typescript
import { context, core, execute, pot, task, workflow } from "@vseplet/shibui";
```

## Core Concepts

### When to Use What

Use **task** for:
- Simple data processing
- One-off operations
- Independent units of work

Use **task with multiple pots** for:
- Operations that need data from multiple sources
- Aggregation and combining data

Use **workflow** for:
- Multi-step processes with shared state
- Pipelines where steps depend on previous results
- Complex business logic with branching

### Pot

Pot is a typed data container. Think of it as a message or event payload.

```typescript
const Counter = pot("Counter", { value: 0 });
const Message = pot("Message", { text: "" }, { ttl: 3 });

const instance = Counter.create({ value: 42 });
```

The `ttl` option controls how many times the pot can be resent if no task handles it.

### Task

Task processes pots. It defines what data it accepts and how to handle it.

```typescript
const myTask = task(Counter)
  .name("My Task")
  .when((data) => data.value > 0)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Processing: ${pots[0].data.value}`);
    return finish();
  });
```

Tasks can depend on multiple pots. The task will wait until all required pots arrive:

```typescript
const combiner = task(PotA, PotB, PotC)
  .name("Combiner")
  .do(async ({ pots, finish }) => {
    // pots[0] is PotA, pots[1] is PotB, pots[2] is PotC
    return finish();
  });
```

### Workflow

Workflow orchestrates multiple tasks with shared typed context.

```typescript
const OrderContext = context("OrderContext", {
  orderId: "",
  status: "pending",
});

const orderWorkflow = workflow(OrderContext)
  .name("Order Processing")
  .sq(({ task }) => {
    const complete = task()
      .name("Complete")
      .do(async ({ ctx, finish }) => {
        ctx.data.status = "done";
        return finish();
      });

    const start = task()
      .name("Start")
      .do(async ({ ctx, next }) => {
        ctx.data.orderId = "ORD-001";
        return next(complete);
      });

    return start;
  });
```

## API Reference

### pot(name, defaults, options?)

Creates a pot factory.

```typescript
const User = pot("User", { name: "", age: 0 }, { ttl: 3 });

User.create();              // create with defaults
User.create({ age: 25 });   // create with overrides
User.name;                  // "User"
User.defaults;              // { name: "", age: 0 }
User.ttl;                   // 3
```

### context(name, defaults)

Creates a typed workflow context factory.

```typescript
const MyContext = context("MyContext", {
  items: [] as string[],
  total: 0,
});
```

### task(...pots)

Creates a task builder.

Methods:
- `.name(string)` - set task name (required)
- `.when(predicate)` - filter by data condition
- `.on(Pot, handler)` - custom trigger handler
- `.onRule(rule, Pot)` - built-in trigger rule
- `.do(handler)` - execution handler (required)
- `.retry({ attempts, interval, timeout })` - retry configuration
- `.catch(handler)` - error handler

The `.do()` handler receives:
- `pots` - array of input pots
- `ctx` - workflow context (in workflows)
- `log` - logger with methods: `trc`, `dbg`, `vrb`, `inf`, `wrn`, `err`, `flt`
- `finish()` - complete successfully
- `fail(reason)` - complete with error
- `next(task, data?)` - chain to another task
- `repeat()` - retry the task

### workflow(contextFactory?)

Creates a workflow builder.

```typescript
workflow(MyContext)
  .name("My Workflow")
  .sq(({ task }) => {
    // define tasks, return the first one
    return firstTask;
  });
```

### execute(builder, pots?, options?)

Executes a task or workflow.

```typescript
await execute(myTask, [Counter.create({ value: 42 })]);
await execute(myWorkflow);
await execute(myTask, [Counter], { storage: "memory", logging: false });
```

### core(options?)

Creates an engine instance for manual control.

```typescript
const app = core({
  storage: "memory",
  logging: false,
  context: { apiKey: "..." },
});

app.register(myTask);
await app.start();
app.send(Counter.create({ value: 1 }));
app.close();
```

## Configuration

### Storage

Storage controls where the engine keeps its queue and state.

```typescript
// In-memory (data lost on restart)
core({ storage: "memory" });

// File-based (persistent, survives restarts)
core({ storage: "./data/app.db" });
```

With file-based storage, dependent tasks (tasks waiting for multiple pots) will recover their state after a crash. If your process restarts, partially filled slots are restored from the database.

### Logging

```typescript
// Enable all logging
core({ logging: true });

// Disable logging
core({ logging: false });

// Configure level and sources
core({
  logging: {
    level: "info",  // trace, debug, verbose, info, warn, error, fatal
    sources: ["task", "workflow"],  // core, task, workflow, framework, plugin
  },
});
```

Log levels from lowest to highest: trace (1), debug (2), verbose (3), info (4), warn (5), error (6), fatal (7).

### Custom Context

Pass custom data available in all handlers:

```typescript
const app = core({
  context: {
    db: databaseConnection,
    config: appConfig,
  },
});

const myTask = app.task(Data)
  .name("Task")
  .do(async ({ db, config, finish }) => {
    // db and config are available here
    return finish();
  });
```

## Examples

### Basic Task

```typescript
import { execute, pot, task } from "@vseplet/shibui";

const Counter = pot("Counter", { value: 0 });

const increment = task(Counter)
  .name("Increment")
  .do(async ({ pots, log, finish }) => {
    log.inf(`Value: ${pots[0].data.value}`);
    return finish();
  });

await execute(increment, [Counter.create({ value: 10 })]);
```

### Conditional Execution

```typescript
const Counter = pot("Counter", { value: 0 });

const onlyPositive = task(Counter)
  .name("Only Positive")
  .when((data) => data.value > 0)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Positive: ${pots[0].data.value}`);
    return finish();
  });
```

### Task Chaining

```typescript
import { core, pot, TriggerRule } from "@vseplet/shibui";

const Data = pot("Data", { value: 0 });
const app = core({ storage: "memory", logging: false });

const step2 = app.task(Data)
  .name("Step 2")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Final: ${pots[0].data.value}`);
    return finish();
  });

const step1 = app.task(Data)
  .name("Step 1")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, next }) => {
    return next(step2, { value: pots[0].data.value + 1 });
  });

app.register(step1);
app.register(step2);
await app.start();
app.send(Data.create({ value: 1 }), step1);
```

### Dependent Task (Multiple Inputs)

```typescript
const PotA = pot("PotA", { a: 0 });
const PotB = pot("PotB", { b: 0 });

const combiner = task(PotA, PotB)
  .name("Combiner")
  .do(async ({ pots, log, finish }) => {
    const sum = pots[0].data.a + pots[1].data.b;
    log.inf(`Sum: ${sum}`);
    return finish();
  });

const app = core({ storage: "memory" });
app.register(combiner);
await app.start();

app.send(PotA.create({ a: 10 }));
app.send(PotB.create({ b: 20 }));
// Task executes when both pots arrive
```

### Retry with Timeout

```typescript
const Job = pot("Job", { id: 0 });

const resilientTask = task(Job)
  .name("Resilient Task")
  .retry({
    attempts: 3,
    interval: 2000,
    timeout: 5000,
  })
  .do(async ({ pots, log, finish }) => {
    log.inf(`Processing job ${pots[0].data.id}`);
    return finish();
  })
  .catch(async (error) => {
    console.error(`Job failed: ${error.message}`);
  });
```

### Simple Workflow

```typescript
import { context, execute, workflow } from "@vseplet/shibui";

const BuildContext = context("BuildContext", {
  steps: [] as string[],
});

const buildWorkflow = workflow(BuildContext)
  .name("Build")
  .sq(({ task }) => {
    const deploy = task()
      .name("Deploy")
      .do(async ({ ctx, log, finish }) => {
        ctx.data.steps.push("deploy");
        log.inf(`Steps: ${ctx.data.steps.join(" -> ")}`);
        return finish();
      });

    const build = task()
      .name("Build")
      .do(async ({ ctx, next }) => {
        ctx.data.steps.push("build");
        return next(deploy);
      });

    const checkout = task()
      .name("Checkout")
      .do(async ({ ctx, next }) => {
        ctx.data.steps.push("checkout");
        return next(build);
      });

    return checkout;
  });

await execute(buildWorkflow, undefined, { storage: "memory", logging: false });
```

## License

CC BY-NC 3.0 - Copyright 2023-2025 Vsevolod Plentev
