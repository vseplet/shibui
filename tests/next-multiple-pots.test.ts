import { assertEquals } from "jsr:@std/assert";
import { pot, shibui, task, TriggerRule } from "$shibui";

const InputPot = pot("InputPot", { value: 0 });
const PotA = pot("PotA", { a: "" });
const PotB = pot("PotB", { b: 0 });
const PotC = pot("PotC", { c: false });

Deno.test("next(task, [pot1, pot2, pot3]) - одна задача получает несколько потов", async () => {
  const receivedPots: any[] = [];

  const app = shibui({ logger: false });

  const consumer = app.task(PotA, PotB, PotC)
    .name("Consumer")
    .onRule(TriggerRule.ForThisTask, PotA)
    .do(async ({ pots, finish }) => {
      receivedPots.push(...pots);
      return finish();
    });

  const producer = app.task(InputPot)
    .name("Producer")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      return next(consumer, [
        PotA.create({ a: "test" }),
        PotB.create({ b: 42 }),
        PotC.create({ c: true }),
      ]);
    });

  app.register(producer);
  app.register(consumer);
  await app.start();

  app.send(InputPot.create({ value: 1 }), producer);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Consumer должен получить все 3 пота
  assertEquals(receivedPots.length, 3);
  assertEquals(receivedPots[0].data.a, "test");
  assertEquals(receivedPots[1].data.b, 42);
  assertEquals(receivedPots[2].data.c, true);

  // Проверяем routing
  assertEquals(receivedPots[0].from.task, "Producer");
  assertEquals(receivedPots[0].to.task, "Consumer");
});

Deno.test("next([task1, task2], [pot1, pot2]) - несколько задач получают все поты", async () => {
  const task1Pots: any[] = [];
  const task2Pots: any[] = [];

  const app = shibui({ logger: false });

  const taskA = app.task(PotA, PotB)
    .name("TaskA")
    .onRule(TriggerRule.ForThisTask, PotA)
    .do(async ({ pots, finish }) => {
      task1Pots.push(...pots);
      return finish();
    });

  const taskB = app.task(PotA, PotB)
    .name("TaskB")
    .onRule(TriggerRule.ForThisTask, PotA)
    .do(async ({ pots, finish }) => {
      task2Pots.push(...pots);
      return finish();
    });

  const producer = app.task(InputPot)
    .name("Producer")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      return next([taskA, taskB], [
        PotA.create({ a: "hello" }),
        PotB.create({ b: 100 }),
      ]);
    });

  app.register(producer);
  app.register(taskA);
  app.register(taskB);
  await app.start();

  app.send(InputPot.create({ value: 1 }), producer);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Обе задачи должны получить оба пота
  assertEquals(task1Pots.length, 2);
  assertEquals(task2Pots.length, 2);

  // TaskA
  assertEquals(task1Pots[0].data.a, "hello");
  assertEquals(task1Pots[1].data.b, 100);
  assertEquals(task1Pots[0].to.task, "TaskA");

  // TaskB
  assertEquals(task2Pots[0].data.a, "hello");
  assertEquals(task2Pots[1].data.b, 100);
  assertEquals(task2Pots[0].to.task, "TaskB");

  // Каждая задача должна получить уникальные копии (разные UUID)
  assertEquals(task1Pots[0].uuid !== task2Pots[0].uuid, true);
  assertEquals(task1Pots[1].uuid !== task2Pots[1].uuid, true);
});

Deno.test("next(task, [PotFactory1, PotFactory2]) - использование PotFactory", async () => {
  const receivedPots: any[] = [];

  const app = shibui({ logger: false });

  const consumer = app.task(PotA, PotB)
    .name("Consumer")
    .onRule(TriggerRule.ForThisTask, PotA)
    .do(async ({ pots, finish }) => {
      receivedPots.push(...pots);
      return finish();
    });

  const producer = app.task(InputPot)
    .name("Producer")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      // Передаем PotFactory - используются defaults
      return next(consumer, [PotA, PotB]);
    });

  app.register(producer);
  app.register(consumer);
  await app.start();

  app.send(InputPot.create({ value: 1 }), producer);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Consumer должен получить поты с default значениями
  assertEquals(receivedPots.length, 2);
  assertEquals(receivedPots[0].data.a, "");
  assertEquals(receivedPots[1].data.b, 0);
});

Deno.test("next(task, [pot1, pot2]) - mixed PotInstance and PotFactory", async () => {
  const receivedPots: any[] = [];

  const app = shibui({ logger: false });

  const consumer = app.task(PotA, PotB)
    .name("Consumer")
    .onRule(TriggerRule.ForThisTask, PotA)
    .do(async ({ pots, finish }) => {
      receivedPots.push(...pots);
      return finish();
    });

  const producer = app.task(InputPot)
    .name("Producer")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      return next(consumer, [
        PotA.create({ a: "custom" }), // PotInstance
        PotB, // PotFactory
      ]);
    });

  app.register(producer);
  app.register(consumer);
  await app.start();

  app.send(InputPot.create({ value: 1 }), producer);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  assertEquals(receivedPots.length, 2);
  assertEquals(receivedPots[0].data.a, "custom");
  assertEquals(receivedPots[1].data.b, 0); // default
});
