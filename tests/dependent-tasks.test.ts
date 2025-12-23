import { assertEquals } from "jsr:@std/assert";
import { task, core, InternalPot } from "$shibui";

Deno.test("Dependent Tasks - two slots", async () => {
  class PotA extends InternalPot<{ a: number }> {
    data = { a: 0 };
  }
  class PotB extends InternalPot<{ b: number }> {
    data = { b: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

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

  c.send(new PotA().init({ a: 10 }));
  c.send(new PotB().init({ b: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);
  assertEquals(sumResult, 30);
});

Deno.test("Dependent Tasks - three slots", async () => {
  class PotA extends InternalPot<{ a: number }> {
    data = { a: 0 };
  }
  class PotB extends InternalPot<{ b: number }> {
    data = { b: 0 };
  }
  class PotC extends InternalPot<{ c: number }> {
    data = { c: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

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

  c.send(new PotA().init({ a: 1 }));
  c.send(new PotB().init({ b: 2 }));
  c.send(new PotC().init({ c: 3 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);
  assertEquals(result, 6);
});

Deno.test("Dependent Tasks - five slots (maximum)", async () => {
  class Pot1 extends InternalPot<{ v: number }> {
    data = { v: 1 };
  }
  class Pot2 extends InternalPot<{ v: number }> {
    data = { v: 2 };
  }
  class Pot3 extends InternalPot<{ v: number }> {
    data = { v: 3 };
  }
  class Pot4 extends InternalPot<{ v: number }> {
    data = { v: 4 };
  }
  class Pot5 extends InternalPot<{ v: number }> {
    data = { v: 5 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

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

  c.send(new Pot1().init({ v: 1 }));
  c.send(new Pot2().init({ v: 2 }));
  c.send(new Pot3().init({ v: 3 }));
  c.send(new Pot4().init({ v: 4 }));
  c.send(new Pot5().init({ v: 5 }));

  await new Promise((resolve) => setTimeout(resolve, 1500));

  assertEquals(executed, true);
  assertEquals(result, 15);
});

Deno.test("Dependent Tasks - waits for all pots", async () => {
  class PotA extends InternalPot<{ a: number }> {
    data = { a: 0 };
  }
  class PotB extends InternalPot<{ b: number }> {
    data = { b: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

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
  c.send(new PotA().init({ a: 10 }));

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Should not have executed yet
  assertEquals(executionCount, 0);

  // Send second pot
  c.send(new PotB().init({ b: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Now should have executed
  assertEquals(executionCount, 1);
});

Deno.test("Dependent Tasks - order of pots matches declaration", async () => {
  class PotA extends InternalPot<{ type: string }> {
    data = { type: "A" };
  }
  class PotB extends InternalPot<{ type: string }> {
    data = { type: "B" };
  }
  class PotC extends InternalPot<{ type: string }> {
    data = { type: "C" };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let receivedOrder: string[] = [];

  const combiner = c.task(PotA, PotB, PotC)
    .name("Order Test")
    .do(async ({ pots, finish }) => {
      receivedOrder = pots.map((p) => p.data.type);
      return finish();
    });

  c.register(combiner);
  await c.start();

  // Send in different order
  c.send(new PotC().init({ type: "C" }));
  c.send(new PotA().init({ type: "A" }));
  c.send(new PotB().init({ type: "B" }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Should receive in declaration order
  assertEquals(receivedOrder, ["A", "B", "C"]);
});

Deno.test("Dependent Tasks - custom triggers per slot", async () => {
  class PotA extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }
  class PotB extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let executed = false;

  const combiner = c.task(PotA, PotB)
    .name("Custom Trigger Task")
    .on(PotA, ({ pot, allow, deny }) => {
      return pot.data.value > 5 ? allow(0) : deny();
    }, 0)
    .on(PotB, ({ pot, allow, deny }) => {
      return pot.data.value < 100 ? allow(1) : deny();
    }, 1)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  c.register(combiner);
  await c.start();

  // PotA should be accepted (10 > 5)
  c.send(new PotA().init({ value: 10 }));
  // PotB should be accepted (20 < 100)
  c.send(new PotB().init({ value: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(executed, true);
});

Deno.test("Dependent Tasks - rejects if trigger denies", async () => {
  class PotA extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }
  class PotB extends InternalPot<{ value: number }> {
    data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let executed = false;

  const combiner = c.task(PotA, PotB)
    .name("Reject Task")
    .on(PotA, ({ pot, allow, deny }) => {
      return pot.data.value > 100 ? allow(0) : deny();
    }, 0)
    .do(async ({ finish }) => {
      executed = true;
      return finish();
    });

  c.register(combiner);
  await c.start();

  c.send(new PotA().init({ value: 5 })); // Should be denied
  c.send(new PotB().init({ value: 20 }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Should not execute because PotA was denied
  assertEquals(executed, false);
});

Deno.test("Dependent Tasks - different pot types", async () => {
  class StringPot extends InternalPot<{ text: string }> {
    data = { text: "" };
  }
  class NumberPot extends InternalPot<{ num: number }> {
    data = { num: 0 };
  }
  class BooleanPot extends InternalPot<{ flag: boolean }> {
    data = { flag: false };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let result = "";

  const mixer = c.task(StringPot, NumberPot, BooleanPot)
    .name("Type Mixer")
    .do(async ({ pots, finish }) => {
      result = `${pots[0].data.text}:${pots[1].data.num}:${pots[2].data.flag}`;
      return finish();
    });

  c.register(mixer);
  await c.start();

  c.send(new StringPot().init({ text: "hello" }));
  c.send(new NumberPot().init({ num: 42 }));
  c.send(new BooleanPot().init({ flag: true }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  assertEquals(result, "hello:42:true");
});
