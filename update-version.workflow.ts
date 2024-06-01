// deno-lint-ignore-file
import core from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/mod.ts";
import { CoreStartPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/CoreStartPot.ts";
import { ContextPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/ContextPot.ts";
import { SourceType } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/types.ts";

const filePath = "./source/versions.ts";

class UpdateVersionContext extends ContextPot<{}> {
  data = {
    version: "v1",
  };
}

const workflow = core.workflow(UpdateVersionContext)
  .name("Update Version")
  .on(CoreStartPot)
  .sq(({ task1 }) => {
    const t1 = task1()
      .name("Update versions.ts")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        const data = await Deno.readTextFile(filePath);
        const regex = /export default \[\s*([\s\S]*?)\s*\];/;
        const match = data.match(regex);

        if (match && match[1]) {
          const versions = match[1]
            .split(",")
            .map((version) => version.trim().replace(/"/g, ""))
            .filter((version) => version !== "");

          const latestVersion = versions[0];
          const currentVersionNumber = parseInt(
            latestVersion.substring(1),
            10,
          );
          ctx.data.version = `v${currentVersionNumber + 1}`;

          const newContent = `export default [ ${
            [ctx.data.version, ...versions].map((version) => `"${version}"`)
              .join(
                ", ",
              )
          } ];`;

          await Deno.writeTextFile(filePath, newContent);
        } else {
          const newContent = `export default ["${ctx.data.version}"];`;
          await Deno.writeTextFile(filePath, newContent);
        }

        log.inf(ctx.data.version);
        return next(t2, {
          version: ctx.data.version,
        });
      });

    const t2 = task1()
      .name("Update README.md")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        log.inf(ctx.data.version);

        return next(t3);
      });

    const t3 = task1()
      .name("Create TAG-NAME.txt")
      .do(async ({ pots, log, finish }) => {
        const [ctx] = pots;
        await Deno.writeTextFile("TAG-NAME.txt", ctx.data.version);
        log.inf(`generated tag in TAG-NAME.txt: ${ctx.data.version}`);
        Deno.exit(0);
      });

    return t1;
  });

core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES = [
  SourceType.TASK,
];

core.api.register(workflow);
await core.api.start();
