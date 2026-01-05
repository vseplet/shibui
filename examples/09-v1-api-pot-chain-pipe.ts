import { chain, context, execute, pipe, pot, task } from "$shibui";

// pot() - data containers
const Counter = pot("Counter", { value: 0 });
const Message = pot("Message", { text: "", from: "" }, { ttl: 100 });

// context() - workflow contexts
const WorkflowCtx = context("MyWorkflow", { count: 0, status: "pending" });

console.log("Counter instance:", Counter.create({ value: 42 }));
console.log("Message instance:", Message.create({ text: "Hello" }));
console.log("Context instance:", WorkflowCtx.create({ count: 5 }));

// pipe() - functional composition
const transform = pipe(
  (d: { value: number }) => ({ value: d.value + 1 }),
  (d) => ({ value: d.value * 2 }),
  (d) => ({ value: Math.min(d.value, 100) }),
);

console.log("\npipe() examples:");
console.log("Transform 10:", transform({ value: 10 }));
console.log("Transform 50:", transform({ value: 50 }));

// Task with .on(), .retry(), .catch()
const NumberPot = pot("NumberPot", { value: 0 });

const processTask = task(NumberPot)
  .name("Process Number")
  .on(
    NumberPot,
    ({ pot, allow, deny }) => pot.data.value > 0 ? allow() : deny(),
  )
  .retry({ attempts: 3, interval: 100, timeout: 5000 })
  .do(async ({ pots, finish, log }) => {
    const value = pots[0].data.value;
    log.inf(`Processing value: ${value}`);
    const result = transform({ value });
    log.inf(`Transformed to: ${result.value}`);
    return finish();
  })
  .catch(async (error) => {
    console.error(`Task failed: ${error.message}`);
  });

// chain() - task pipelines
const ChainPot = pot("ChainPot", { value: 0 });

const task1 = task(ChainPot)
  .name("Start")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`Start: ${chainPot.data.value}`);
    return finish();
  });

const task2 = task(ChainPot)
  .name("Process")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`Process: ${chainPot.data.value}`);
    return finish();
  });

const task3 = task(ChainPot)
  .name("End")
  .do(async ({ pots: [chainPot], log, finish }) => {
    log.inf(`End: ${chainPot.data.value}`);
    return finish();
  });

const pipeline = chain(task1, task2, task3);
console.log("\nChain:", pipeline.name);

// Execute
console.log("\n--- Executing processTask ---");
const result = await execute(
  processTask,
  [NumberPot.create({ value: 10 })],
  { logger: false },
);
console.log(`Execution ${result ? "succeeded" : "failed"}`);
