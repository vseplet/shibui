import { execute, pot, task } from "$shibui";

const SimplePot = pot("SimplePot", { value: Math.random() }, { ttl: 100 });

const mySimpleTask = task(SimplePot)
  .name("Simple Task")
  .when((data) => data.value > 0.5)
  .do(async ({ finish, pots, log }) => {
    log.dbg(`Processing value: ${pots[0].data.value}`);
    return finish();
  });

const res = await execute(mySimpleTask, [SimplePot]);
Deno.exit(res ? 0 : 1);
