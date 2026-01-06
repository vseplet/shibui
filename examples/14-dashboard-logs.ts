import { pot, shibui, task, TriggerRule } from "../source/mod.ts";

const Data = pot("Data", { value: 0 });

const app = shibui({
  dashboard: true, // Enable dashboard on port 3000
});

const processor = app.task(Data)
  .name("Processor")
  .onRule(TriggerRule.ForThisTask, Data)
  .do(async ({ pots, log, finish }) => {
    const value = pots[0].data.value;

    log.trc(`Trace: Processing value ${value}`);
    log.dbg(`Debug: Value details: ${value}`);
    log.vrb(`Verbose: Starting processing...`);
    log.inf(`Info: Processing item #${value}`);

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (value % 3 === 0) {
      log.wrn(`Warning: Value ${value} is divisible by 3`);
    }

    if (value % 5 === 0) {
      log.err(`Error: Value ${value} is divisible by 5`);
    }

    log.inf(`✅ Completed processing item #${value}`);
    return finish();
  });

app.register(processor);
await app.start();

console.log("\n📊 Dashboard available at: http://localhost:3000\n");
console.log("Sending data every 2 seconds...\n");

// Send data periodically to generate logs
let counter = 0;
const interval = setInterval(() => {
  counter++;
  app.send(Data.create({ value: counter }), processor);

  if (counter >= 20) {
    clearInterval(interval);
    console.log("\n✨ Demo completed. Press Ctrl+C to exit.\n");
  }
}, 2000);

// Keep process alive
await new Promise(() => {});
