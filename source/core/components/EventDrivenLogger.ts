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

import emitters from "../emitters.ts";
import * as colors from "https://deno.land/std@0.196.0/fmt/colors.ts";
import core from "../mod.ts";
import {
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
} from "../events/LogEvents.ts";
import { ILoggerOptions, Level, SourceType } from "../types.ts";

const colorizeByLevel = {
  [Level.UNKNOWN]: colors.dim,
  [Level.DEBUG]: colors.blue,
  [Level.TRACE]: colors.gray,
  [Level.VERBOSE]: colors.cyan,
  [Level.INFO]: colors.green,
  [Level.WARN]: colors.yellow,
  [Level.ERROR]: colors.red,
  [Level.FATAL]: colors.bgBrightRed,
};

const levelName = [
  "UKN",
  "TRC",
  "DBG",
  "VRB",
  "INF",
  "WRN",
  "ERR",
  "FTL",
];

export class EventDrivenLogger {
  #options = {
    sourceType: SourceType.UNKNOWN,
    sourceName: "unknown",
  };

  constructor(args?: ILoggerOptions) {
    if (args?.sourceName) this.#options.sourceName = args.sourceName;
    if (args?.sourceType) this.#options.sourceType = args.sourceType;
  }

  private log(level: Level, msg: string, metadata: any) {
    if (
      !core.api.settings.ALLOWED_LOGGING_SOURCE_TYPES.includes(
        this.#options.sourceType,
      )
    ) return;

    if (
      !core.api.settings.DEFAULT_LOGGING_ENABLED ||
      level < core.api.settings.DEFAULT_LOGGING_LEVEL
    ) return;

    const date = new Date();
    const time =
      `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;

    console.log(colorizeByLevel[level](
      `${time} ${this.#options.sourceType} [${
        levelName[level]
      }] ${this.#options.sourceName} : ${msg}`,
    ));
  }

  dbg(msg: string) {
    this.log(Level.DEBUG, msg, {});
    emitters.logEventEmitter.emit(
      new DebugLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  trc(msg: string) {
    this.log(Level.TRACE, msg, {});
    emitters.logEventEmitter.emit(
      new TraceLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  vrb(msg: string) {
    this.log(Level.VERBOSE, msg, {});
    emitters.logEventEmitter.emit(
      new VerboseLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  inf(msg: string) {
    this.log(Level.INFO, msg, {});
    emitters.logEventEmitter.emit(
      new InfoLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  err(msg: string) {
    this.log(Level.ERROR, msg, {});
    emitters.logEventEmitter.emit(
      new ErrorLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  wrn(msg: string) {
    this.log(Level.WARN, msg, {});
    emitters.logEventEmitter.emit(
      new WarnLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  flt(msg: string) {
    this.log(Level.FATAL, msg, {});
    emitters.logEventEmitter.emit(
      new FatalLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }
}