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

import framework from "../../mod.ts";
import luminous from "https://deno.land/x/luminous@0.1.5/mod.ts";
import { Level, LogEvent } from "../../../events/LogEvents.ts";
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
      `${time} ${event.sourceType} [${
        this.#levelName[event.level]
      }] ${event.sourceName} : ${_data.msg}\n`,
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

self.onload = () => {
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
};
