# SHIBUI

**Universal workflow automation engine for Deno**

[![JSR](https://jsr.io/badges/@vseplet/shibui)](https://jsr.io/@vseplet/shibui)

> **Warning**: This package is under active development. API may change.

## Quick Start

```typescript
import { execute, pot, task } from "@vseplet/shibui";

// 1. Define data with pot()
const Message = pot("Message", { text: "" });

// 2. Create a task
const printTask = task(Message)
  .name("Print Message")
  .do(async ({ pots, log, finish }) => {
    log.inf(`Received: ${pots[0].data.text}`);
    return finish();
  });

// 3. Execute
await execute(printTask, [Message.create({ text: "Hello!" })]);
```

**Run with:**
```bash
deno run --allow-all --unstable-kv your_script.ts
```

---

## Installation

```bash
deno add jsr:@vseplet/shibui
```

```typescript
import { execute, pot, shibui, task, workflow } from "@vseplet/shibui";
```

---

## Core Concepts

### Pot

**Pot** is a data container. Create pots using the `pot()` factory:

```typescript
// Simple pot
const Counter = pot("Counter", { value: 0 });

// With TTL (retry count)
const Message = pot("Message", { text: "" }, { ttl: 3 });

// Create instances
const instance = Counter.create({ value: 42 });
```

### Task

**Task** processes pots. Tasks have triggers, handlers, and result operations:

```typescript
const myTask = task(Counter)
  .name("My Task")
  .when(data => data.value > 0)      // Trigger condition
  .retry({ attempts: 3, timeout: 5000 })  // Retry config
  .do(async ({ pots, log, finish }) => {
    log.inf(`Processing: ${pots[0].data.value}`);
    return finish();
  })
  .catch(async (error) => {           // Error handler
    console.error(error.message);
  });
```

### Workflow

**Workflow** orchestrates tasks with shared context:

```typescript
const myWorkflow = workflow()
  .name("My Workflow")
  .sq(({ task }) => {
    const step2 = task()
      .name("Step 2")
      .do(async ({ ctx, finish }) => finish());

    const step1 = task()
      .name("Step 1")
      .do(async ({ ctx, next }) => next(step2));

    return step1;
  });
```

---

## API Reference

### pot(name, defaults, options?)

Create a pot factory:

```typescript
const User = pot("User", {
  name: "Anonymous",
  age: 0
}, { ttl: 3 });

// Methods
User.create()              // Create with defaults
User.create({ age: 25 })   // Create with overrides
User.name                  // "User"
User.defaults              // { name: "Anonymous", age: 0 }
User.ttl                   // 3
```

### task(...pots)

Create a task builder:

```typescript
// Single pot
task(Counter).name("Task").do(...)

// Multiple pots (dependent task - waits for all)
task(PotA, PotB, PotC).name("Combiner").do(...)
```

#### Task Builder Methods

| Method | Description |
|--------|-------------|
| `.name(string)` | Set task name (required) |
| `.when(predicate)` | Filter by data condition |
| `.on(Pot, handler)` | Custom trigger handler |
| `.onRule(rule, Pot)` | Built-in trigger rule |
| `.do(handler)` | Execution handler (required) |
| `.retry({ attempts, interval, timeout })` | Retry configuration |
| `.catch(handler)` | Error handler |

#### .when() - Simple Trigger

```typescript
task(Counter)
  .when(data => data.value > 0)  // Only execute if value > 0
  .do(...)
```

#### .do() Handler

```typescript
task(Counter)
  .do(async ({ pots, log, next, finish, fail, repeat }) => {
    // pots - array of input pots
    // log - logger (dbg, inf, wrn, err, etc.)

    // Return one of:
    return finish();              // Complete successfully
    return fail("reason");        // Complete with error
    return next(otherTask, data); // Chain to another task
    return repeat();              // Retry (uses TTL)
  });
```

#### .retry() - Resilience

```typescript
task(Counter)
  .retry({
    attempts: 3,      // Retry up to 3 times
    interval: 1000,   // Wait 1s between retries
    timeout: 5000     // Timeout after 5s
  })
  .do(...)
  .catch(async (error) => {
    // Called after all retries fail
  });
```

### execute(builder, pots?, options?)

Execute a task or workflow:

```typescript
// Execute task with pot factory (auto-creates instance)
await execute(myTask, [Counter]);

// Execute with custom data
await execute(myTask, [Counter.create({ value: 42 })]);

// Execute workflow
await execute(myWorkflow);

// With options
await execute(myTask, [Counter], {
  kv: { inMemory: true },
  logger: { enable: false }
});
```

### shibui(options?)

Create an engine instance for manual control:

```typescript
const app = shibui({
  kv: {
    inMemory: true     // Use in-memory storage
    // path: "./data"  // Or persistent path
  },
  logger: {
    enable: true       // Enable/disable logging
  },
  spicy: {             // Custom data for handlers
    apiKey: "..."
  }
});

app.settings.DEFAULT_LOGGING_LEVEL = 4;  // Set log level (INFO)

app.register(myTask);
await app.start();
app.send(Counter, myTask);  // Auto-creates pot instance
```

### workflow()

Create a workflow:

```typescript
import { workflow } from "@vseplet/shibui";

const myWorkflow = workflow()
  .name("My Workflow")
  .sq(({ task }) => {
    const done = task()
      .name("Done")
      .do(async ({ ctx, log, finish }) => {
        log.inf(`Final: ${ctx.data.count}`);
        return finish();
      });

    const increment = task()
      .name("Increment")
      .do(async ({ ctx, next }) => {
        ctx.data.count = (ctx.data.count || 0) + 1;
        return next(done);
      });

    return increment;
  });
```

---

## Examples

### Task Chaining

```typescript
import { pot, shibui, TriggerRule } from "@vseplet/shibui";

const Data = pot("Data", { value: 0 }, { ttl: 1 });

const app = shibui();

const step3 = app.task(Data)
  .name("Step 3")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, log, finish }) => {
    log.inf(`Final: ${pots[0].data.value}`);
    return finish();
  });

const step2 = app.task(Data)
  .name("Step 2")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, next }) => {
    return next(step3, { value: pots[0].data.value + 1 });
  });

const step1 = app.task(Data)
  .name("Step 1")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, next }) => {
    return next(step2, { value: pots[0].data.value + 1 });
  });

app.register(step1);
app.register(step2);
app.register(step3);

await app.start();
app.send(Data, step1);  // Output: Final: 3
```

### Dependent Task (Multiple Inputs)

```typescript
const PotA = pot("PotA", { value: 1 });
const PotB = pot("PotB", { value: 2 });
const PotC = pot("PotC", { value: 3 });

// Task waits for ALL pots before executing
const combiner = task(PotA, PotB, PotC)
  .name("Combiner")
  .do(async ({ pots, log, finish }) => {
    const sum = pots.reduce((acc, p) => acc + p.data.value, 0);
    log.inf(`Sum: ${sum}`);  // Sum: 6
    return finish();
  });

const app = shibui();
app.register(combiner);
await app.start();

// Send pots separately
app.send(PotA);
app.send(PotB);
app.send(PotC);  // Task executes now
```

### Conditional Execution

```typescript
const Counter = pot("Counter", { value: Math.random() });

const conditionalTask = task(Counter)
  .name("Conditional Task")
  .when(data => data.value > 0.5)  // Only runs ~50% of time
  .do(async ({ pots, log, finish }) => {
    log.inf(`Value ${pots[0].data.value} passed the check!`);
    return finish();
  });

await execute(conditionalTask, [Counter]);
```

### Retry with Timeout

```typescript
const Job = pot("Job", { id: 0 });

const resilientTask = task(Job)
  .name("Resilient Task")
  .retry({
    attempts: 3,
    interval: 2000,
    timeout: 5000
  })
  .do(async ({ pots, log, finish }) => {
    log.inf(`Processing job ${pots[0].data.id}`);
    // This will timeout and retry
    await new Promise(r => setTimeout(r, 10000));
    return finish();
  })
  .catch(async (error) => {
    console.error(`Job failed: ${error.message}`);
  });
```

### Task Pipelines

```typescript
import { chain, pot, task } from "@vseplet/shibui";

const Counter = pot("Counter", { value: 0 });

// chain() - create task pipelines
const pipeline = chain(
  task(Counter).name("Start").do(({ finish }) => finish()),
  task(Counter).name("Process").do(({ finish }) => finish()),
  task(Counter).name("End").do(({ finish }) => finish())
);

console.log(pipeline.name);  // "Chain[Start -> Process -> End]"
```

---

## Configuration

```typescript
const app = shibui({
  kv: {
    inMemory: true,    // Use in-memory storage (default: false)
    // path: "./data"  // Persistent storage path
  },
  logger: {
    enable: true       // Enable logging (default: true)
  },
  spicy: {             // Custom data available in all handlers
    apiKey: "secret",
    config: { ... }
  }
});

// Set minimum log level (messages below this level are filtered)
app.settings.DEFAULT_LOGGING_LEVEL = 4;  // INFO
```

### Log Levels

| Level | Name | Method |
|-------|------|--------|
| 0 | UNKNOWN | - |
| 1 | TRACE | `log.trc()` |
| 2 | DEBUG | `log.dbg()` |
| 3 | VERBOSE | `log.vrb()` |
| 4 | INFO | `log.inf()` |
| 5 | WARN | `log.wrn()` |
| 6 | ERROR | `log.err()` |
| 7 | FATAL | `log.flt()` |

> **Note:** Only messages with level >= `DEFAULT_LOGGING_LEVEL` are displayed.

---

## License

CC BY-NC 3.0 - Copyright 2023-2025 Vsevolod Plentev
