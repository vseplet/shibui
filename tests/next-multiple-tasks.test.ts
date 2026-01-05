import { assertEquals } from "jsr:@std/assert";
import { pot, shibui, task, TriggerRule } from "$shibui";

const InputPot = pot("InputPot", { value: 0 });
const OutputPot = pot("OutputPot", { result: "" });

Deno.test("next([tasks], data) - массив задач с data объектом", async () => {
  const results: string[] = [];

  const app = shibui({ logger: false });

  const taskA = app.task(InputPot)
    .name("TaskA")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ pots, finish }) => {
      results.push(`A:${pots[0].data.value}`);
      return finish();
    });

  const taskB = app.task(InputPot)
    .name("TaskB")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ pots, finish }) => {
      results.push(`B:${pots[0].data.value}`);
      return finish();
    });

  const starter = app.task(InputPot)
    .name("Starter")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      // Send data to multiple tasks
      return next([taskA, taskB], { value: 42 });
    });

  app.register(starter);
  app.register(taskA);
  app.register(taskB);
  await app.start();

  app.send(InputPot.create({ value: 1 }), starter);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Both tasks should receive the data
  assertEquals(results.includes("A:42"), true);
  assertEquals(results.includes("B:42"), true);
});

Deno.test("next([tasks], pot) - массив задач с PotInstance", async () => {
  const receivedPots: any[] = [];

  const app = shibui({ logger: false });

  const taskA = app.task(OutputPot)
    .name("TaskA")
    .onRule(TriggerRule.ForThisTask, OutputPot)
    .do(async ({ pots, finish }) => {
      receivedPots.push({ task: "A", pot: pots[0] });
      return finish();
    });

  const taskB = app.task(OutputPot)
    .name("TaskB")
    .onRule(TriggerRule.ForThisTask, OutputPot)
    .do(async ({ pots, finish }) => {
      receivedPots.push({ task: "B", pot: pots[0] });
      return finish();
    });

  const starter = app.task(InputPot)
    .name("Starter")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      // Send pot instance to multiple tasks
      return next([taskA, taskB], OutputPot.create({ result: "custom" }));
    });

  app.register(starter);
  app.register(taskA);
  app.register(taskB);
  await app.start();

  app.send(InputPot.create({ value: 1 }), starter);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Both tasks should receive the pot
  assertEquals(receivedPots.length, 2);
  assertEquals(receivedPots[0].pot.data.result, "custom");
  assertEquals(receivedPots[1].pot.data.result, "custom");

  // Each task should have correct routing
  const taskAPot = receivedPots.find((r) => r.task === "A")?.pot;
  const taskBPot = receivedPots.find((r) => r.task === "B")?.pot;

  assertEquals(taskAPot.from.task, "Starter");
  assertEquals(taskAPot.to.task, "TaskA");

  assertEquals(taskBPot.from.task, "Starter");
  assertEquals(taskBPot.to.task, "TaskB");

  // Pots should be different instances (copies)
  assertEquals(taskAPot.uuid !== taskBPot.uuid, true);
});

Deno.test("next([tasks], PotFactory) - массив задач с PotFactory", async () => {
  const results: string[] = [];

  const app = shibui({ logger: false });

  const taskA = app.task(OutputPot)
    .name("TaskA")
    .onRule(TriggerRule.ForThisTask, OutputPot)
    .do(async ({ pots, finish }) => {
      results.push(`A:${pots[0].data.result}`);
      return finish();
    });

  const taskB = app.task(OutputPot)
    .name("TaskB")
    .onRule(TriggerRule.ForThisTask, OutputPot)
    .do(async ({ pots, finish }) => {
      results.push(`B:${pots[0].data.result}`);
      return finish();
    });

  const starter = app.task(InputPot)
    .name("Starter")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ next }) => {
      // Send PotFactory to multiple tasks (uses defaults)
      return next([taskA, taskB], OutputPot);
    });

  app.register(starter);
  app.register(taskA);
  app.register(taskB);
  await app.start();

  app.send(InputPot.create({ value: 1 }), starter);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Both tasks should receive default data
  assertEquals(results.includes("A:"), true);
  assertEquals(results.includes("B:"), true);
});

Deno.test("next([tasks]) - массив задач без data", async () => {
  const results: string[] = [];

  const app = shibui({ logger: false });

  const taskA = app.task(InputPot)
    .name("TaskA")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ pots, finish }) => {
      results.push(`A:${pots[0].data.value}`);
      return finish();
    });

  const taskB = app.task(InputPot)
    .name("TaskB")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ pots, finish }) => {
      results.push(`B:${pots[0].data.value}`);
      return finish();
    });

  const starter = app.task(InputPot)
    .name("Starter")
    .onRule(TriggerRule.ForThisTask, InputPot)
    .do(async ({ pots, next }) => {
      // Send to multiple tasks without modifying data
      return next([taskA, taskB]);
    });

  app.register(starter);
  app.register(taskA);
  app.register(taskB);
  await app.start();

  app.send(InputPot.create({ value: 99 }), starter);

  await new Promise((resolve) => setTimeout(resolve, 200));
  app.close();

  // Both tasks should receive original data
  assertEquals(results.includes("A:99"), true);
  assertEquals(results.includes("B:99"), true);
});
