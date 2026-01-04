import shibui, { ConsoleLogger, pipe, pot, task } from "$shibui";

const c = shibui({ logger: new ConsoleLogger({ level: "debug" }) });

const PotA = pot("PotA", { value: 1 });
const PotB = pot("PotB", { value: 2 });
const PotC = pot("PotC", { value: 3 });
const PotD = pot("PotD", { value: 4 });
const PotE = pot("PotE", { value: 5 });

const pots = [PotA, PotB, PotC, PotD, PotE];

const doubleAndSum = pipe(
  (values: number[]) => values.map((v) => v * 2),
  (values) => values.reduce((a, b) => a + b, 0),
);

const mySimpleTask = task(PotA, PotB, PotC, PotD, PotE)
  .name("Simple Task")
  .retry({ attempts: 2, timeout: 60000 })
  .do(async ({ finish, pots, log }) => {
    log.dbg(`Received all 5 pots!`);

    const sum = pots.reduce((acc, pot) => acc + pot.data.value, 0);
    log.dbg(`Total sum: ${sum}`);

    const values = pots.map((p) => p.data.value);
    const doubledSum = doubleAndSum(values);
    log.dbg(`Doubled sum: ${doubledSum}`);

    return finish();
  })
  .catch(async (error) => {
    console.error(`Task failed: ${error.message}`);
  });

c.register(mySimpleTask);
await c.start();

for (const pot of pots) {
  c.send(pot);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
