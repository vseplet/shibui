import { assertEquals, assertExists } from "jsr:@std/assert";
import { context, pot, type PotData, type PotOf, PotType } from "$shibui";

Deno.test("Pot - basic creation with pot()", () => {
  const TestPot = pot("TestPot", { value: 0 });
  const instance = TestPot.create();

  assertEquals(instance.name, "TestPot");
  assertEquals(instance.type, PotType.Internal);
  assertEquals(instance.data.value, 0);
  assertExists(instance.uuid);
  assertExists(instance.toc);
});

Deno.test("Pot - creation with custom data", () => {
  const WebhookPot = pot("WebhookPot", { payload: "" });
  const instance = WebhookPot.create({ payload: "test" });

  assertEquals(instance.name, "WebhookPot");
  assertEquals(instance.data.payload, "test");
});

Deno.test("Pot - context() for workflows", () => {
  const MyContext = context("MyContext", { count: 0 });
  const instance = MyContext.create();

  assertEquals(instance.name, "MyContext");
  assertEquals(instance.data.count, 0);
});

Deno.test("Pot - create() with partial data", () => {
  const TestPot = pot("TestPot", { a: 0, b: "", c: false });
  const instance = TestPot.create({ a: 42, b: "hello" });

  assertEquals(instance.data.a, 42);
  assertEquals(instance.data.b, "hello");
  assertEquals(instance.data.c, false); // Unchanged default
});

Deno.test("Pot - copy() method", () => {
  const TestPot = pot("TestPot", { value: 10 });
  const original = new TestPot._class().init({ value: 42 });
  const copy = original.copy();

  assertEquals(copy.data.value, 42);
  assertEquals(copy.name, "TestPot");
  assertEquals(copy.uuid !== original.uuid, true); // Different UUID
});

Deno.test("Pot - copy() with partial data", () => {
  const TestPot = pot("TestPot", { x: 0, y: 0 });
  const original = new TestPot._class().init({ x: 10, y: 20 });
  const copy = original.copy({ y: 99 });

  assertEquals(copy.data.x, 10); // From original
  assertEquals(copy.data.y, 99); // Modified
});

Deno.test("Pot - deserialize() method", () => {
  const TestPot = pot("TestPot", { value: 0 });

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

  // Use _class to access deserialize method
  const instance = new TestPot._class();
  const deserialized = instance.deserialize(jsonObj);

  assertEquals(deserialized.data.value, 123);
  assertEquals(deserialized.uuid, jsonObj.uuid);
  assertEquals(deserialized.toc, jsonObj.toc);
  assertEquals(deserialized.from.workflow, "wf1");
  assertEquals(deserialized.to.task, "t2");
  assertEquals(deserialized.ttl, 5);
});

Deno.test("Pot - TTL option", () => {
  const TestPot = pot("TestPot", { value: 0 }, { ttl: 10 });
  const instance = TestPot.create();

  assertEquals(instance.ttl, 10);
  assertEquals(TestPot.ttl, 10);
});

Deno.test("Pot - from/to metadata defaults", () => {
  const TestPot = pot("TestPot", { value: 0 });
  const instance = TestPot.create();

  assertEquals(instance.from.workflow, "unknown");
  assertEquals(instance.from.task, "unknown");
  assertEquals(instance.to.workflow, "unknown");
  assertEquals(instance.to.task, "unknown");
});

Deno.test("Pot - factory properties", () => {
  const Counter = pot("Counter", { value: 0 });

  assertEquals(Counter.name, "Counter");
  assertEquals(Counter.defaults.value, 0);
  assertEquals(Counter.ttl, 0);
});

Deno.test("Pot - factory with TTL", () => {
  const Message = pot("Message", { text: "" }, { ttl: 100 });

  assertEquals(Message.name, "Message");
  assertEquals(Message.ttl, 100);
});

Deno.test("Pot - create() with defaults only", () => {
  const User = pot("User", { name: "Anonymous", age: 0 });
  const instance = User.create();

  assertEquals(instance.data.name, "Anonymous");
  assertEquals(instance.data.age, 0);
});

Deno.test("Pot - init() is alias for create()", () => {
  const Counter = pot("Counter", { value: 0 });
  const instance = Counter.init({ value: 99 });

  assertEquals(instance.data.value, 99);
});

Deno.test("Pot - context() factory", () => {
  const MyContext = context("MyWorkflow", { count: 0, status: "pending" });

  assertEquals(MyContext.name, "MyWorkflow");
  assertEquals(MyContext.defaults.count, 0);
  assertEquals(MyContext.defaults.status, "pending");
});

Deno.test("Pot - PotData type helper", () => {
  const Counter = pot("Counter", { value: 0 });

  type CounterData = PotData<typeof Counter>;
  const data: CounterData = { value: 42 };

  assertEquals(data.value, 42);
});

Deno.test("Pot - PotOf type helper", () => {
  const Counter = pot("Counter", { value: 0 });

  type CounterInstance = PotOf<typeof Counter>;
  const instance: CounterInstance = Counter.create({ value: 42 });

  assertEquals(instance.data.value, 42);
  assertExists(instance.uuid);
});
