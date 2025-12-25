import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  context,
  ContextPot,
  ExternalPot,
  InternalPot,
  pot,
  type PotData,
  type PotOf,
  PotType,
} from "$shibui";

Deno.test("Pot - InternalPot creation", () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const pot = new TestPot();

  assertEquals(pot.name, "TestPot");
  assertEquals(pot.type, "INTERNAL");
  assertEquals(pot.data.value, 0);
  assertExists(pot.uuid);
  assertExists(pot.toc);
});

Deno.test("Pot - ExternalPot creation", () => {
  class WebhookPot extends ExternalPot<{ payload: string }> {
    override data = { payload: "" };
  }

  const pot = new WebhookPot();

  assertEquals(pot.name, "WebhookPot");
  assertEquals(pot.type, "EXTERNAL");
  assertEquals(pot.data.payload, "");
});

Deno.test("Pot - ContextPot creation", () => {
  class MyContext extends ContextPot<{ count: number }> {
    override data = { count: 0 };
  }

  const pot = new MyContext();

  assertEquals(pot.name, "MyContext");
  assertEquals(pot.type, "CONTEXT");
  assertEquals(pot.data.count, 0);
});

Deno.test("Pot - init() method", () => {
  class TestPot extends InternalPot<{ a: number; b: string; c: boolean }> {
    override data = { a: 0, b: "", c: false };
  }

  const pot = new TestPot().init({ a: 42, b: "hello" });

  assertEquals(pot.data.a, 42);
  assertEquals(pot.data.b, "hello");
  assertEquals(pot.data.c, false); // Unchanged
});

Deno.test("Pot - copy() method", () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 10 };
  }

  const original = new TestPot().init({ value: 42 });
  const copy = original.copy();

  assertEquals(copy.data.value, 42);
  assertEquals(copy.name, "TestPot");
  assertEquals(copy.uuid !== original.uuid, true); // Different UUID
});

Deno.test("Pot - copy() with partial data", () => {
  class TestPot extends InternalPot<{ x: number; y: number }> {
    override data = { x: 0, y: 0 };
  }

  const original = new TestPot().init({ x: 10, y: 20 });
  const copy = original.copy({ y: 99 });

  assertEquals(copy.data.x, 10); // From original
  assertEquals(copy.data.y, 99); // Modified
});

Deno.test("Pot - deserialize() method", () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const jsonObj = {
    toc: Date.now(),
    uuid: crypto
      .randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
    name: "TestPot",
    type: PotType.Internal,
    from: { workflow: "wf1", task: "t1" },
    to: { workflow: "wf2", task: "t2" },
    ttl: 5,
    data: { value: 123 },
  };

  const pot = new TestPot().deserialize(jsonObj);

  assertEquals(pot.data.value, 123);
  assertEquals(pot.uuid, jsonObj.uuid);
  assertEquals(pot.toc, jsonObj.toc);
  assertEquals(pot.from.workflow, "wf1");
  assertEquals(pot.to.task, "t2");
  assertEquals(pot.ttl, 5);
});

Deno.test("Pot - TTL override", () => {
  class TestPot extends InternalPot<{ value: number }> {
    override ttl = 10;
    override data = { value: 0 };
  }

  const pot = new TestPot();
  assertEquals(pot.ttl, 10);
});

Deno.test("Pot - from/to metadata", () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const p = new TestPot();

  assertEquals(p.from.workflow, "unknown");
  assertEquals(p.from.task, "unknown");
  assertEquals(p.to.workflow, "unknown");
  assertEquals(p.to.task, "unknown");
});

// ============================================================================
// v1.0 API Tests - pot() factory
// ============================================================================

Deno.test("Pot v1.0 - pot() factory creation", () => {
  const Counter = pot("Counter", { value: 0 });

  assertEquals(Counter.name, "Counter");
  assertEquals(Counter.defaults.value, 0);
  assertEquals(Counter.ttl, 0);
});

Deno.test("Pot v1.0 - pot() with TTL option", () => {
  const Message = pot("Message", { text: "" }, { ttl: 100 });

  assertEquals(Message.name, "Message");
  assertEquals(Message.ttl, 100);
});

Deno.test("Pot v1.0 - pot().create() instance", () => {
  const Counter = pot("Counter", { value: 0 });
  const instance = Counter.create({ value: 42 });

  assertEquals(instance.name, "Counter");
  assertEquals(instance.type, PotType.Internal);
  assertEquals(instance.data.value, 42);
  assertEquals(instance.ttl, 0);
  assertExists(instance.uuid);
  assertExists(instance.toc);
  assertEquals(instance.from.task, "unknown");
  assertEquals(instance.to.task, "unknown");
});

Deno.test("Pot v1.0 - pot().create() with defaults", () => {
  const User = pot("User", { name: "Anonymous", age: 0 });
  const instance = User.create(); // No override

  assertEquals(instance.data.name, "Anonymous");
  assertEquals(instance.data.age, 0);
});

Deno.test("Pot v1.0 - pot().create() partial override", () => {
  const User = pot("User", { name: "Anonymous", age: 0 });
  const instance = User.create({ age: 25 }); // Only override age

  assertEquals(instance.data.name, "Anonymous");
  assertEquals(instance.data.age, 25);
});

Deno.test("Pot v1.0 - pot().init() is alias for create()", () => {
  const Counter = pot("Counter", { value: 0 });
  const instance = Counter.init({ value: 99 });

  assertEquals(instance.data.value, 99);
});

Deno.test("Pot v1.0 - context() factory for workflows", () => {
  const MyContext = context("MyWorkflow", { count: 0, status: "pending" });

  assertEquals(MyContext.name, "Context:MyWorkflow");
  assertEquals(MyContext.defaults.count, 0);
  assertEquals(MyContext.defaults.status, "pending");
});

Deno.test("Pot v1.0 - PotData type helper", () => {
  const Counter = pot("Counter", { value: 0 });

  // This is a compile-time test - if it compiles, the type is correct
  type CounterData = PotData<typeof Counter>;
  const data: CounterData = { value: 42 };

  assertEquals(data.value, 42);
});

Deno.test("Pot v1.0 - PotOf type helper", () => {
  const Counter = pot("Counter", { value: 0 });

  // This is a compile-time test - if it compiles, the type is correct
  type CounterInstance = PotOf<typeof Counter>;
  const instance: CounterInstance = Counter.create({ value: 42 });

  assertEquals(instance.data.value, 42);
  assertExists(instance.uuid);
});
