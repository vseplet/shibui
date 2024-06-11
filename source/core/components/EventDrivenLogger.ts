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
  type CoreEvent,
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  LogEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
} from "$core/events";
import {
  type IEventDrivenLogger,
  type ILoggerOptions,
  Level,
  SourceType,
} from "$core/types";
import { colors } from "$deps";
import { EventEmitter } from "$core/components";

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

export class EventDrivenLogger implements IEventDrivenLogger {
  #options = {
    sourceType: SourceType.UNKNOWN,
    sourceName: "unknown",
  };

  #emitter: EventEmitter<LogEvent<unknown>>;

  #settings;

  constructor(
    emitter: EventEmitter<LogEvent<unknown>>,
    settings: any,
    args?: ILoggerOptions,
  ) {
    this.#settings = settings;
    this.#emitter = emitter;
    if (args?.sourceName) this.#options.sourceName = args.sourceName;
    if (args?.sourceType) this.#options.sourceType = args.sourceType;
  }

  private log(level: Level, msg: string) {
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
    this.log(Level.DEBUG, msg);
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
    this.log(Level.DEBUG, msg);
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
    this.log(Level.TRACE, msg);
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
    this.log(Level.TRACE, msg);
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
    this.log(Level.VERBOSE, msg);
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
    this.log(Level.VERBOSE, msg);
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
    this.log(Level.INFO, msg);
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
    this.log(Level.ERROR, msg);
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
    this.log(Level.WARN, msg);
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
    this.log(Level.FATAL, msg);
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
