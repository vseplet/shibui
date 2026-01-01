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

// ============================================================================
// CRASH RECOVERY TESTS - verify Filler persistence to Deno KV
// ============================================================================

const CrashPotA = pot("CrashPotA", { value: "A" });
const CrashPotB = pot("CrashPotB", { value: "B" });
const CrashPotC = pot("CrashPotC", { value: "C" });

Deno.test("Crash Recovery - slots persist and restore after crash", async () => {
  const kvPath = await Deno.makeTempFile({ suffix: ".db" });

  // Track execution across "restarts"
  let executedAfterRestart = false;
  let receivedValues: string[] = [];

  // === PHASE 1: Start core, send first pot, then "crash" ===
  {
    const c1 = core({ storage: kvPath, logging: false });

    const combiner = c1.task(CrashPotA, CrashPotB)
      .name("CrashRecoveryCombiner")
      .do(async ({ pots, finish }) => {
        // This should NOT execute in phase 1 - only one pot sent
        receivedValues = pots.map((p) => p.data.value);
        return finish();
      });

    c1.register(combiner);
    await c1.start();

    // Send only first pot
    c1.send(CrashPotA.create({ value: "A-saved" }));

    // Wait for pot to be processed and saved to KV
    await new Promise((resolve) => setTimeout(resolve, 500));

    // "Crash" - close without sending second pot
    c1.close();
  }

  // === PHASE 2: Restart core, slots should restore from KV ===
  {
    const c2 = core({ storage: kvPath, logging: false });

    const combiner = c2.task(CrashPotA, CrashPotB)
      .name("CrashRecoveryCombiner")
      .do(async ({ pots, finish }) => {
        executedAfterRestart = true;
        receivedValues = pots.map((p) => p.data.value);
        return finish();
      });

    c2.register(combiner);
    await c2.start(); // Should restore CrashPotA from KV

    // Send second pot - should complete the task with restored first pot
    c2.send(CrashPotB.create({ value: "B-new" }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    c2.close();
  }

  // Cleanup
  try {
    await Deno.remove(kvPath);
  } catch { /* ignore */ }

  // Verify task executed after restart with restored data
  assertEquals(executedAfterRestart, true, "Task should execute after restart");
  assertEquals(receivedValues, ["A-saved", "B-new"], "Should have restored pot A and new pot B");
});

Deno.test("Crash Recovery - three slots with partial data", async () => {
  const kvPath = await Deno.makeTempFile({ suffix: ".db" });

  let executedAfterRestart = false;
  let receivedValues: string[] = [];

  // === PHASE 1: Send 2 out of 3 pots, then crash ===
  {
    const c1 = core({ storage: kvPath, logging: false });

    const combiner = c1.task(CrashPotA, CrashPotB, CrashPotC)
      .name("ThreeSlotRecovery")
      .do(async ({ pots, finish }) => {
        receivedValues = pots.map((p) => p.data.value);
        return finish();
      });

    c1.register(combiner);
    await c1.start();

    // Send first two pots
    c1.send(CrashPotA.create({ value: "first" }));
    c1.send(CrashPotC.create({ value: "third" }));

    await new Promise((resolve) => setTimeout(resolve, 500));
    c1.close();
  }

  // === PHASE 2: Restart and send missing pot ===
  {
    const c2 = core({ storage: kvPath, logging: false });

    const combiner = c2.task(CrashPotA, CrashPotB, CrashPotC)
      .name("ThreeSlotRecovery")
      .do(async ({ pots, finish }) => {
        executedAfterRestart = true;
        receivedValues = pots.map((p) => p.data.value);
        return finish();
      });

    c2.register(combiner);
    await c2.start();

    // Send the missing middle pot
    c2.send(CrashPotB.create({ value: "second" }));

    await new Promise((resolve) => setTimeout(resolve, 1000));
    c2.close();
  }

  try {
    await Deno.remove(kvPath);
  } catch { /* ignore */ }

  assertEquals(executedAfterRestart, true);
  assertEquals(receivedValues, ["first", "second", "third"]);
});

Deno.test("Crash Recovery - multiple rows in slots", async () => {
  const kvPath = await Deno.makeTempFile({ suffix: ".db" });

  let executionCount = 0;
  const receivedPairs: string[][] = [];

  // === PHASE 1: Send multiple PotA instances, no PotB ===
  {
    const c1 = core({ storage: kvPath, logging: false });

    const combiner = c1.task(CrashPotA, CrashPotB)
      .name("MultiRowRecovery")
      .do(async ({ pots, finish }) => {
        receivedPairs.push(pots.map((p) => p.data.value));
        return finish();
      });

    c1.register(combiner);
    await c1.start();

    // Send 3 PotA instances - they should queue up in slot 0
    c1.send(CrashPotA.create({ value: "A1" }));
    c1.send(CrashPotA.create({ value: "A2" }));
    c1.send(CrashPotA.create({ value: "A3" }));

    await new Promise((resolve) => setTimeout(resolve, 500));
    c1.close();
  }

  // === PHASE 2: Send matching PotB instances ===
  {
    const c2 = core({ storage: kvPath, logging: false });

    const combiner = c2.task(CrashPotA, CrashPotB)
      .name("MultiRowRecovery")
      .do(async ({ pots, finish }) => {
        executionCount++;
        receivedPairs.push(pots.map((p) => p.data.value));
        return finish();
      });

    c2.register(combiner);
    await c2.start();

    // Send 3 PotB instances to match the restored PotA instances
    c2.send(CrashPotB.create({ value: "B1" }));
    c2.send(CrashPotB.create({ value: "B2" }));
    c2.send(CrashPotB.create({ value: "B3" }));

    await new Promise((resolve) => setTimeout(resolve, 1500));
    c2.close();
  }

  try {
    await Deno.remove(kvPath);
  } catch { /* ignore */ }

  assertEquals(executionCount, 3, "Should execute 3 times");
  assertEquals(receivedPairs.length, 3, "Should have 3 pairs");
  // Order may vary due to async, but all A's should pair with B's
  const allAs = receivedPairs.map((p) => p[0]).sort();
  const allBs = receivedPairs.map((p) => p[1]).sort();
  assertEquals(allAs, ["A1", "A2", "A3"]);
  assertEquals(allBs, ["B1", "B2", "B3"]);
});
