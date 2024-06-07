/*
 * Copyright 2023 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

// https://github.com/denoland/fresh/blob/main/init.ts
import {
  CONFIRM_EMPTY_MESSAGE,
  CRON_JOB_POT_TS,
  CRON_PLUGIN_TS,
  DENO_JSON,
  DEV_TS,
  EDITOR_CONFIG,
  GITIGNORE,
  HELP_TEXT,
  INTRO_TEXT,
  // LOGGER_PLUGIN_TS,
  // LOGGER_PLUGIN_WORKER_TS,
  PROD_TS,
  SIMPLE_TASK_TS,
  SIMPLE_WORKFLOW_TS,
} from "./_strings.ts";
import { colors, join, parse, resolve } from "../../deps.ts";
import { error } from "../errors/mod.ts";

const flags = parse(Deno.args, {
  boolean: ["force", "fly"],
  default: { "force": null, "fly": null },
});

console.log(colors.brightMagenta(INTRO_TEXT));
console.log();

let unresolvedDirectory = Deno.args[0];
if (flags._.length !== 1) {
  const userInput = prompt("Please, type the Project Name", "shibui-project");
  if (!userInput) {
    error(HELP_TEXT);
  }

  unresolvedDirectory = userInput as string;
}

const resolvedDirectory = resolve(unresolvedDirectory);

try {
  const dir = [...Deno.readDirSync(resolvedDirectory)];
  const isEmpty = dir.length === 0 ||
    dir.length === 1 && dir[0].name === ".git";
  if (
    !isEmpty &&
    !(flags.force === null ? confirm(CONFIRM_EMPTY_MESSAGE) : flags.force)
  ) {
    error("Directory is not empty.");
  }
} catch (err) {
  if (!(err instanceof Deno.errors.NotFound)) {
    throw err;
  }
}

console.log(resolvedDirectory);

await Deno.mkdir(join(resolvedDirectory, "config"), { recursive: true });
await Deno.mkdir(join(resolvedDirectory, "pots"), { recursive: true });
await Deno.mkdir(join(resolvedDirectory, "tasks"), { recursive: true });
await Deno.mkdir(join(resolvedDirectory, "workflows"), { recursive: true });
await Deno.mkdir(join(resolvedDirectory, "plugins"), { recursive: true });
// await Deno.mkdir(join(resolvedDirectory, "middleware"), { recursive: true });

await Deno.writeTextFile(
  join(resolvedDirectory, "config", "dev.tuner.ts"),
  "export default {}",
);

await Deno.writeTextFile(
  join(resolvedDirectory, "config", "prod.tuner.ts"),
  "export default {}",
);

await Deno.writeTextFile(
  join(resolvedDirectory, "pots", "CronJobPot.ts"),
  CRON_JOB_POT_TS,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "tasks", "simpleTask.ts"),
  SIMPLE_TASK_TS,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "workflows", "simpleWorkflow.ts"),
  SIMPLE_WORKFLOW_TS,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "plugins", "cron.ts"),
  CRON_PLUGIN_TS,
);

// await Deno.mkdir(join(resolvedDirectory, "plugins", "logger"), {
//   recursive: true,
// });

// await Deno.writeTextFile(
//   join(resolvedDirectory, "plugins", "logger", "_worker.ts"),
//   LOGGER_PLUGIN_WORKER_TS,
// );

// await Deno.writeTextFile(
//   join(resolvedDirectory, "plugins", "logger", "logger.ts"),
//   LOGGER_PLUGIN_TS,
// );

await Deno.writeTextFile(
  join(resolvedDirectory, ".editorconfig"),
  EDITOR_CONFIG,
);

await Deno.writeTextFile(
  join(resolvedDirectory, ".gitignore"),
  GITIGNORE,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "deno.json"),
  DENO_JSON,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "dev.ts"),
  DEV_TS,
);

await Deno.writeTextFile(
  join(resolvedDirectory, "prod.ts"),
  PROD_TS,
);
