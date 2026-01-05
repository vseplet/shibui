import { assertEquals } from "jsr:@std/assert";
import { pot, shibui, task } from "$shibui";

const TestPot = pot("TestPot", { value: 0 });
const Notification = pot("Notification", { message: "" });

Deno.test("send() - устанавливает from.task из текущей задачи", async () => {
  let receivedPot: any = null;

  const receiver = task(Notification)
    .name("Receiver")
    .do(async ({ pots, finish }) => {
      receivedPot = pots[0];
      return finish();
    });

  const sender = task(TestPot)
    .name("Sender")
    .do(async ({ send, finish }) => {
      send(Notification.create({ message: "test" }), receiver);
      return finish();
    });

  const app = shibui({ logger: false });
  app.register(sender);
  app.register(receiver);
  await app.start();

  app.send(TestPot.create({ value: 1 }), sender);

  // Wait for execution
  await new Promise((resolve) => setTimeout(resolve, 100));

  app.close();

  // Verify routing
  assertEquals(receivedPot.from.task, "Sender");
  assertEquals(receivedPot.to.task, "Receiver");
});

Deno.test("send() - устанавливает from.task при использовании PotFactory", async () => {
  let receivedPot: any = null;

  const receiver = task(Notification)
    .name("ReceiverFactory")
    .do(async ({ pots, finish }) => {
      receivedPot = pots[0];
      return finish();
    });

  const sender = task(TestPot)
    .name("SenderFactory")
    .do(async ({ send, finish }) => {
      // Send PotFactory (auto-creates)
      send(Notification, receiver);
      return finish();
    });

  const app = shibui({ logger: false });
  app.register(sender);
  app.register(receiver);
  await app.start();

  app.send(TestPot.create({ value: 1 }), sender);

  await new Promise((resolve) => setTimeout(resolve, 100));

  app.close();

  // Verify routing with PotFactory
  assertEquals(receivedPot.from.task, "SenderFactory");
  assertEquals(receivedPot.to.task, "ReceiverFactory");
});

Deno.test("send() - устанавливает from.workflow если задача в workflow", async () => {
  // TODO: test workflow routing
});
