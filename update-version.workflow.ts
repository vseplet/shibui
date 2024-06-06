// deno-lint-ignore-file
import core from "https://deno.land/x/shibui@v15/core/mod.ts";
import {
  ContextPot,
  CoreStartPot,
} from "https://deno.land/x/shibui@v15/core/pots/mod.ts";
import { SourceType } from "https://deno.land/x/shibui@v15/core/types.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { sh } from "https://deno.land/x/shelly@v0.1.1/mod.ts";

const versionsFilePath = "./source/versions.ts";
const versionsExportPattern = /export default \[\s*([\s\S]*?)\s*\];/;
const mdUrlPattern = /https:\/\/deno\.land\/x\/shibui@[^/]+\//;
const mdUrlReplacePattern = /@[^/]+\//;

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
        const oldVersionsTS = await Deno.readTextFile(versionsFilePath);
        let newVersionsTS = "";
        const match = oldVersionsTS.match(versionsExportPattern);

        if (match && match[1]) {
          const versions = match[1]
            .split(",")
            .map((version) => version.trim().replace(/"/g, ""))
            .filter((version) => version !== "");

          const currentVersionNumber = parseInt(
            versions[0].substring(1),
            10,
          );
          ctx.data.version = `v${currentVersionNumber + 1}`;

          newVersionsTS = `export default [ ${
            [ctx.data.version, ...versions].map((version) => `"${version}"`)
              .join(", ")
          } ];\n`;
        } else {
          newVersionsTS = `export default ["${ctx.data.version}"];`;
        }

        await Deno.writeTextFile(versionsFilePath, newVersionsTS);

        log.inf(ctx.data.version);
        return next(t2, {
          version: ctx.data.version,
        });
      });

    const t2 = task1()
      .name("Update imports in .md files")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;

        for await (
          const entry of walk(".", {
            exts: ["md"],
            skip: [/node_modules/, /build/, /.docusaurus/],
          })
        ) {
          if (entry.isFile) {
            const fileContent = await Deno.readTextFile(entry.path);
            const updatedContent = fileContent.replace(
              mdUrlPattern,
              (match) => {
                return match.replace(
                  mdUrlReplacePattern,
                  `@${ctx.data.version}/`,
                );
              },
            );

            if (fileContent !== updatedContent) {
              await Deno.writeTextFile(entry.path, updatedContent);
              log.trc(`file ${entry.path} updates.`);
            }
          }
        }

        log.inf(ctx.data.version);
        return next(t3);
      });

    const t3 = task1()
      .name("Commit and push changes")
      .do(async ({ pots, log, next }) => {
        const [ctx] = pots;
        console.log((await sh("git add -A")).stderr);
        console.log(
          (await sh(
            `git commit -m "Apply changes from update-version.ts script"`,
          )).stderr,
        );
        console.log((await sh("git push origin main")).stderr);

        log.inf(ctx.data.version);
        return next(t4);
      });

    const t4 = task1()
      .name("Create and push tag")
      .do(async ({ pots, log }) => {
        const [ctx] = pots;
        console.log((await sh(`git tag ${ctx.data.version}`)).stderr);
        console.log((await sh(`git push origin ${ctx.data.version}`)).stderr);

        log.inf(ctx.data.version);
        Deno.exit(0);
      });

    return t1;
  });

core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES = [
  SourceType.TASK,
];

core.api.register(workflow);
await core.api.start();
