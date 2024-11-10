// deno-lint-ignore-file
import { runCI, task } from "$core";

runCI(
  task()
    .name`Simple Task`
    .attempts(3)
    .interval(3000)
    .timeout(1000)
    .do(async ({ finish }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
      return finish();
    })
    .fail(async (error) => {
      console.error(`Ohhh, ${error.message}`);
    }),
);
