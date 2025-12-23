# Shibui Core Tests

Comprehensive test suite for the Shibui workflow automation engine core.

## Running Tests

```bash
# Run all tests
deno task test

# Run tests without type checking (faster)
deno test --no-check --allow-all --unstable-broadcast-channel --unstable-kv ./tests/

# Run specific test file
deno test --no-check --allow-all --unstable-broadcast-channel --unstable-kv ./tests/pot.test.ts
```

## Test Structure

### `pot.test.ts` - Pot API Tests
- Pot creation (InternalPot, ExternalPot, ContextPot)
- `init()` method - partial data initialization
- `copy()` method - deep copying with optional data override
- `deserialize()` method - JSON deserialization
- TTL overrides
- Metadata handling (from/to)

**Coverage:** 9 tests

### `task.test.ts` - Task API Tests
- Task creation and configuration
- Simple task execution with `finish()`
- Custom trigger handlers with `allow()`/`deny()`
- Built-in trigger rules (`ForThisTask`, `ForUnknown`, `ForAnyTask`)
- Task configuration (attempts, interval, timeout)
- Fail handler
- Default trigger on `CoreStartPot`
- Multiple pot types
- Logger availability

**Coverage:** 11 tests

### `workflow.test.ts` - Workflow API Tests
- Workflow creation with context
- Two-task sequence execution
- Context sharing across tasks
- Custom trigger handlers
- Multiple triggers
- Workflow tasks with additional pots
- Default trigger on `CoreStartPot`
- Auto-generated context
- Task naming with workflow prefix

**Coverage:** 9 tests

### `operations.test.ts` - Result Operations Tests
- `finish()` - successful completion
- `fail()` - error handling
- `next()` - single task routing
- `next()` - multiple task routing (parallel)
- `next()` - data passing
- `repeat()` - retry mechanism
- Task chaining (3+ tasks)

**Coverage:** 7 tests

### `dependent-tasks.test.ts` - Multiple Input Tests
- Two-slot dependent tasks
- Three-slot dependent tasks
- Five-slot dependent tasks (maximum)
- Waiting for all pots before execution
- Pot ordering matches declaration
- Custom triggers per slot
- Rejection on trigger deny
- Different pot types mixing

**Coverage:** 9 tests

### `events.test.ts` - Event System Tests
- `TaskFinishedEvent` emission
- `TaskFailedEvent` emission
- `WorkflowFinishedEvent` emission
- `WorkflowFailedEvent` emission
- Log events emission (inf, wrn, err)
- Multiple event listeners
- Event metadata validation

**Coverage:** 7 tests

### `integration.test.ts` - Real-World Scenarios
- Simple task with conditional trigger (ex1.ts)
- Task chaining with data passing (ex2.ts)
- Simple workflow execution (ex4.ts)
- Five-slot dependent task (ex6.ts)
- Workflow with context mutation
- Error handling in workflows
- Parallel task execution
- Retry mechanism

**Coverage:** 8 tests

## Total Coverage

**60 tests** covering:
- Pot API (init, copy, deserialize)
- Task API (triggers, handlers, rules)
- Workflow API (context, sequence)
- Result operations (next, finish, fail, repeat)
- Dependent tasks (multiple inputs)
- Event system
- Integration scenarios

## Known Issues

### Type Checking

Some tests have TypeScript errors related to `override` modifiers. Run tests with `--no-check` flag:

```bash
deno test --no-check --allow-all --unstable-broadcast-channel --unstable-kv ./tests/
```

### Async Timing

Some tests use `setTimeout()` delays to wait for async operations. This makes tests slower but ensures reliability with Deno KV and BroadcastChannel.

Typical wait times:
- Simple operations: 500ms
- Multi-task chains: 1000-1500ms

## Test Best Practices

### Using `kv: { inMemory: true }`

Always use in-memory KV for tests:

```typescript
const success = await execute(task, [pot], {
  kv: { inMemory: true },
  logger: { enable: false },
});
```

### Disabling Logger

Disable logger in tests for cleaner output:

```typescript
const c = core({
  kv: { inMemory: true },
  logger: { enable: false },
});
```

### Waiting for Async Operations

Use appropriate delays for multi-step operations:

```typescript
await c.start();
c.send(pot);

// Wait for task execution
await new Promise((resolve) => setTimeout(resolve, 1000));
```

## Future Improvements

- [ ] Add timeout tests
- [ ] Add concurrent task execution tests
- [ ] Add stress tests (many pots, many tasks)
- [ ] Add error recovery tests
- [ ] Reduce async wait times
- [ ] Fix TypeScript strict mode errors
- [ ] Add test coverage reporting
- [ ] Add benchmark tests
