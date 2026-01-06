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

    log.inf(`📦 Processing item #${value}...`);

    // Simulate longer work to see pots in queue
    await new Promise((resolve) => setTimeout(resolve, 2000));

    log.inf(`✅ Completed processing item #${value}`);
    return finish();
  });

app.register(processor);
await app.start();

console.log("\n📊 Dashboard available at: http://localhost:3000\n");
console.log("Sending bursts of data to see queue...\n");

// Send bursts of data to fill the queue
let counter = 0;
const sendBurst = () => {
  console.log(`\n🚀 Sending burst of 5 items...`);
  for (let i = 0; i < 5; i++) {
    counter++;
    app.send(Data.create({ value: counter }), processor);
  }
};

// Send initial burst
sendBurst();

// Send bursts every 8 seconds
const interval = setInterval(() => {
  sendBurst();

  if (counter >= 20) {
    clearInterval(interval);
    console.log("\n✨ Demo completed. Press Ctrl+C to exit.\n");
  }
}, 8000);

// Keep process alive
await new Promise(() => {});
