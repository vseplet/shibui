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

import {
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  type LogEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
} from "$core/events";
import {
  Level,
  LogLevel,
  SourceType,
  type TEventDrivenLogger,
  type TLoggerOptions,
  UNKNOWN_TARGET,
} from "$core/types";
import { colors } from "$deps";
import type { EventEmitter } from "$core/components";

const colorizeByLevel = {
  [Level.Unknown]: colors.dim,
  [Level.Debug]: colors.blue,
  [Level.Trace]: colors.gray,
  [Level.Verbose]: colors.cyan,
  [Level.Info]: colors.green,
  [Level.Warn]: colors.yellow,
  [Level.Error]: colors.red,
  [Level.Fatal]: colors.bgBrightRed,
};

export const levelName = [
  "UKN",
  "TRC",
  "DBG",
  "VRB",
  "INF",
  "WRN",
  "ERR",
  "FTL",
];

export class EventDrivenLogger implements TEventDrivenLogger {
  #options: {
    sourceType: SourceType;
    sourceName: string;
  } = {
    sourceType: SourceType.Unknown,
    sourceName: UNKNOWN_TARGET,
  };

  #emitter: EventEmitter<LogEvent<unknown>>;

  #settings;

  constructor(
    emitter: EventEmitter<LogEvent<unknown>>,
    settings: any,
    args?: TLoggerOptions,
  ) {
    this.#settings = settings;
    this.#emitter = emitter;
    if (args?.sourceName) this.#options.sourceName = args.sourceName;
    if (args?.sourceType) this.#options.sourceType = args.sourceType;
  }

  private log(level: LogLevel, msg: string) {
    if (
      !this.#settings.ALLOWED_LOGGING_SOURCE_TYPES.includes(
        this.#options.sourceType,
      )
    ) return;

    if (
      !this.#settings.DEFAULT_LOGGING_ENABLED ||
      level < this.#settings.DEFAULT_LOGGING_LEVEL
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
    this.log(Level.Debug, msg);
    this.#emitter.emit(
      new DebugLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  dbgm({ msg, meta }: { msg: string; meta: {} }) {
    this.log(Level.Debug, msg);
    this.#emitter.emit(
      new DebugLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
        meta,
      ),
    );
  }

  trc(msg: string) {
    this.log(Level.Trace, msg);
    this.#emitter.emit(
      new TraceLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  trcm({ msg, meta }: { msg: string; meta: {} }) {
    this.log(Level.Trace, msg);
    this.#emitter.emit(
      new TraceLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
        meta,
      ),
    );
  }

  vrb(msg: string) {
    this.log(Level.Verbose, msg);
    this.#emitter.emit(
      new VerboseLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
      ),
    );
  }

  vrbm({ msg, meta }: { msg: string; meta: {} }) {
    this.log(Level.Verbose, msg);
    this.#emitter.emit(
      new VerboseLogEvent(
        {
          sourceType: this.#options.sourceType,
          sourceName: this.#options.sourceName,
        },
        msg,
        meta,
      ),
    );
  }

  inf(msg: string) {
    this.log(Level.Info, msg);
    this.#emitter.emit(
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
    this.log(Level.Error, msg);
    this.#emitter.emit(
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
    this.log(Level.Warn, msg);
    this.#emitter.emit(
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
    this.log(Level.Fatal, msg);
    this.#emitter.emit(
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
