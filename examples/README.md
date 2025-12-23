# Shibui Examples

Comprehensive examples demonstrating Shibui workflow automation engine capabilities.

## Running Examples

```bash
# Run any example using deno task
deno task example:simple-task
deno task example:task-chaining
# ... etc

# Or run directly
deno run --allow-all --unstable-broadcast-channel --unstable-kv ./examples/01-simple-task-with-trigger.ts
```

## Examples Overview

### 01 - Simple Task with Trigger
**File:** `01-simple-task-with-trigger.ts`
**Run:** `deno task example:simple-task`

**Demonstrates:**
- Creating a simple task
- Using custom trigger handler with `allow()`/`deny()`
- Conditional execution based on data
- Logging inside triggers and handlers

**Key Concepts:**
```typescript
task(SimplePot)
  .on(SimplePot, ({ allow, deny, pot }) => {
    return pot.data.value > threshold ? allow() : deny();
  })
  .do(async ({ finish }) => finish())
```

---

### 02 - Task Chaining
**File:** `02-task-chaining.ts`
**Run:** `deno task example:task-chaining`

**Demonstrates:**
- Creating multiple tasks
- Using `next()` to chain tasks
- Using `onRule("ForThisTask")` to target specific tasks
- Passing data between tasks
- Manual task registration

**Key Concepts:**
```typescript
const task1 = c.task(Pot)
  .do(async ({ next }) => next(task2, { value: 1 }));

const task2 = c.task(Pot)
  .do(async ({ next }) => next(task3, { value: 2 }));
```

**Flow:** Task 1 → Task 2 → Task 3 (with data passing)

---

### 03 - Simple Workflow
**File:** `03-simple-workflow.ts`
**Run:** `deno task example:simple-workflow`

**Demonstrates:**
- Creating a workflow with auto-generated context
- Single task workflow
- Using `fail()` for error handling
- Random failure simulation

**Key Concepts:**
```typescript
workflow()
  .sq(({ task }) =>
    task()
      .do(async ({ finish, fail }) => {
        if (error) return fail("Error!");
        return finish();
      })
  )
```

---

### 04 - Workflow with Sequence
**File:** `04-workflow-with-sequence.ts`
**Run:** `deno task example:workflow-sequence`

**Demonstrates:**
- Creating a workflow with multiple tasks
- Sequential task execution using `next()`
- Shared context across workflow tasks
- Task ordering in workflows

**Key Concepts:**
```typescript
workflow()
  .sq(({ task }) => {
    const t2 = task().do(async ({ ctx, finish }) => finish());
    const t1 = task().do(async ({ ctx, next }) => next(t2));
    return t1; // First task to execute
  })
```

**Flow:** Task 1 → Task 2 (sharing context)

---

### 05 - Workflow with Shared Task
**File:** `05-workflow-with-shared-task.ts`
**Run:** `deno task example:shared-task`

**Demonstrates:**
- Creating reusable task factories
- Using `shared()` to include external tasks
- Custom context with typed data
- Integration with external commands (git)
- Parsing commit messages for versioning

**Key Concepts:**
```typescript
// Reusable task factory
const createValidator = (ctx, next) =>
  task(ctx).do(async ({ ctx, next }) => next(next));

workflow(CTX)
  .sq(({ task, shared }) => {
    const t1 = task().do(/* ... */);
    const t0 = shared(createValidator(CTX, t1));
    return t0;
  })
```

**Use Case:** Building reusable task libraries (validators, processors, etc.)

---

### 06 - Dependent Task (Multiple Pots)
**File:** `06-dependent-task-multiple-pots.ts`
**Run:** `deno task example:dependent-task`

**Demonstrates:**
- Creating a task that waits for multiple inputs (5 pots)
- Slot system for collecting data from different sources
- Processing all pots when collection is complete
- Manual core management

**Key Concepts:**
```typescript
task(PotA, PotB, PotC, PotD, PotE)
  .do(async ({ pots }) => {
    // pots[0] is PotA, pots[1] is PotB, etc.
    // Task only executes when ALL 5 pots are received
  })
```

**Use Case:** Aggregating data from multiple sources before processing

---

### 07 - Timeout and Retry
**File:** `07-timeout-and-retry.ts`
**Run:** `deno task example:timeout-retry`

**Demonstrates:**
- Setting task timeout
- Configuring retry attempts
- Setting retry interval
- Using fail handler for error logging
- Using `runCI` for test/CI environments

**Key Concepts:**
```typescript
task()
  .attempts(3)        // Retry up to 3 times
  .interval(3000)     // Wait 3s between retries
  .timeout(1000)      // Timeout after 1s
  .do(async ({ finish, repeat }) => {
    // If this takes > 1s, timeout occurs
    // Can manually trigger retry with repeat()
  })
  .fail(async (error) => {
    // Called after all attempts fail
  })
```

**Expected Behavior:**
1. Task starts
2. Timeout after 1s
3. Retry (wait 3s)
4. Timeout again
5. Retry (wait 3s)
6. Timeout again
7. Retry (wait 3s)
8. Timeout again
9. `fail()` handler called

---

### 08 - Custom Context Injection (Spicy)
**File:** `08-custom-context-injection.ts`
**Run:** `deno task example:custom-context`

**Demonstrates:**
- Injecting custom data into task handlers
- Using `spicy` parameter in core config
- Accessing custom data in `do()` handlers
- Type-safe custom context

**Key Concepts:**
```typescript
const core = shibuiCore<{ x: number }>({
  spicy: {
    x: 100,  // Available in all handlers
  },
});

core.task(Pot)
  .do(async ({ x, next }) => {
    // x is available here (type-safe)
    return next(task2, { value: x + 1 });
  })
```

**Use Case:** Injecting:
- Configuration values
- Database connections
- Logger instances
- Shared utilities
- Feature flags

Without using global variables or singletons.

---

## Concepts Quick Reference

### Task Creation Patterns

#### Simple Task
```typescript
task(InputPot)
  .name("My Task")
  .do(async ({ pots, finish }) => finish())
```

#### Task with Trigger
```typescript
task(InputPot)
  .on(InputPot, ({ pot, allow, deny }) =>
    condition ? allow() : deny()
  )
  .do(async ({ finish }) => finish())
```

#### Task with Rules
```typescript
task(InputPot)
  .onRule("ForThisTask", InputPot)
  .do(async ({ finish }) => finish())
```

### Workflow Creation Patterns

#### Simple Workflow
```typescript
workflow()
  .name("My Workflow")
  .sq(({ task }) => {
    return task().do(async ({ finish }) => finish());
  })
```

#### Workflow with Custom Context
```typescript
class MyCtx extends ContextPot<{ count: number }> {
  data = { count: 0 };
}

workflow(MyCtx)
  .sq(({ task }) => {
    return task().do(async ({ ctx, finish }) => {
      ctx.data.count++;
      return finish();
    });
  })
```

### Result Operations

| Operation | Description |
|-----------|-------------|
| `finish()` | Complete successfully |
| `fail(reason?)` | Complete with error |
| `next(task, data?)` | Send to another task |
| `next([t1, t2], data?)` | Send to multiple tasks |
| `repeat()` | Retry current task |

### Trigger Rules

| Rule | Accepts pots where... |
|------|----------------------|
| `"ForThisTask"` | `pot.to.task === thisTaskName` |
| `"ForAnyTask"` | `pot.to.task !== "unknown"` |
| `"ForUnknown"` | `pot.to.task === "unknown"` |

## Learning Path

**Beginner:**
1. Start with Example 01 (Simple Task)
2. Try Example 03 (Simple Workflow)
3. Explore Example 02 (Task Chaining)

**Intermediate:**
4. Study Example 04 (Workflow Sequence)
5. Learn Example 06 (Dependent Tasks)
6. Practice Example 07 (Timeout & Retry)

**Advanced:**
7. Master Example 05 (Shared Tasks)
8. Implement Example 08 (Custom Context)

## Tips

- **Always use `kv: { inMemory: true }` for examples and tests**
- **Enable logging with `logger: { enable: true }` to see what's happening**
- **Use `runCI()` instead of `execute()` for CI/CD environments**
- **Task names in workflows automatically get workflow prefix**
- **Dependent tasks wait for ALL input pots before executing**
- **Pots in `do()` handler match the order in `task()` declaration**

## Troubleshooting

### Task not executing?
- Check trigger conditions (use `allow()` not `deny()`)
- Verify `onRule()` matches pot's `to.task` field
- Ensure all required pots are sent for dependent tasks

### Workflow not finishing?
- Make sure last task returns `finish()` not `next()`
- Check for task failures (add `fail()` handlers)
- Verify all tasks in sequence are connected

### Data not passing between tasks?
- Use `next(task, data)` to pass data
- Access data in next task via `pots[0].data`
- Remember to use `onRule("ForThisTask")` to target specific tasks

## Next Steps

After completing examples:
1. Read the [Main README](../README.md) for full API reference
2. Check [Tests](../tests/) for more usage patterns
3. Build your own workflows!
