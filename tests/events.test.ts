import { assertEquals } from "jsr:@std/assert";
import {
  ContextPot,
  core,
  type execute,
  InternalPot,
  type task,
  TaskFailedEvent,
  TaskFinishedEvent,
  type workflow,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$shibui";

Deno.test("Events - TaskFinishedEvent on success", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let eventFired = false;

  c.emitters.coreEventEmitter.addListenerByName(
    TaskFinishedEvent,
    () => {
      eventFired = true;
    },
  );

  const t = c.task(TestPot)
    .name("Event Test Task")
    .do(async ({ finish }) => finish());

  c.register(t);
  await c.start();
  c.send(new TestPot());

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(eventFired, true);

  c.close();
});

Deno.test("Events - TaskFailedEvent on failure", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let eventFired = false;

  c.emitters.coreEventEmitter.addListenerByName(
    TaskFailedEvent,
    () => {
      eventFired = true;
    },
  );

  const t = c.task(TestPot)
    .name("Failing Task")
    .do(async ({ fail }) => fail("Intentional failure"));

  c.register(t);
  await c.start();
  c.send(new TestPot());

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(eventFired, true);

  c.close();
});

Deno.test("Events - WorkflowFinishedEvent on success", async () => {
  class MyContext extends ContextPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let eventFired = false;

  c.emitters.coreEventEmitter.addListenerByName(
    WorkflowFinishedEvent,
    () => {
      eventFired = true;
    },
  );

  const wf = c.workflow(MyContext)
    .name("Event Workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ finish }) => finish());
      return t1;
    });

  c.register(wf);
  await c.start();

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(eventFired, true);

  c.close();
});

Deno.test("Events - WorkflowFailedEvent on failure", async () => {
  class MyContext extends ContextPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let eventFired = false;

  c.emitters.coreEventEmitter.addListenerByName(
    WorkflowFailedEvent,
    () => {
      eventFired = true;
    },
  );

  const wf = c.workflow(MyContext)
    .name("Failing Workflow")
    .sq(({ task }) => {
      const t1 = task()
        .name("Task 1")
        .do(async ({ fail }) => fail("Workflow failed"));
      return t1;
    });

  c.register(wf);
  await c.start();

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(eventFired, true);

  c.close();
});

Deno.test("Events - log events emitted", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: true } });

  const logMessages: string[] = [];

  c.emitters.logEventEmitter.addListener((event: any) => {
    if (event.msg) {
      logMessages.push(event.msg);
    }
  });

  const t = c.task(TestPot)
    .name("Logger Task")
    .do(async ({ log, finish }) => {
      log.inf("Info message");
      log.wrn("Warning message");
      log.err("Error message");
      return finish();
    });

  c.register(t);
  await c.start();
  c.send(new TestPot());

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(logMessages.includes("Info message"), true);
  assertEquals(logMessages.includes("Warning message"), true);
  assertEquals(logMessages.includes("Error message"), true);

  c.close();
});

Deno.test("Events - multiple listeners", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let listener1Called = false;
  let listener2Called = false;

  c.emitters.coreEventEmitter.addListenerByName(
    TaskFinishedEvent,
    () => {
      listener1Called = true;
    },
  );

  c.emitters.coreEventEmitter.addListenerByName(
    TaskFinishedEvent,
    () => {
      listener2Called = true;
    },
  );

  const t = c.task(TestPot)
    .name("Multi Listener Task")
    .do(async ({ finish }) => finish());

  c.register(t);
  await c.start();
  c.send(new TestPot());

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(listener1Called, true);
  assertEquals(listener2Called, true);

  c.close();
});

Deno.test("Events - event contains metadata", async () => {
  class TestPot extends InternalPot<{ value: number }> {
    override data = { value: 0 };
  }

  const c = core({ kv: { inMemory: true }, logger: { enable: false } });

  let eventData: any = null;

  c.emitters.coreEventEmitter.addListenerByName(
    TaskFinishedEvent,
    (event: any) => {
      eventData = event;
    },
  );

  const t = c.task(TestPot)
    .name("Metadata Task")
    .do(async ({ finish }) => finish());

  c.register(t);
  await c.start();
  c.send(new TestPot());

  await new Promise((resolve) => setTimeout(resolve, 500));

  assertEquals(eventData !== null, true);
  assertEquals(eventData.name, "TaskFinishedEvent");
  assertEquals(eventData.type, "CORE");
  assertEquals(typeof eventData.timestamp, "number");

  c.close();
});
