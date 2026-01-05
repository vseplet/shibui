# SHIBUI

Universal workflow automation engine for Deno.

[![JSR](https://jsr.io/badges/@vseplet/shibui)](https://jsr.io/@vseplet/shibui)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/vseplet/shibui)](https://github.com/vseplet/shibui/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/vseplet/shibui)](https://github.com/vseplet/shibui/commits/main)

> **Note:** This package is under active development. Contributions, feedback,
> and pull requests are welcome!

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
import { pot, shibui, task } from "@vseplet/shibui";

const Message = pot("Message", { text: "" });

const printTask = task(Message)
  .name("Print Message")
  .do(async ({ pots, log, finish }) => {
    log.inf(`Received: ${pots[0].data.text}`);
    return finish();
  });

const app = shibui();
app.register(printTask);
await app.start();
app.send(Message.create({ text: "Hello!" }));
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
import { context, execute, pot, shibui, task, workflow } from "@vseplet/shibui";
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

The `ttl` option controls how many times the pot can be resent if no task
handles it.

### Task

Task processes pots. It defines what data it accepts and how to handle it.

```typescript
const myTask = task(Counter)
  .name("My Task")
  .on(Counter, ({ pot, allow, deny }) => pot.data.value > 0 ? allow() : deny())
  .do(async ({ pots, log, finish }) => {
    log.inf(`Processing: ${pots[0].data.value}`);
    return finish();
  });
```

Tasks can depend on multiple pots. The task will wait until all required pots
arrive:

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

User.create(); // create with defaults
User.create({ age: 25 }); // create with overrides
User.name; // "User"
User.defaults; // { name: "", age: 0 }
User.ttl; // 3
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
- `.on(Pot, handler)` - custom trigger handler
- `.onRule(rule, Pot)` - built-in trigger rule
- `.do(handler)` - execution handler (required)
- `.retry({ attempts, interval, timeout })` - retry configuration
- `.catch(handler)` - error handler

The `.do()` handler receives:

- `pots` - array of input pots
- `ctx` - workflow context (in workflows)
- `log` - logger with methods: `trc`, `dbg`, `vrb`, `inf`, `wrn`, `err`, `flt`
- `send(pot, task?)` - send a pot to the system without completing current task (fire-and-forget)
- `finish()` - complete successfully
- `fail(reason)` - complete with error
- `next(task, dataOrPot?)` - chain to another task
  - `next(task)` - chain without data
  - `next(task, data)` - chain with data object (creates new pot with data)
  - `next(task, pot)` - chain with custom PotInstance
  - `next(task, PotFactory)` - chain with PotFactory (auto-creates with defaults)
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
await execute(myTask, [Counter], { logger: false });
```

### shibui(options?)

Creates an engine instance with sensible defaults.

```typescript
import { shibui } from "@vseplet/shibui";

// Minimal - uses Memory providers and ConsoleLogger
const app = shibui();

// Without logging
const app = shibui({ logger: false });

// With custom context
const app = shibui({ context: { apiKey: "..." } });

app.register(myTask);
await app.start();
app.send(Counter.create({ value: 1 }));
app.close();
```

## Configuration

### Providers

Shibui uses separate providers for queue (message passing) and storage
(persistence):

```typescript
import {
  DenoKvQueueProvider,
  DenoKvStorageProvider,
  MemoryQueueProvider,
  MemoryStorageProvider,
  shibui,
} from "@vseplet/shibui";

// Default: in-memory (data lost on restart)
const app = shibui();

// Persistent with Deno KV
const app = shibui({
  queue: new DenoKvQueueProvider("./data.db"),
  storage: new DenoKvStorageProvider("./data.db"),
});
```

With Deno KV storage, dependent tasks (tasks waiting for multiple pots) will
recover their state after a crash. If your process restarts, partially filled
slots are restored from the database.

### Queue Provider

Implement `QueueProvider` for custom message queue backends:

```typescript
import type { QueueProvider } from "@vseplet/shibui";

class RedisQueueProvider implements QueueProvider {
  async open() {/* connect */}
  close() {/* disconnect */}
  async enqueue(pot) {/* push to queue */}
  listen(handler) {/* subscribe to queue */}
}

shibui({ queue: new RedisQueueProvider() });
```

### Storage Provider

Implement `StorageProvider` for custom KV persistence:

```typescript
import type { StorageProvider } from "@vseplet/shibui";

class RedisStorageProvider implements StorageProvider {
  async open() {/* connect */}
  close() {/* disconnect */}
  async store(key, pot) {/* save pot */}
  async retrieve(key) {/* load pot */}
  async remove(key) {/* delete pot */}
  async *scan(prefix) {/* iterate pots */}
  async removeMany(keys) {/* batch delete */}
}

shibui({ storage: new RedisStorageProvider() });
```

Built-in providers:

- `MemoryQueueProvider` / `MemoryStorageProvider` — in-memory, for tests
- `DenoKvQueueProvider` / `DenoKvStorageProvider` — persistent, uses Deno KV

### Logging

```typescript
import { ConsoleLogger, shibui } from "@vseplet/shibui";

// Default: ConsoleLogger enabled
const app = shibui();

// Disable logging
const app = shibui({ logger: false });

// Configure logger level
const app = shibui({
  logger: new ConsoleLogger({ level: "info" }),
});
```

Log levels from lowest to highest: trace (1), debug (2), verbose (3), info (4),
warn (5), error (6), fatal (7).

### Logging Provider

Use a custom logging backend instead of the default console output:

```typescript
import { LuminousProvider, shibui } from "@vseplet/shibui";

// Use luminous logger with colored terminal output
const app = shibui({
  logger: new LuminousProvider(),
});
```

Create your own provider by implementing the `LoggingProvider` interface:

```typescript
import type { LogEntry, LoggingProvider } from "@vseplet/shibui";

class FileLoggingProvider implements LoggingProvider {
  log(entry: LogEntry): void {
    const line =
      `${entry.timestamp.toISOString()} [${entry.level}] ${entry.message}`;
    Deno.writeTextFileSync("app.log", line + "\n", { append: true });
  }
}

shibui({ logger: new FileLoggingProvider() });
```

Built-in providers:

- `ConsoleLogger` — default, simple console output
- `LuminousProvider` — colored terminal output via `@vseplet/luminous`

### Custom Context

Pass custom data available in all handlers:

```typescript
const app = shibui({
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
  .on(Counter, ({ pot, allow, deny }) => pot.data.value > 0 ? allow() : deny())
  .do(async ({ pots, log, finish }) => {
    log.inf(`Positive: ${pots[0].data.value}`);
    return finish();
  });
```

### Task Chaining

```typescript
import { pot, shibui, TriggerRule } from "@vseplet/shibui";

const Data = pot("Data", { value: 0 });
const app = shibui({ logger: false });

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

const app = shibui();
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

### Using send() - Fire-and-Forget

The `send()` method allows you to dispatch pots without blocking or completing the current task:

```typescript
const Notification = pot("Notification", { message: "" });
const Report = pot("Report", { content: "" });

const notifier = task(Notification)
  .name("Notifier")
  .do(async ({ pots, log, finish }) => {
    log.inf(`📝 ${pots[0].data.message}`);
    return finish();
  });

const processor = task(Report)
  .name("Processor")
  .do(async ({ pots, send, finish }) => {
    // Send notification without blocking
    send(Notification.create({ message: "Processing started" }), notifier);

    // Continue processing
    log.inf(`Processing: ${pots[0].data.content}`);

    // Send completion notification
    send(Notification.create({ message: "Processing complete" }), notifier);

    return finish();
  });
```

### Using next() with Different Pot Types

The `next()` method now supports multiple ways to pass data:

```typescript
const InputData = pot("InputData", { value: 0 });
const OutputData = pot("OutputData", { result: "" });

const step2 = task(OutputData)
  .name("Step 2")
  .onRule(TriggerRule.ForThisTask, OutputData)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Result: ${pots[0].data.result}`);
    return finish();
  });

const step1 = task(InputData)
  .name("Step 1")
  .onRule(TriggerRule.ForThisTask, InputData)
  .do(async ({ pots, next }) => {
    // Option 1: Pass data object (old way)
    // return next(step2, { value: pots[0].data.value * 2 });

    // Option 2: Pass PotInstance with custom data
    return next(step2, OutputData.create({ result: "custom value" }));

    // Option 3: Pass PotFactory (uses default data)
    // return next(step2, OutputData);
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

await execute(buildWorkflow, undefined, { logger: false });
```

### Runnable Examples

The `examples/` directory contains ready-to-run scripts:

```bash
# Basic task with conditional trigger
deno task example:simple-task

# Task chaining with next()
deno task example:task-chaining

# Minimal workflow
deno task example:simple-workflow

# Workflow with sequential tasks
deno task example:workflow-sequence

# Reusable shared task across workflows
deno task example:shared-task

# Task waiting for multiple pots
deno task example:dependent-task

# Retry and timeout configuration
deno task example:timeout-retry

# Custom context injection
deno task example:custom-context

# Provider configuration (Memory, DenoKV, logging)
deno task example:providers

# Multi-API aggregator with Telegram notification
deno task example:aggregator

# Using send() and next() with Pots
deno task example:send-next-pots
```

## License

[MIT](./LICENSE)
