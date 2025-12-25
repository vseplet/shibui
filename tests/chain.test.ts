import { assertEquals, assertThrows } from "jsr:@std/assert";
import { chain, InternalPot, pipe, task } from "$shibui";

// ============================================================================
// chain() tests
// ============================================================================

Deno.test("Chain - creates chain from multiple tasks", () => {
  class Counter extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const t1 = task(Counter).name("Task1").do(async ({ finish }) => finish());
  const t2 = task(Counter).name("Task2").do(async ({ finish }) => finish());
  const t3 = task(Counter).name("Task3").do(async ({ finish }) => finish());

  const c = chain(t1, t2, t3);

  assertEquals(c.tasks.length, 3);
  assertEquals(c.name, "Chain[Task1 -> Task2 -> Task3]");
});

Deno.test("Chain - requires at least 2 tasks", () => {
  class Counter extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const t1 = task(Counter).name("Task1").do(async ({ finish }) => finish());

  assertThrows(
    () => chain(t1),
    Error,
    "chain() requires at least 2 tasks",
  );
});

Deno.test("Chain - preserves task order", () => {
  class Counter extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const t1 = task(Counter).name("First").do(async ({ finish }) => finish());
  const t2 = task(Counter).name("Second").do(async ({ finish }) => finish());
  const t3 = task(Counter).name("Third").do(async ({ finish }) => finish());

  const c = chain(t1, t2, t3);

  assertEquals(c.tasks[0].task.name, "First");
  assertEquals(c.tasks[1].task.name, "Second");
  assertEquals(c.tasks[2].task.name, "Third");
});

// ============================================================================
// pipe() tests
// ============================================================================

Deno.test("Pipe - single transform", () => {
  const transform = pipe((x: number) => x * 2);

  assertEquals(transform(5), 10);
});

Deno.test("Pipe - two transforms", () => {
  const transform = pipe(
    (x: number) => x + 1,
    (x: number) => x * 2,
  );

  assertEquals(transform(5), 12); // (5 + 1) * 2 = 12
});

Deno.test("Pipe - three transforms", () => {
  const transform = pipe(
    (x: number) => x + 1,
    (x: number) => x * 2,
    (x: number) => x.toString(),
  );

  assertEquals(transform(5), "12"); // ((5 + 1) * 2).toString() = "12"
});

Deno.test("Pipe - with object data", () => {
  const transform = pipe(
    (d: { value: number }) => ({ value: d.value + 1 }),
    (d) => ({ value: d.value * 2 }),
    (d) => ({ value: d.value, doubled: true }),
  );

  const result = transform({ value: 5 });

  assertEquals(result.value, 12);
  assertEquals(result.doubled, true);
});

Deno.test("Pipe - type preservation through chain", () => {
  interface Input {
    name: string;
  }
  interface WithLength {
    name: string;
    length: number;
  }
  interface Final {
    name: string;
    length: number;
    valid: boolean;
  }

  const transform = pipe(
    (d: Input): WithLength => ({ ...d, length: d.name.length }),
    (d: WithLength): Final => ({ ...d, valid: d.length > 0 }),
  );

  const result = transform({ name: "test" });

  assertEquals(result.name, "test");
  assertEquals(result.length, 4);
  assertEquals(result.valid, true);
});

Deno.test("Pipe - empty requires at least 1 transform", () => {
  assertThrows(
    () => pipe(),
    Error,
    "pipe() requires at least 1 transform function",
  );
});

Deno.test("Pipe - practical example with pot-like data", () => {
  // Simulating data transformation for a pot
  interface CounterData {
    value: number;
  }

  const increment = (d: CounterData) => ({ value: d.value + 1 });
  const double = (d: CounterData) => ({ value: d.value * 2 });
  const clamp = (d: CounterData) => ({ value: Math.min(d.value, 100) });

  const transform = pipe(increment, double, clamp);

  assertEquals(transform({ value: 10 }).value, 22); // (10 + 1) * 2 = 22
  assertEquals(transform({ value: 50 }).value, 100); // (50 + 1) * 2 = 102, clamped to 100
});
