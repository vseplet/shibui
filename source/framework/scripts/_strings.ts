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

import versions from "../../versions.ts";

// https://patorjk.com/software/taag/#p=display&h=0&f=ANSI%20Shadow&t=shibui%0ACORE
export const INTRO_TEXT = `
███████╗██╗  ██╗██╗██████╗ ██╗   ██╗██╗
██╔════╝██║  ██║██║██╔══██╗██║   ██║██║
███████╗███████║██║██████╔╝██║   ██║██║
╚════██║██╔══██║██║██╔══██╗██║   ██║██║
███████║██║  ██║██║██████╔╝╚██████╔╝██║
╚══════╝╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚═╝

███████╗██████╗  █████╗ ███╗   ███╗███████╗██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗
██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝
█████╗  ██████╔╝███████║██╔████╔██║█████╗  ██║ █╗ ██║██║   ██║██████╔╝█████╔╝
██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ██║███╗██║██║   ██║██╔══██╗██╔═██╗
██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝ ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝

version: ${versions[0]}
`;

export const HELP_TEXT = `
Initialize a new SHIBUI project. This will create all the necessary files for a
new project.

To generate a project in the './foobar' subdirectory:
  init ./foobar

To generate a project in the current directory:
  init .

USAGE:
    init [DIRECTORY]

OPTIONS:
    --force  Overwrite existing files
    --fly
`;

export const CONFIRM_EMPTY_MESSAGE =
  "The target directory is not empty (files could get overwritten). Do you want to continue anyway?";

export const GITIGNORE = `# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local
.DS_Store
.vscode

# SHIBUI build directory
_shibui/
`;

const baseImportPath = `jsr:@vseplet/shibui@${versions[0]}`;

export const DENO_JSON = `
{
  "lock": false,
  "tasks": {
    "dev": "deno run --allow-all --unstable-broadcast-channel --unstable-kv ./dev.ts",
    "prod": "deno run --allow-all --unstable-broadcast-channel --unstable-kv ./prod.ts"
  },

  "imports": {
    "$std/": "https://deno.land/std@0.224.0/",
    "shibui": "jsr:@vseplet/shibui@0.4.3"
  }
}
`;

export const DEV_TS = `// dev file ...
import dev from "shibui/framework/runtime/dev";
import logger from "shibui/framework/plugins/luminous";

await dev(import.meta.url, [logger]);
`;

export const PROD_TS = `// prod file ...
import prod from "shibui/framework/runtime/prod";
import manifest from "./shibui.manifest.ts";
import logger from "shibui/framework/plugins/luminous";

await prod(manifest, [logger]);
`;

export const SIMPLE_TASK_TS = `import shibui from "shibui/framework";
import { CronJobPot } from "../pots/CronJobPot.ts";

const task = shibui.task(CronJobPot)
  .name("Simple Task")
  .on(CronJobPot)
  // deno-lint-ignore require-await
  .do(async ({ finish, log }) => {
    log.inf("Hello, Simple Task!");
    return finish();
  });

export default task;
`;

export const SIMPLE_WORKFLOW_TS = `import shibui from "shibui/framework";
import { CoreStartPot, ContextPot } from "shibui/core/pots";

class SimpleWorkflowContext extends ContextPot<{ message: string }> {
  data = {
    message: "Hello, Simple Workflow!",
  };
}

const workflow = shibui.workflow(SimpleWorkflowContext)
  .name("Simple Workflow")
  .on(CoreStartPot)
  .sq(({ task1 }) => {
    const t1 = task1()
      .name("First Task")
      // deno-lint-ignore require-await
      .do(async ({ pots, finish, log }) => {
        log.inf(pots[0].data.message);
        return finish();
      });

    return t1;
  });

export default workflow;

`;

export const CRON_JOB_POT_TS = `import { InternalPot } from "shibui/core/pots";

export class CronJobPot extends InternalPot<{ pattern: string; target: string }> {
}
`;

export const CRON_PLUGIN_TS = `import shibui from "shibui/framework";
import { Cron } from "https://deno.land/x/croner@6.0.3/dist/croner.js";
import { CronJobPot } from "../pots/CronJobPot.ts";

export default shibui.plugin("cron", ({ core, log }) => {
  log.inf("Hello, Cron!");

  const pattern = "* * * * *";
  const job = new Cron(pattern, { timezone: "Europe/Moscow" }, () => {
    core.send(new CronJobPot().init({
      pattern,
      target: "SimpleTask",
    }));
  });
});
`;

export const EDITOR_CONFIG = `
root = true
[**.{ts,json,js}]
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
indent_style = space
indent_size = 2`;
