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
import type { EventEmitter } from "$shibui/runtime";

export class EventDrivenLogger implements TEventDrivenLogger {
  #options: {
    sourceType: SourceType;
    sourceName: string;
  } = {
    sourceType: SourceType.Unknown,
    sourceName: UNKNOWN_TARGET,
  };

  #emitter: EventEmitter<LogEvent<unknown>>;
  #provider: LoggingProvider | null;

  constructor(
    emitter: EventEmitter<LogEvent<unknown>>,
    provider: LoggingProvider | null,
    args?: TLoggerOptions,
  ) {
    this.#emitter = emitter;
    this.#provider = provider;
    if (args?.sourceName) this.#options.sourceName = args.sourceName;
    if (args?.sourceType) this.#options.sourceType = args.sourceType;
  }

  private log(
    level: LogLevel,
    msg: string,
    _metadata?: Record<string, unknown>,
  ) {
    if (!this.#provider) return;

    this.#provider.log({
      level,
      sourceType: this.#options.sourceType,
      sourceName: this.#options.sourceName,
      message: msg,
      timestamp: new Date(),
    });
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
