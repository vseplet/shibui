/**
 * Example 7: Timeout and Retry Mechanism
 *
 * Demonstrates:
 * - Setting task timeout
 * - Configuring retry attempts
 * - Setting retry interval
 * - Using fail handler for error logging
 * - Using runCI for test/CI environments
 */

import { runCI, task } from "$shibui";

/**
 * This task will timeout because it sleeps for 10 seconds
 * but has a 1 second timeout configured
 *
 * It will retry 3 times with 3 second intervals between attempts
 */
runCI(
  task()
    .name("Timeout Example Task")
    .attempts(3) // Retry up to 3 times
    .interval(3000) // Wait 3 seconds between retries
    .timeout(1000) // Timeout after 1 second
    .do(async ({ finish, log }) => {
      log.inf("Task started, will sleep for 10 seconds...");

      // This will cause timeout (10s > 1s timeout)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10));

      // This line will never be reached due to timeout
      return finish();
    })
    .fail(async (error) => {
      // This will be called after all retry attempts fail
      console.error(`Task failed after all attempts: ${error.message}`);
    }),
);

/**
 * Expected behavior:
 * 1. Task starts, logs "Task started..."
 * 2. After 1 second, timeout occurs
 * 3. Retry attempt 1 (wait 3s)
 * 4. Timeout again
 * 5. Retry attempt 2 (wait 3s)
 * 6. Timeout again
 * 7. Retry attempt 3 (wait 3s)
 * 8. Timeout again
 * 9. fail() handler is called with error
 * 10. Process exits with error code
 */
