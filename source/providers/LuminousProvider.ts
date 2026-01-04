import L from "@vseplet/luminous";
import { type LogEntry, type LoggingProvider, LogLevel } from "$shibui/types";

/**
 * Logging provider using @vseplet/luminous.
 * Supports terminal output with colors and text formatting.
 *
 * @example
 * ```typescript
 * const provider = new LuminousProvider();
 * core({ logging: provider })
 * ```
 */
export class LuminousProvider implements LoggingProvider {
  #logger: InstanceType<typeof L.Logger>;

  constructor() {
    const opts = new L.OptionsBuilder()
      .addTransport(
        new L.formatters.TextFormatter(),
        new L.transports.TerminalTransport(),
      )
      .build();

    this.#logger = new L.Logger(opts);
  }

  log(entry: LogEntry): void {
    const msg = `${entry.sourceType} ${entry.sourceName} : ${entry.message}`;

    switch (entry.level) {
      case LogLevel.Trace:
        this.#logger.trc(msg);
        break;
      case LogLevel.Debug:
        this.#logger.dbg(msg);
        break;
      case LogLevel.Verbose:
        this.#logger.vrb(msg);
        break;
      case LogLevel.Info:
        this.#logger.inf(msg);
        break;
      case LogLevel.Warn:
        this.#logger.wrn(msg);
        break;
      case LogLevel.Error:
        this.#logger.err(msg);
        break;
      case LogLevel.Fatal:
        this.#logger.ftl(msg);
        break;
      default:
        this.#logger.inf(msg);
    }
  }
}
