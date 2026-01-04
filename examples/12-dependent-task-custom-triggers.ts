/**
 * Example: Dependent Task with Custom Triggers per Slot
 *
 * This example demonstrates a task that depends on 3 different pots,
 * with a custom trigger (validation) for each pot.
 *
 * Use case: Order processing that requires User, Payment, and Inventory data,
 * each validated before the task executes.
 */

import shibui, { ConsoleLogger, pot, task } from "$shibui";

const c = shibui({ logger: new ConsoleLogger({ level: "info" }) });

// Define 3 different pot types
const UserPot = pot("UserPot", { userId: "", verified: false });
const PaymentPot = pot("PaymentPot", { amount: 0, currency: "USD" });
const InventoryPot = pot("InventoryPot", { itemId: "", inStock: false });

// Task that waits for all 3 pots with custom validation on each
const processOrder = task(UserPot, PaymentPot, InventoryPot)
  .name("Process Order")
  // Trigger for UserPot - only accept verified users
  .on(UserPot, ({ pot, allow, deny, log }) => {
    if (pot.data.verified) {
      log.inf(`User ${pot.data.userId} is verified - accepting`);
      return allow(0); // slot 0
    }
    log.wrn(`User ${pot.data.userId} is NOT verified - rejecting`);
    return deny();
  }, 0)
  // Trigger for PaymentPot - only accept payments > $10
  .on(PaymentPot, ({ pot, allow, deny, log }) => {
    if (pot.data.amount >= 10) {
      log.inf(`Payment of ${pot.data.amount} ${pot.data.currency} accepted`);
      return allow(1); // slot 1
    }
    log.wrn(`Payment of ${pot.data.amount} is too low - rejecting`);
    return deny();
  }, 1)
  // Trigger for InventoryPot - only accept if item is in stock
  .on(InventoryPot, ({ pot, allow, deny, log }) => {
    if (pot.data.inStock) {
      log.inf(`Item ${pot.data.itemId} is in stock - accepting`);
      return allow(2); // slot 2
    }
    log.wrn(`Item ${pot.data.itemId} is OUT OF STOCK - rejecting`);
    return deny();
  }, 2)
  .do(async ({ pots, log, finish }) => {
    const [user, payment, inventory] = pots;

    log.inf("=== Processing Order ===");
    log.inf(`User: ${user.data.userId}`);
    log.inf(`Payment: ${payment.data.amount} ${payment.data.currency}`);
    log.inf(`Item: ${inventory.data.itemId}`);
    log.inf("Order processed successfully!");

    return finish();
  });

c.register(processOrder);
await c.start();

// Send pots in any order - task will wait for all 3
// All validations pass:
c.send(UserPot.create({ userId: "user-123", verified: true }));
c.send(PaymentPot.create({ amount: 99.99, currency: "USD" }));
c.send(InventoryPot.create({ itemId: "WIDGET-42", inStock: true }));

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 2000));

c.close();
