import { runCI, task } from "$shibui";

runCI(
  task()
    .name("Timeout Example Task")
    .retry({
      attempts: 3,
      interval: 3000,
      timeout: 1000,
    })
    .do(async ({ finish, log }) => {
      log.inf("Task started, will sleep for 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
      return finish();
    })
    .catch(async (error) => {
      console.error(`Task failed after all attempts: ${error.message}`);
    }),
);
