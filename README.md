# SHIBUI

**Universal workflow automation engine for Deno**

[![JSR](https://jsr.io/badges/@vseplet/shibui)](https://jsr.io/@vseplet/shibui)

> **Warning**: This package is under active development. API may change frequently.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
  - [Pot](#pot)
  - [Task](#task)
  - [Workflow](#workflow)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Pot Types](#pot-types)
  - [Task Builder](#task-builder)
  - [Workflow Builder](#workflow-builder)
  - [Core](#core)
  - [Events](#events)
- [Advanced Usage](#advanced-usage)
  - [Dependent Tasks (Multiple Inputs)](#dependent-tasks-multiple-inputs)
  - [Task Chaining](#task-chaining)
  - [Shared Tasks](#shared-tasks)
  - [Retry and Timeout](#retry-and-timeout)
  - [Custom Context](#custom-context)
- [Configuration](#configuration)
- [License](#license)

---

## Overview

Shibui is an event-driven workflow automation engine built on Deno. It provides a declarative DSL for defining tasks and workflows that process data through a system of "pots" (data containers).

**Key Features:**

- Event-driven architecture with Deno KV message queue
- Type-safe DSL for task and workflow definition
- Flexible trigger system with built-in rules
- Support for dependent tasks (multiple input sources)
- Workflow context for shared state
- Built-in retry mechanism with TTL
- Comprehensive logging system

---

## Installation

```typescript
import { task, workflow, execute, core } from "jsr:@vseplet/shibui@0.4.43/core";
import { InternalPot, ExternalPot, ContextPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";
```

**Required Deno flags:**

```bash
deno run --allow-all --unstable-broadcast-channel --unstable-kv your_script.ts
```

---

## Core Concepts

### Pot

**Pot** (from Japanese 壺 - "pot, jar") is the fundamental data container in Shibui. Every piece of data flowing through the system is wrapped in a Pot.

```typescript
type TPot = {
  toc: number;      // Time of creation (timestamp)
  uuid: string;     // Unique identifier
  name: string;     // Class name (auto-generated)
  type: TPotType;   // EXTERNAL | INTERNAL | CONTEXT | SYSTEM | UNKNOWN
  from: {           // Origin
    workflow: string;
    task: string;
  };
  to: {             // Destination
    workflow: string;
    task: string;
  };
  ttl: number;      // Time-to-live for retries
  data: unknown;    // Payload data
};
```

#### Pot Types

| Type | Purpose | Usage |
|------|---------|-------|
| `InternalPot` | Data flowing between tasks within the system | Default for most use cases |
| `ExternalPot` | Data coming from external sources (HTTP, webhooks) | Integration points |
| `ContextPot` | Shared state within a workflow | Workflow-wide data |
| `SystemPot` | Internal system events | Reserved for core |
| `CoreStartPot` | Emitted when core starts | Trigger workflows on startup |

### Task

**Task** is a unit of work that processes one or more pots. Tasks have:

- **Triggers** (`on`) — conditions that determine when to execute
- **Handler** (`do`) — the actual work to perform
- **Result operations** — what happens after execution (next, finish, fail, repeat)

### Workflow

**Workflow** is an orchestrated sequence of tasks sharing a common context. Workflows provide:

- Shared context pot across all tasks
- Automatic task registration
- Sequential task execution via `next()`
- Workflow-level events (started, finished, failed)

---

## Quick Start

### Simple Task

```typescript
import { task, execute } from "jsr:@vseplet/shibui@0.4.43/core";
import { InternalPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";

// 1. Define a Pot with your data structure
class MessagePot extends InternalPot<{ text: string }> {
  data = { text: "" };
}

// 2. Create a task that processes this pot
const printTask = task(MessagePot)
  .name("Print Message")
  .do(async ({ pots, log, finish }) => {
    log.inf(`Received: ${pots[0].data.text}`);
    return finish();
  });

// 3. Execute with input data
await execute(printTask, [new MessagePot().init({ text: "Hello, Shibui!" })]);
```

### Simple Workflow

```typescript
import { workflow, execute } from "jsr:@vseplet/shibui@0.4.43/core";
import { ContextPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";

// 1. Define workflow context
class CounterCtx extends ContextPot<{ count: number }> {
  data = { count: 0 };
}

// 2. Create workflow with task sequence
const counterWorkflow = workflow(CounterCtx)
  .name("Counter Workflow")
  .sq(({ task }) => {
    const increment = task()
      .name("Increment")
      .do(async ({ ctx, log, next }) => {
        ctx.data.count += 1;
        log.inf(`Count: ${ctx.data.count}`);
        return next(print);
      });

    const print = task()
      .name("Print Result")
      .do(async ({ ctx, log, finish }) => {
        log.inf(`Final count: ${ctx.data.count}`);
        return finish();
      });

    return increment; // First task to execute
  });

// 3. Execute workflow
await execute(counterWorkflow);
```

---

## API Reference

### Pot Types

#### InternalPot

For data flowing within the system:

```typescript
import { InternalPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";

class UserPot extends InternalPot<{
  id: number;
  name: string;
  email: string;
}> {
  // Default TTL (retries)
  override ttl = 3;

  // Default data
  data = {
    id: 0,
    name: "",
    email: "",
  };
}

// Usage
const user = new UserPot().init({
  id: 1,
  name: "John",
  email: "john@example.com",
});
```

#### ExternalPot

For data from external sources:

```typescript
import { ExternalPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";

class WebhookPot extends ExternalPot<{
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}> {
  data = {
    payload: {},
    headers: {},
  };
}
```

#### ContextPot

For workflow shared state:

```typescript
import { ContextPot } from "jsr:@vseplet/shibui@0.4.43/core/pots";

class PipelineCtx extends ContextPot<{
  startedAt: number;
  steps: string[];
  errors: string[];
}> {
  data = {
    startedAt: Date.now(),
    steps: [],
    errors: [],
  };
}
```

#### Pot Methods

| Method | Description |
|--------|-------------|
| `init(data)` | Initialize pot with partial data |
| `copy(data?)` | Create a deep copy, optionally with modified data |
| `deserialize(json)` | Restore pot from JSON |

---

### Task Builder

#### Creating Tasks

```typescript
import { task } from "jsr:@vseplet/shibui@0.4.43/core";

// Single pot task
const t1 = task(PotA)
  .name("Task Name")
  .do(async ({ pots, log, finish }) => {
    // pots[0] is PotA
    return finish();
  });

// Multiple pots task (dependent)
const t2 = task(PotA, PotB, PotC)
  .name("Dependent Task")
  .do(async ({ pots, log, finish }) => {
    // pots[0] is PotA, pots[1] is PotB, pots[2] is PotC
    return finish();
  });
```

#### Builder Methods

| Method | Description |
|--------|-------------|
| `.name(string)` | Set task name (required) |
| `.on(Pot, handler?)` | Add trigger with optional handler |
| `.onRule(rule, Pot)` | Add trigger with built-in rule |
| `.do(handler)` | Set execution handler (required) |
| `.fail(handler)` | Set error handler |
| `.attempts(n)` | Set retry attempts (default: 1) |
| `.interval(ms)` | Set retry interval in milliseconds |
| `.timeout(ms)` | Set execution timeout in milliseconds |
| `.build()` | Build task (called automatically) |

#### Trigger Handlers (on)

```typescript
task(MessagePot)
  .name("Conditional Task")
  .on(MessagePot, ({ pot, log, allow, deny }) => {
    // pot - the incoming pot
    // log - logger instance
    // allow(index?) - accept pot (optionally to specific slot)
    // deny() - reject pot

    if (pot.data.text.length > 0) {
      return allow();
    }
    return deny();
  })
  .do(/* ... */);
```

#### Built-in Trigger Rules (onRule)

| Rule | Description |
|------|-------------|
| `"ForThisTask"` | Accept only pots explicitly sent to this task |
| `"ForAnyTask"` | Accept pots sent to any known task |
| `"ForUnknown"` | Accept pots with unknown destination |

```typescript
task(DataPot)
  .name("Targeted Handler")
  .onRule("ForThisTask", DataPot)
  .do(/* ... */);
```

#### Do Handler

```typescript
task(InputPot)
  .name("Processor")
  .do(async ({ pots, log, next, finish, fail, repeat }) => {
    // pots - array of input pots
    // log - logger with methods: dbg, trc, vrb, inf, wrn, err, flt

    // Result operations:
    // next(taskBuilder, data?) - send to next task
    // finish() - complete successfully
    // fail(reason?) - complete with error
    // repeat() - retry this task

    try {
      const result = await processData(pots[0].data);
      return next(nextTask, { result });
    } catch (e) {
      return fail(e.message);
    }
  });
```

#### Result Operations

| Operation | Description |
|-----------|-------------|
| `next(task, data?)` | Send pot to another task with optional data |
| `next([t1, t2], data?)` | Send to multiple tasks |
| `finish()` | Complete task/workflow successfully |
| `fail(reason?)` | Complete with error |
| `repeat()` | Retry current task (uses TTL) |

---

### Workflow Builder

#### Creating Workflows

```typescript
import { workflow } from "jsr:@vseplet/shibui@0.4.43/core";

const myWorkflow = workflow(MyContextPot)
  .name("My Workflow")
  .on(TriggerPot, (pot) => new MyContextPot().init({ /* from trigger */ }))
  .sq(({ task }) => {
    // Define tasks here
    const first = task()
      .name("First")
      .do(async ({ ctx, next }) => next(second));

    const second = task()
      .name("Second")
      .do(async ({ ctx, finish }) => finish());

    return first; // Return first task
  });
```

#### Builder Methods

| Method | Description |
|--------|-------------|
| `.name(string)` | Set workflow name (required) |
| `.on(Pot, handler?)` | Add trigger that creates context |
| `.triggers(...Pots)` | Add multiple triggers with default handler |
| `.sq(sequence)` | Define task sequence |
| `.build()` | Build workflow (called automatically) |

#### Sequence Function

The `.sq()` method receives an object with:

| Property | Description |
|----------|-------------|
| `task(...Pots)` | Create a workflow task (context is first slot) |
| `shared(builder)` | Register an external task builder |

```typescript
.sq(({ task, shared }) => {
  // Inside workflow tasks, ctx is automatically available
  const t1 = task()
    .name("Task 1")
    .do(async ({ ctx, log, next }) => {
      // ctx is the ContextPot
      ctx.data.step = "processed";
      return next(t2);
    });

  const t2 = task(ExtraPot)  // Can also accept additional pots
    .name("Task 2")
    .do(async ({ ctx, pots, finish }) => {
      // ctx is ContextPot, pots[0] is ExtraPot
      return finish();
    });

  // Use shared for reusable task functions
  const t0 = shared(createReusableTask(MyContextPot, t1));

  return t0;
});
```

---

### Core

#### Creating Core Instance

```typescript
import core from "jsr:@vseplet/shibui@0.4.43/core";

const c = core({
  kv: {
    inMemory: true,  // Use in-memory KV (for testing)
    // path: "./data.db"  // Or persistent path
  },
  logger: {
    enable: true,
  },
});
```

#### Core Methods

| Method | Description |
|--------|-------------|
| `register(builder)` | Register task or workflow |
| `start()` | Start the core (async) |
| `send(pot, task?)` | Send pot to queue (optionally to specific task) |
| `task(...Pots)` | Create task builder |
| `workflow(ContextPot)` | Create workflow builder |
| `createLogger(options)` | Create logger instance |

#### Manual Registration

```typescript
const c = core();

// Create and register tasks
const t1 = c.task(PotA).name("Task 1").do(/* ... */);
const t2 = c.task(PotA).name("Task 2").do(/* ... */);

c.register(t1);
c.register(t2);

// Start and send data
await c.start();
c.send(new PotA(), t1);
```

#### Execute Helper

For simple execution without manual core management:

```typescript
import { execute } from "jsr:@vseplet/shibui@0.4.43/core";

// Execute task
const success = await execute(taskBuilder, [new InputPot()]);

// Execute workflow (triggers on CoreStartPot by default)
const success = await execute(workflowBuilder);

// With options
const success = await execute(taskBuilder, pots, {
  kv: { inMemory: true },
  logger: { enable: false },
});
```

---

### Events

Shibui emits events through `BroadcastChannel`:

#### Core Events

| Event | Description |
|-------|-------------|
| `TaskFinishedEvent` | Task completed successfully |
| `TaskFailedEvent` | Task failed |
| `WorkflowStartedEvent` | Workflow started |
| `WorkflowFinishedEvent` | Workflow completed |
| `WorkflowFailedEvent` | Workflow failed |

#### Log Events

| Level | Method | Description |
|-------|--------|-------------|
| TRACE | `log.trc()` | Detailed tracing |
| DEBUG | `log.dbg()` | Debug information |
| VERBOSE | `log.vrb()` | Verbose output |
| INFO | `log.inf()` | General information |
| WARN | `log.wrn()` | Warnings |
| ERROR | `log.err()` | Errors |
| FATAL | `log.flt()` | Fatal errors |

---

## Advanced Usage

### Dependent Tasks (Multiple Inputs)

Tasks can wait for multiple pots before executing:

```typescript
class DataA extends InternalPot<{ a: number }> {
  data = { a: 0 };
}

class DataB extends InternalPot<{ b: number }> {
  data = { b: 0 };
}

class DataC extends InternalPot<{ c: number }> {
  data = { c: 0 };
}

// Task waits for all three pots
const combiner = task(DataA, DataB, DataC)
  .name("Combiner")
  .do(async ({ pots, log, finish }) => {
    const [a, b, c] = pots;
    const sum = a.data.a + b.data.b + c.data.c;
    log.inf(`Sum: ${sum}`);
    return finish();
  });

// Send pots separately - task executes when all arrive
const c = core();
c.register(combiner);
await c.start();

c.send(new DataA().init({ a: 1 }));
c.send(new DataB().init({ b: 2 }));
c.send(new DataC().init({ c: 3 }));
// Task executes with sum = 6
```

### Task Chaining

```typescript
const c = core();

const step1 = c.task(DataPot)
  .name("Step 1")
  .onRule("ForThisTask", DataPot)
  .do(async ({ pots, next }) => {
    return next(step2, { value: pots[0].data.value + 1 });
  });

const step2 = c.task(DataPot)
  .name("Step 2")
  .onRule("ForThisTask", DataPot)
  .do(async ({ pots, next }) => {
    return next(step3, { value: pots[0].data.value + 1 });
  });

const step3 = c.task(DataPot)
  .name("Step 3")
  .onRule("ForThisTask", DataPot)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Final value: ${pots[0].data.value}`);
    return finish();
  });

c.register(step1);
c.register(step2);
c.register(step3);

await c.start();
c.send(new DataPot().init({ value: 0 }), step1);
// Output: Final value: 3
```

### Shared Tasks

Create reusable task factories:

```typescript
// Reusable task factory
const createValidator = <CTX extends ContextPot<{ valid: boolean }>>(
  ctxPot: new () => CTX,
  nextTask: TaskBuilder<{}, [CTX], CTX>,
) =>
  task<[CTX], CTX>(ctxPot)
    .name("Validator")
    .do(async ({ ctx, log, next, fail }) => {
      if (ctx.data.valid) {
        return next(nextTask);
      }
      return fail("Validation failed");
    });

// Use in workflow
const myWorkflow = workflow(MyCtx)
  .name("Pipeline")
  .sq(({ task, shared }) => {
    const process = task()
      .name("Process")
      .do(async ({ ctx, finish }) => finish());

    const validate = shared(createValidator(MyCtx, process));

    return validate;
  });
```

### Retry and Timeout

```typescript
const resilientTask = task(DataPot)
  .name("Resilient Task")
  .attempts(3)        // Retry up to 3 times
  .interval(1000)     // Wait 1s between retries
  .timeout(5000)      // Timeout after 5s
  .do(async ({ pots, log, finish, repeat }) => {
    try {
      await riskyOperation(pots[0].data);
      return finish();
    } catch (e) {
      log.wrn(`Attempt failed: ${e.message}`);
      return repeat(); // Will retry if attempts remain
    }
  })
  .fail(async (error) => {
    console.error(`Task failed after all retries: ${error.message}`);
  });
```

### Custom Context

```typescript
class BuildContext extends ContextPot<{
  repository: string;
  branch: string;
  commit: string;
  status: "pending" | "building" | "success" | "failed";
  artifacts: string[];
  errors: string[];
}> {
  data = {
    repository: "",
    branch: "",
    commit: "",
    status: "pending" as const,
    artifacts: [],
    errors: [],
  };
}

const buildPipeline = workflow(BuildContext)
  .name("Build Pipeline")
  .on(WebhookPot, ({ pot }) => {
    return new BuildContext().init({
      repository: pot.data.payload.repository,
      branch: pot.data.payload.branch,
      commit: pot.data.payload.commit,
    });
  })
  .sq(({ task }) => {
    const checkout = task()
      .name("Checkout")
      .do(async ({ ctx, log, next }) => {
        ctx.data.status = "building";
        log.inf(`Checking out ${ctx.data.repository}@${ctx.data.branch}`);
        return next(build);
      });

    const build = task()
      .name("Build")
      .do(async ({ ctx, log, next, fail }) => {
        try {
          // Build logic here
          ctx.data.artifacts.push("dist/bundle.js");
          return next(deploy);
        } catch (e) {
          ctx.data.status = "failed";
          ctx.data.errors.push(e.message);
          return fail(e.message);
        }
      });

    const deploy = task()
      .name("Deploy")
      .do(async ({ ctx, log, finish }) => {
        ctx.data.status = "success";
        log.inf(`Deployed ${ctx.data.artifacts.length} artifacts`);
        return finish();
      });

    return checkout;
  });
```

---

## Configuration

### Core Options

```typescript
type TCoreOptions = {
  mode?: "simple" | "default";  // Execution mode
  kv?: {
    inMemory?: boolean;         // Use in-memory KV storage
    path?: string;              // Path for persistent KV storage
  };
  logger?: {
    enable: boolean;            // Enable/disable logging
  };
  spicy?: object;               // Custom data available in handlers
};
```

### Logger Settings

```typescript
const c = core();
c.settings.DEFAULT_LOGGING_LEVEL = 2; // DEBUG level

// Levels:
// 0 - UNKNOWN
// 1 - TRACE
// 2 - DEBUG
// 3 - VERBOSE
// 4 - INFO
// 5 - WARN
// 6 - ERROR
// 7 - FATAL
```

---

## License

CC BY-NC 3.0 (Creative Commons Attribution-NonCommercial 3.0 Unported)

Copyright 2023-2024 Vsevolod Plentev

---

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
