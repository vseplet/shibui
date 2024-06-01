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
    --force   Overwrite existing files
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

const baseImportPath = `https://deno.land/x/shibui@${versions[0]}`;

// const baseImportPath = `https://raw.githubusercontent.com/vseplet/shibui/${
//   versions[0]
// }`;

// const baseImportPath = `http://localhost:8000/${versions[0]}`;

export const DENO_JSON = `
{
  "lock": false,

  "tasks": {
    "dev": "deno run --allow-all --unstable ./dev.ts",
    "prod": "deno run --allow-all --unstable ./prod.ts"
  },

  "imports": {
    "$shibui_framework/": "${baseImportPath}/framework/",
    "$shibui_framework": "${baseImportPath}/framework/mod.ts",
    "$shibui_pots/": "${baseImportPath}/core/pots/",
    "$shibui_events/": "${baseImportPath}/core/events/",
    "$shibui_plugins/": "${baseImportPath}/framework/plugins/",
    "$std/": "https://deno.land/std@0.198.0/"
  }
}
`;

export const DEV_TS = `// dev file ...
import dev from "$shibui_framework/runtime/dev.ts";
import logger from "$shibui_plugins/luminous/mod.ts";

await dev(import.meta.url, [logger]);
`;

export const PROD_TS = `// prod file ...
import prod from "$shibui_framework/runtime/prod.ts";
import manifest from "./shibui.manifest.ts";
import logger from "$shibui_plugins/luminous/mod.ts";

await prod(manifest, [logger]);
`;

export const SIMPLE_TASK_TS = `import shibui from "$shibui_framework";
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

export const SIMPLE_WORKFLOW_TS = `import shibui from "$shibui_framework";
import { ContextPot } from "$shibui_pots/ContextPot.ts";
import { CoreStartPot } from "$shibui_pots/CoreStartPot.ts";

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

export const CRON_JOB_POT_TS =
  `import { InternalPot } from "$shibui_pots/InternalPot.ts";

export class CronJobPot extends InternalPot<{ pattern: string; target: string }> {
}
`;

export const CRON_PLUGIN_TS = `import shibui from "$shibui_framework";
import { Cron } from "https://deno.land/x/croner@6.0.3/dist/croner.js";
import { CronJobPot } from "../pots/CronJobPot.ts";

export default shibui.plugin("cron", ({ api, log }) => {
  log.inf("Hello, Cron!");

  const pattern = "* * * * *";
  const job = new Cron(pattern, { timezone: "Europe/Moscow" }, () => {
    api.send(new CronJobPot().init({
      pattern,
      target: "SimpleTask",
    }));
  });
});
`;

export const LOGGER_PLUGIN_TS = `import framework from "$shibui_framework";

export default framework.plugin("log", () => {
  new Worker(new URL("./_worker.ts", import.meta.url).href, {
    type: "module",
  });
});
`;

export const LOGGER_PLUGIN_WORKER_TS =
  `import framework from "$shibui_framework";
import { Level, LogEvent } from "$shibui_events/LogEvents.ts";
import luminous from "https://deno.land/x/luminous@0.1.5/mod.ts";
import {
  AbstractFormatter,
  IDataForFormatting,
} from "https://deno.land/x/luminous@0.1.5/src/Formatter.ts";
import * as colors from "https://deno.land/std@0.196.0/fmt/colors.ts";

interface IShibuiTextFormatterOptions {
  showMetadata?: boolean;
  colorize?: boolean;
  showTimestamp?: boolean;
  timestampPattern?: string;
}

class ShibuiTextFormatter extends AbstractFormatter<IShibuiTextFormatterOptions> {
  #colorizeByLevel = {
    [Level.UNKNOWN]: colors.dim,
    [Level.DEBUG]: colors.blue,
    [Level.TRACE]: colors.gray,
    [Level.VERBOSE]: colors.cyan,
    [Level.INFO]: colors.green,
    [Level.WARN]: colors.yellow,
    [Level.ERROR]: colors.red,
    [Level.FATAL]: colors.bgBrightRed,
  };

  #levelName = [
    "UKN",
    "TRC",
    "DBG",
    "VRB",
    "INF",
    "WRN",
    "ERR",
    "FTL",
  ];

  constructor(options = {}) {
    super(options, {
      showMetadata: false,
      colorize: true,
      showTimestamp: true,
      timestampPattern: "HH:mm:ss.SSS",
    });
  }

  format(_data: IDataForFormatting): string {
    const event = _data.metadata as LogEvent<unknown>;
    if (event.sourceName === undefined) return event.msg;

    const time = luminous.helpers.time.formatDate(
      new Date(),
      this.options.timestampPattern,
    );

    return this.#colorizeByLevel[event.level](
      \`\${time} \${event.sourceName} [\${
    this.#levelName[event.level]
  }] \${_data.msg}\n\`,
    );
  }
}

const logger = new luminous.Logger(
  new luminous.OptionsBuilder()
    .addTransport(
      new ShibuiTextFormatter(),
      new luminous.transports.TerminalTransport(),
    )
    .build(),
);

framework.emitters.logEventEmitter.addListener((event) => {
  switch (event.level) {
    case Level.TRACE:
      logger.trc(event.msg, event);
      break;
    case Level.DEBUG:
      logger.dbg(event.msg, event);
      break;
    case Level.VERBOSE:
      logger.vrb(event.msg, event);
      break;
    case Level.INFO:
      logger.inf(event.msg, event);
      break;
    case Level.WARN:
      logger.wrn(event.msg, event);
      break;
    case Level.ERROR:
      logger.err(event.msg, event);
      break;
    case Level.FATAL:
      logger.ftl(event.msg, event);
      break;
  }
});
`;

export const EDITOR_CONFIG = `root = true

[**.{ts,json,js}]
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
indent_style = space
indent_size = 2`;
