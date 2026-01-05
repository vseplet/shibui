/**
 * Example: Using send() and next() with Pots
 *
 * Demonstrates:
 * 1. send() - Fire-and-forget pot sending without finishing current task
 * 2. next(pot) - Passing PotInstance to next task
 * 3. next(PotFactory) - Passing PotFactory to auto-create with defaults
 */

import { pot, shibui, task, TriggerRule } from "@vseplet/shibui";

// Define Pots
const WorkOrder = pot("WorkOrder", { orderId: "", priority: "normal" });
const Notification = pot("Notification", { message: "" });
const Report = pot("Report", { content: "", timestamp: 0 });

const app = shibui();

// Task 1: Logger - receives notifications via send()
const logger = app.task(Notification)
  .name("Logger")
  .do(async ({ pots, log, finish }) => {
    log.inf(`📝 Notification: ${pots[0].data.message}`);
    return finish();
  });

// Task 2: Reporter - receives reports
const reporter = app.task(Report)
  .name("Reporter")
  .do(async ({ pots, log, finish }) => {
    log.inf(`📊 Report: ${pots[0].data.content} (${new Date(pots[0].data.timestamp).toISOString()})`);
    return finish();
  });

// Task 3: Processor - demonstrates send() usage
const processor = app.task(WorkOrder)
  .name("Processor")
  .onRule(TriggerRule.ForThisTask, WorkOrder)
  .do(async ({ pots, send, next, log }) => {
    const order = pots[0];
    log.inf(`🔧 Processing order: ${order.data.orderId}`);

    // Send notification (fire-and-forget, doesn't block)
    send(Notification.create({
      message: `Started processing order ${order.data.orderId}`
    }), logger);

    // Continue processing...
    log.inf(`⚙️  Working on order ${order.data.orderId}...`);

    // Pass Report using PotInstance (custom data)
    return next(finalizer, Report.create({
      content: `Order ${order.data.orderId} processed successfully`,
      timestamp: Date.now(),
    }));
  });

// Task 4: Finalizer - demonstrates next(PotFactory)
const finalizer = app.task(Report)
  .name("Finalizer")
  .onRule(TriggerRule.ForThisTask, Report)
  .do(async ({ pots, send, next, log }) => {
    const report = pots[0];
    log.inf(`✅ Finalizing: ${report.data.content}`);

    // Send notification about completion
    send(Notification.create({
      message: "Workflow completed!",
    }), logger);

    // Pass report to reporter using PotFactory (uses default data)
    // This creates Report with default content and timestamp
    return next(reporter, Report);
  });

// Register all tasks
app.register(logger);
app.register(reporter);
app.register(processor);
app.register(finalizer);

// Start the engine
await app.start();

// Send a work order
console.log("\n🚀 Starting workflow...\n");
app.send(WorkOrder.create({ orderId: "ORD-12345", priority: "high" }), processor);

// Wait for execution
await new Promise((resolve) => setTimeout(resolve, 2000));

app.close();
console.log("\n✨ Workflow finished!\n");
