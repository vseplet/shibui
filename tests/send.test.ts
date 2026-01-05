import { assertEquals } from "jsr:@std/assert";
import { execute, pot, task } from "$shibui";

const TestPot = pot("TestPot", { value: 0 });
const AnotherPot = pot("AnotherPot", { data: "default" });

Deno.test("send() - метод доступен в do handler", async () => {
  let sendExists = false;

  const t = task(TestPot)
    .name("Test")
    .do(async ({ send, finish }) => {
      sendExists = typeof send === "function";
      return finish();
    });

  await execute(t, [TestPot.create({ value: 1 })], { logger: false });
  assertEquals(sendExists, true);
});

Deno.test("next(pot) - передача PotInstance", async () => {
  let receivedValue = "";

  const step2 = task(AnotherPot)
    .name("Step2")
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.data;
      return finish();
    });

  const step1 = task(TestPot)
    .name("Step1")
    .do(async ({ next }) => {
      return next(step2, AnotherPot.create({ data: "custom" }));
    });

  await execute(step1, [TestPot.create({ value: 1 })], { logger: false });
  assertEquals(receivedValue, "custom");
});

Deno.test("next(potFactory) - передача PotFactory", async () => {
  let receivedValue = "";

  const step2 = task(AnotherPot)
    .name("Step2")
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.data;
      return finish();
    });

  const step1 = task(TestPot)
    .name("Step1")
    .do(async ({ next }) => {
      // Передаем PotFactory напрямую без .create()
      return next(step2, AnotherPot);
    });

  await execute(step1, [TestPot.create({ value: 1 })], { logger: false });
  assertEquals(receivedValue, "default"); // Использует данные по умолчанию
});

Deno.test("next(data) - старый способ все еще работает", async () => {
  let receivedValue = 0;

  const step2 = task(TestPot)
    .name("Step2")
    .do(async ({ pots, finish }) => {
      receivedValue = pots[0].data.value;
      return finish();
    });

  const step1 = task(TestPot)
    .name("Step1")
    .do(async ({ pots, next }) => {
      return next(step2, { value: pots[0].data.value * 2 });
    });

  await execute(step1, [TestPot.create({ value: 10 })], { logger: false });
  assertEquals(receivedValue, 20);
});
