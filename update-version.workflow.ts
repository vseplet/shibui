// deno-lint-ignore-file
import core from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/mod.ts";
import { CoreStartPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/CoreStartPot.ts";
import { ContextPot } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/pots/ContextPot.ts";
import { SourceType } from "https://deno.land/x/shibui@v0.3.0.4-alpha/core/types.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { sh } from "https://deno.land/x/shelly@v0.1.1/mod.ts";

const versionsFilePath = "./source/versions.ts";
const mdUrlPattern = /https:\/\/deno\.land\/x\/shibui@[^/]+\//;

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
        const data = await Deno.readTextFile(versionsFilePath);
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

          await Deno.writeTextFile(versionsFilePath, newContent);
        } else {
          const newContent = `export default ["${ctx.data.version}"];`;
          await Deno.writeTextFile(versionsFilePath, newContent);
        }

        log.inf(ctx.data.version);
        return next(t2, {
          version: ctx.data.version,
        });
      });

    const t2 = task1()
      .name("Update all links in .md files")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        for await (const entry of walk(".", { exts: ["md"] })) {
          if (entry.isFile) {
            const fileContent = await Deno.readTextFile(entry.path);
            const updatedContent = fileContent.replace(
              mdUrlPattern,
              (match) => {
                return match.replace(/@[^/]+\//, `@${ctx.data.version}/`);
              },
            );

            if (fileContent !== updatedContent) {
              await Deno.writeTextFile(entry.path, updatedContent);
              log.trc(`file ${entry.path} updates.`);
            }
          }
        }

        return next(t3);
      });

    const t3 = task1()
      .name("Create TAG-NAME.txt")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;
        await Deno.writeTextFile("TAG-NAME.txt", ctx.data.version);
        log.inf(`generated tag in TAG-NAME.txt: ${ctx.data.version}`);
        return next(t4);
      });

    const t4 = task1()
      .name("Commit and push changes")
      .do(async ({ log, next }) => {
        console.log(await sh("git add -A"));
        console.log(
          (await sh(
            `git commit -m "Apply changes from update-version.ts script"`,
          )).stderr,
        );
        console.log(await sh("git push origin main"));
        return next(t5);
      });

    const t5 = task1()
      .name("Push tag to repository")
      .do(async ({ pots, log }) => {
        const [ctx] = pots;
        console.log(await sh(`git tag ${ctx.data.version}`));
        console.log(await sh("git push origin main"));
        Deno.exit(0);
      });

    return t1;
  });

core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES = [
  SourceType.TASK,
];

core.api.register(workflow);
await core.api.start();
