import {
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  type LogEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
} from "$shibui/events";
import {
  type LoggingProvider,
  LogLevel,
  SourceType,
  type TEventDrivenLogger,
  type TLoggerOptions,
  UNKNOWN_TARGET,
} from "$shibui/types";
import * as colors from "@std/fmt/colors";
import type { EventEmitter } from "$shibui/core";

const colorizeByLevel = {
  [LogLevel.Unknown]: colors.dim,
  [LogLevel.Debug]: colors.blue,
  [LogLevel.Trace]: colors.gray,
  [LogLevel.Verbose]: colors.cyan,
  [LogLevel.Info]: colors.green,
  [LogLevel.Warn]: colors.yellow,
  [LogLevel.Error]: colors.red,
  [LogLevel.Fatal]: colors.bgBrightRed,
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
  #provider: LoggingProvider | null;

  constructor(
    emitter: EventEmitter<LogEvent<unknown>>,
    settings: any,
    args?: TLoggerOptions,
    provider?: LoggingProvider,
  ) {
    this.#settings = settings;
    this.#emitter = emitter;
    this.#provider = provider ?? null;
    if (args?.sourceName) this.#options.sourceName = args.sourceName;
    if (args?.sourceType) this.#options.sourceType = args.sourceType;
  }

  private log(
    level: LogLevel,
    msg: string,
    metadata?: Record<string, unknown>,
  ) {
    if (
      !this.#settings.ALLOWED_LOGGING_SOURCE_TYPES.includes(
        this.#options.sourceType,
      )
    ) return;

    if (
      !this.#settings.DEFAULT_LOGGING_ENABLED ||
      level < this.#settings.DEFAULT_LOGGING_LEVEL
    ) return;

    if (this.#provider) {
      this.#provider.log({
        level,
        sourceType: this.#options.sourceType,
        sourceName: this.#options.sourceName,
        message: msg,
        timestamp: new Date(),
        metadata,
      });
    } else {
      const date = new Date();
      const time =
        `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;

      console.log(colorizeByLevel[level](
        `${time} ${this.#options.sourceType} [${
          levelName[level]
        }] ${this.#options.sourceName} : ${msg}`,
      ));
    }
  }

  dbg(msg: string) {
    this.log(LogLevel.Debug, msg);
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
    this.log(LogLevel.Debug, msg);
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
    this.log(LogLevel.Trace, msg);
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
    this.log(LogLevel.Trace, msg);
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
    this.log(LogLevel.Verbose, msg);
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
    this.log(LogLevel.Verbose, msg);
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
    this.log(LogLevel.Info, msg);
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
    this.log(LogLevel.Error, msg);
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
    this.log(LogLevel.Warn, msg);
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
    this.log(LogLevel.Fatal, msg);
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
