import { execute, pot, task } from "$shibui";

const SimplePot = pot("SimplePot", { value: Math.random() }, { ttl: 100 });

const mySimpleTask = task(SimplePot)
  .name("Simple Task")
  .on(
    SimplePot,
    ({ pot, allow, deny }) => pot.data.value > 0.5 ? allow() : deny(),
  )
  .do(async ({ finish, pots, log, next }) => {
    log.dbg(`Processing value: ${pots[0].data.value}`);

    return finish();
  });

const res = await execute(mySimpleTask, [SimplePot]);
Deno.exit(res ? 0 : 1);
