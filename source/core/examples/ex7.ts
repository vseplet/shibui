// deno-lint-ignore-file
import { execute, task } from "$core";

const simpleTask = task()
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
  });

const res = await execute(simpleTask, [], {});

Deno.exit(res ? 1 : -1);
