// deno-lint-ignore-file
import { InternalPot } from "../pots/InternalPot.ts";
import core from "../mod.ts";
import { SourceType } from "../types.ts";

class SimplePot extends InternalPot<{ value: number }> {
  ttl = 5;
  data = {
    value: Math.random(),
  };
}

const task = core.task(SimplePot)
  .name`Simple Task`
  .on(SimplePot, ({ allow, deny, pots, log }) => {
    log.dbg(`run test function... `);
    return Math.random() > 0.7 ? allow() : deny();
  })
  .do(async ({ finish, pots, log }) => {
    log.dbg(`run do function...`);
    log.dbg(`value: ${pots[0].data.value}`);

    return finish();
  });

core.api.settings.DEFAULT_LOGGING_LEVEL = 0;
core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES = [
  SourceType.TASK,
  // SourceType.CORE,
];

core.api.register(task);
core.api.send(new SimplePot());
core.api.start();
