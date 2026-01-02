import {
  core,
  execute,
  getRuntimeInfo,
  pot,
  task,
} from "@vseplet/shibui";

// Show runtime info
console.log("Runtime:", getRuntimeInfo());

// Define a pot (data container)
const Counter = pot("Counter", { value: 0 });

// Define a simple task
const incrementTask = task(Counter)
  .name("Increment")
  .do(async ({ pots, log, finish }) => {
    const current = pots[0].data.value;
    log.inf(`Current value: ${current}`);
    log.inf(`Incremented to: ${current + 1}`);
    return finish();
  });

// Execute the task
console.log("\n--- Running task ---\n");

const result = await execute(
  incrementTask,
  [Counter.create({ value: 42 })],
  { storage: "memory", logging: true },
);

console.log("\n--- Result ---");
console.log("Success:", result);
