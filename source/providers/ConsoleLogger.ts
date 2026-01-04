import {
  type LogEntry,
  type LoggingProvider,
  LogLevel,
  type LogLevelName,
  SourceType,
  type SourceTypeName,
} from "$shibui/types";
import * as colors from "@std/fmt/colors";

const colorizeByLevel: Record<LogLevel, (str: string) => string> = {
  [LogLevel.Unknown]: colors.dim,
  [LogLevel.Trace]: colors.gray,
  [LogLevel.Debug]: colors.blue,
  [LogLevel.Verbose]: colors.cyan,
  [LogLevel.Info]: colors.green,
  [LogLevel.Warn]: colors.yellow,
  [LogLevel.Error]: colors.red,
  [LogLevel.Fatal]: colors.bgBrightRed,
};

export const levelName: Record<LogLevel, string> = {
  [LogLevel.Unknown]: "UKN",
  [LogLevel.Trace]: "TRC",
  [LogLevel.Debug]: "DBG",
  [LogLevel.Verbose]: "VRB",
  [LogLevel.Info]: "INF",
  [LogLevel.Warn]: "WRN",
  [LogLevel.Error]: "ERR",
  [LogLevel.Fatal]: "FTL",
};

const logLevelFromName: Record<LogLevelName, LogLevel> = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  verbose: LogLevel.Verbose,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
};

const sourceTypeFromName: Record<SourceTypeName, SourceType> = {
  core: SourceType.Core,
  task: SourceType.Task,
  workflow: SourceType.Workflow,
  framework: SourceType.Framework,
  plugin: SourceType.Plugin,
};

export interface ConsoleLoggerOptions {
  /** Minimum log level to display */
  level?: LogLevel | LogLevelName;
  /** Which source types to log */
  sources?: (SourceType | SourceTypeName)[];
}

/**
 * Console logging provider with colorized output.
 *
 * @example
 * ```typescript
 * // Default - all levels, all sources
 * shibui({ logger: new ConsoleLogger() })
 *
 * // Only info and above
 * shibui({ logger: new ConsoleLogger({ level: "info" }) })
 *
 * // Only task and workflow logs
 * shibui({ logger: new ConsoleLogger({ sources: ["task", "workflow"] }) })
 * ```
 */
export class ConsoleLogger implements LoggingProvider {
  #level: LogLevel;
  #sources: Set<SourceType>;

  constructor(options: ConsoleLoggerOptions = {}) {
    // Normalize level
    if (options.level === undefined) {
      this.#level = LogLevel.Unknown;
    } else if (typeof options.level === "string") {
      this.#level = logLevelFromName[options.level] ?? LogLevel.Unknown;
    } else {
      this.#level = options.level;
    }

    // Normalize sources
    if (options.sources === undefined) {
      this.#sources = new Set([
        SourceType.Core,
        SourceType.Task,
        SourceType.TaskTest,
        SourceType.TaskDo,
        SourceType.Workflow,
        SourceType.WorkflowTest,
        SourceType.WorkflowFail,
        SourceType.Framework,
        SourceType.Plugin,
        SourceType.Unknown,
      ]);
    } else {
      this.#sources = new Set(
        options.sources.map((s) =>
          typeof s === "string"
            ? (sourceTypeFromName[s as SourceTypeName] ?? SourceType.Unknown)
            : s
        ),
      );
    }
  }

  log(entry: LogEntry): void {
    // Filter by level
    if (entry.level < this.#level) return;

    // Filter by source type
    if (!this.#sources.has(entry.sourceType)) return;

    const date = entry.timestamp;
    const time =
      `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;

    const colorize = colorizeByLevel[entry.level] ?? colors.dim;
    const level = levelName[entry.level] ?? "UKN";

    console.log(colorize(
      `${time} ${entry.sourceType} [${level}] ${entry.sourceName} : ${entry.message}`,
    ));
  }
}
