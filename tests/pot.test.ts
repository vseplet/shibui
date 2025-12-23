import { assertEquals, assertExists } from "jsr:@std/assert";
import { InternalPot, ExternalPot, ContextPot } from "$shibui/pots";

Deno.test("Pot - InternalPot creation", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
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
    data = { payload: "" };
  }

  const pot = new WebhookPot();

  assertEquals(pot.name, "WebhookPot");
  assertEquals(pot.type, "EXTERNAL");
  assertEquals(pot.data.payload, "");
});

Deno.test("Pot - ContextPot creation", () => {
  class MyContext extends ContextPot<{ count: number }> {
    data = { count: 0 };
  }

  const pot = new MyContext();

  assertEquals(pot.name, "MyContext");
  assertEquals(pot.type, "CONTEXT");
  assertEquals(pot.data.count, 0);
});

Deno.test("Pot - init() method", () => {
  class TestPot extends InternalPot<{ a: number; b: string; c: boolean }> {
    data = { a: 0, b: "", c: false };
  }

  const pot = new TestPot().init({ a: 42, b: "hello" });

  assertEquals(pot.data.a, 42);
  assertEquals(pot.data.b, "hello");
  assertEquals(pot.data.c, false); // Unchanged
});

Deno.test("Pot - copy() method", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 10 };
  }

  const original = new TestPot().init({ value: 42 });
  const copy = original.copy();

  assertEquals(copy.data.value, 42);
  assertEquals(copy.name, "TestPot");
  assertEquals(copy.uuid !== original.uuid, true); // Different UUID
});

Deno.test("Pot - copy() with partial data", () => {
  class TestPot extends InternalPot<{ x: number; y: number }> {
    data = { x: 0, y: 0 };
  }

  const original = new TestPot().init({ x: 10, y: 20 });
  const copy = original.copy({ y: 99 });

  assertEquals(copy.data.x, 10); // From original
  assertEquals(copy.data.y, 99); // Modified
});

Deno.test("Pot - deserialize() method", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const jsonObj = {
    toc: Date.now(),
    uuid: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
    name: "TestPot",
    type: "INTERNAL" as const,
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
    data = { value: 0 };
  }

  const pot = new TestPot();
  assertEquals(pot.ttl, 10);
});

Deno.test("Pot - from/to metadata", () => {
  class TestPot extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const pot = new TestPot();

  assertEquals(pot.from.workflow, "unknown");
  assertEquals(pot.from.task, "unknown");
  assertEquals(pot.to.workflow, "unknown");
  assertEquals(pot.to.task, "unknown");
});
