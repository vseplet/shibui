// deno-lint-ignore-file
import core from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/mod.ts";
import { CoreStartPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/CoreStartPot.ts";
import { ContextPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/ContextPot.ts";
import { SourceType } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/types.ts";

class UpdateVersionContext extends ContextPot<{}> {
}

const workflow = core.workflow(UpdateVersionContext)
  .name("Update Version")
  .on(CoreStartPot)
  .sq(({ task1 }) => {
    const t1 = task1()
      .name("Update versions.ts")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        return next(t2);
      });

    const t2 = task1()
      .name("Update README.md")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        return next(t3);
      });

    const t3 = task1()
      .name("Create TAG-NAME.txt")
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;

        const tagName = `v0.0.0.${Math.random() * 10000000 | 0}-test`;
        await Deno.writeTextFile("TAG-NAME.txt", tagName);
        log.inf(`generated tag in TAG-NAME.txt: ${tagName}`);
        Deno.exit(0);

        // return finish();
      });

    return t1;
  });

core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES = [
  SourceType.TASK,
];

core.api.register(workflow);
await core.api.start();
