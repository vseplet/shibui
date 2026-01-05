import { assertEquals } from "jsr:@std/assert";
import { pot, shibui, task, TriggerRule } from "$shibui";

const TestPot = pot("TestPot", { value: 0 });
const AnotherPot = pot("AnotherPot", { data: "default" });

Deno.test("send() - метод доступен в do handler", async () => {
  let sendExists = false;

  const app = shibui({ logger: false });

  const t = app.task(TestPot)
    .name("Test")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ send, finish }) => {
      sendExists = typeof send === "function";
      return finish();
    });

  app.register(t);
  await app.start();

  app.send(TestPot.create({ value: 1 }), t);

  await new Promise((resolve) => setTimeout(resolve, 100));
  app.close();

  assertEquals(sendExists, true);
});

Deno.test("next(pot) - передача PotInstance", async () => {
  let receivedValue = "";

  const app = shibui({ logger: false });

  const step2 = app.task(AnotherPot)
    .name("Step2")
    .onRule(TriggerRule.ForThisTask, AnotherPot)
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.data;
      return finish();
    });

  const step1 = app.task(TestPot)
    .name("Step1")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ next }) => {
      return next(step2, AnotherPot.create({ data: "custom" }));
    });

  app.register(step1);
  app.register(step2);
  await app.start();

  app.send(TestPot.create({ value: 1 }), step1);

  await new Promise((resolve) => setTimeout(resolve, 100));
  app.close();

  assertEquals(receivedValue, "custom");
});

Deno.test("next(potFactory) - передача PotFactory", async () => {
  let receivedValue = "";

  const app = shibui({ logger: false });

  const step2 = app.task(AnotherPot)
    .name("Step2")
    .onRule(TriggerRule.ForThisTask, AnotherPot)
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.data;
      return finish();
    });

  const step1 = app.task(TestPot)
    .name("Step1")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ next }) => {
      // Передаем PotFactory напрямую без .create()
      return next(step2, AnotherPot);
    });

  app.register(step1);
  app.register(step2);
  await app.start();

  app.send(TestPot.create({ value: 1 }), step1);

  await new Promise((resolve) => setTimeout(resolve, 100));
  app.close();

  assertEquals(receivedValue, "default"); // Использует данные по умолчанию
});

Deno.test("next(data) - старый способ все еще работает", async () => {
  let receivedValue = 0;

  const app = shibui({ logger: false });

  const step2 = app.task(TestPot)
    .name("Step2")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.value;
      return finish();
    });

  const step1 = app.task(TestPot)
    .name("Step1")
    .onRule(TriggerRule.ForThisTask, TestPot)
    .do(async ({ pots, next }) => {
      return next(step2, { value: pots[0].data.value * 2 });
    });

  app.register(step1);
  app.register(step2);
  await app.start();

  app.send(TestPot.create({ value: 10 }), step1);

  await new Promise((resolve) => setTimeout(resolve, 100));
  app.close();

  assertEquals(receivedValue, 20);
});
