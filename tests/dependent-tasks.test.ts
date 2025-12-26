import { assertEquals } from "jsr:@std/assert";
import { core, pot } from "$shibui";

const PotA = pot("PotA", { a: 0 });
const PotB = pot("PotB", { b: 0 });
const PotC = pot("PotC", { c: 0 });
const Pot1 = pot("Pot1", { v: 1 });
const Pot2 = pot("Pot2", { v: 2 });
const Pot3 = pot("Pot3", { v: 3 });
const Pot4 = pot("Pot4", { v: 4 });
const Pot5 = pot("Pot5", { v: 5 });
const StringPot = pot("StringPot", { text: "" });
const NumberPot = pot("NumberPot", { num: 0 });
const BooleanPot = pot("BooleanPot", { flag: false });
const TypePotA = pot("TypePotA", { type: "A" });
const TypePotB = pot("TypePotB", { type: "B" });
const TypePotC = pot("TypePotC", { type: "C" });
const ValuePotA = pot("ValuePotA", { value: 0 });
const ValuePotB = pot("ValuePotB", { value: 0 });

Deno.test("Dependent Tasks - two slots", async () => {
  const c = core({ storage: "memory", logging: false });

  let executed = false;
  let sumResult = 0;

  const combiner = c.task(PotA, PotB)
    .name("Combiner")
    .do(async ({ pots, finish }) => {
      executed = true;
      sumResult = pots[0].data.a + pots[1].data.b;
      return finish();
    });

  c.register(combiner);
  await c.start();

  c.send(PotA.create({ a: 10 }));
  c.send(PotB.create({ b: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);
  assertEquals(sumResult, 30);

  c.close();
});

Deno.test("Dependent Tasks - three slots", async () => {
  const c = core({ storage: "memory", logging: false });

  let executed = false;
  let result = 0;

  const combiner = c.task(PotA, PotB, PotC)
    .name("Three Combiner")
    .do(async ({ pots, finish }) => {
      executed = true;
      result = pots[0].data.a + pots[1].data.b + pots[2].data.c;
      return finish();
    });

  c.register(combiner);
  await c.start();

  c.send(PotA.create({ a: 1 }));
  c.send(PotB.create({ b: 2 }));
  c.send(PotC.create({ c: 3 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);
  assertEquals(result, 6);

  c.close();
});

Deno.test("Dependent Tasks - five slots (maximum)", async () => {
  const c = core({ storage: "memory", logging: false });

  let executed = false;
  let result = 0;

  const combiner = c.task(Pot1, Pot2, Pot3, Pot4, Pot5)
    .name("Five Combiner")
    .do(async ({ pots, finish }) => {
      executed = true;
      result = pots.reduce((sum, pot) => sum + pot.data.v, 0);
      return finish();
    });

  c.register(combiner);
  await c.start();

  c.send(Pot1.create({ v: 1 }));
  c.send(Pot2.create({ v: 2 }));
  c.send(Pot3.create({ v: 3 }));
  c.send(Pot4.create({ v: 4 }));
  c.send(Pot5.create({ v: 5 }));

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(executed, true);
  assertEquals(result, 15);

  c.close();
});

Deno.test("Dependent Tasks - waits for all pots", async () => {
  const c = core({ storage: "memory", logging: false });

  let executionCount = 0;

  const combiner = c.task(PotA, PotB)
    .name("Waiter")
    .do(async ({ finish }) => {
      executionCount++;
      return finish();
    });

  c.register(combiner);
  await c.start();

  // Send only one pot
  c.send(PotA.create({ a: 10 }));

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Should not have executed yet
  assertEquals(executionCount, 0);

  // Send second pot
  c.send(PotB.create({ b: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Now should have executed
  assertEquals(executionCount, 1);

  c.close();
});

Deno.test("Dependent Tasks - order of pots matches declaration", async () => {
  const c = core({ storage: "memory", logging: false });

  let receivedOrder: string[] = [];

  const combiner = c.task(TypePotA, TypePotB, TypePotC)
    .name("Order Test")
    .do(async ({ pots, finish }) => {
      receivedOrder = pots.map((p) => p.data.type);
      return finish();
    });

  c.register(combiner);
  await c.start();

  // Send in different order
  c.send(TypePotC.create({ type: "C" }));
  c.send(TypePotA.create({ type: "A" }));
  c.send(TypePotB.create({ type: "B" }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Should receive in declaration order
  assertEquals(receivedOrder, ["A", "B", "C"]);

  c.close();
});

Deno.test("Dependent Tasks - custom triggers per slot", async () => {
  const c = core({ storage: "memory", logging: false });

  let executed = false;

  const combiner = c.task(ValuePotA, ValuePotB)
    .name("Custom Trigger Task")
    .on(ValuePotA, ({ pot, allow, deny }) => {
      return pot.data.value > 5 ? allow(0) : deny();
    }, 0)
    .on(ValuePotB, ({ pot, allow, deny }) => {
      return pot.data.value < 100 ? allow(1) : deny();
    }, 1)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  c.register(combiner);
  await c.start();

  // ValuePotA should be accepted (10 > 5)
  c.send(ValuePotA.create({ value: 10 }));
  // ValuePotB should be accepted (20 < 100)
  c.send(ValuePotB.create({ value: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);

  c.close();
});

Deno.test("Dependent Tasks - rejects if trigger denies", async () => {
  const c = core({ storage: "memory", logging: false });

  let executed = false;

  const combiner = c.task(ValuePotA, ValuePotB)
    .name("Reject Task")
    .on(ValuePotA, ({ pot, allow, deny }) => {
      return pot.data.value > 100 ? allow(0) : deny();
    }, 0)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  c.register(combiner);
  await c.start();

  c.send(ValuePotA.create({ value: 5 })); // Should be denied
  c.send(ValuePotB.create({ value: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Should not execute because ValuePotA was denied
  assertEquals(executed, false);

  c.close();
});

Deno.test("Dependent Tasks - different pot types", async () => {
  const c = core({ storage: "memory", logging: false });

  let result = "";

  const mixer = c.task(StringPot, NumberPot, BooleanPot)
    .name("Type Mixer")
    .do(async ({ pots, finish }) => {
      result = `${pots[0].data.text}:${pots[1].data.num}:${pots[2].data.flag}`;
      return finish();
    });

  c.register(mixer);
  await c.start();

  c.send(StringPot.create({ text: "hello" }));
  c.send(NumberPot.create({ num: 42 }));
  c.send(BooleanPot.create({ flag: true }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(result, "hello:42:true");

  c.close();
});
