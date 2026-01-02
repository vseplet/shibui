/*
 * Copyright 2024 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { emitters } from "$shibui/emitters";
import {
  LogLevel,
  SourceType,
  type StorageProvider,
  type TCore,
  type TCoreOptions,
  type TLoggerOptions,
  type TLoggingConfig,
  type TPot,
  type TSpicy,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$shibui/types";
import {
  ContextPot,
  Distributor,
  EventDrivenLogger,
  type Pot,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/core";
import type { Constructor } from "$helpers/types";
import type { PotFactory, PotInstance } from "$shibui/types";
import { DenoKvProvider, MemoryProvider } from "$shibui/providers";
import { isDeno } from "$helpers";

// Type helpers for task() to accept both PotFactory and Constructor
// deno-lint-ignore no-explicit-any
type PotInput = Constructor<Pot<any>> | PotFactory<any>;

// deno-lint-ignore no-explicit-any
type ToPot<S> = S extends Constructor<infer P extends Pot<any>> ? P
  // deno-lint-ignore no-explicit-any
  : S extends PotFactory<infer D> ? Pot<D & { [key: string]: any }>
  : never;

type ToPots<Sources extends PotInput[]> = {
  [K in keyof Sources]: ToPot<Sources[K]>;
};

// deno-lint-ignore no-explicit-any
function isPotFactory(input: PotInput): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

// deno-lint-ignore no-explicit-any
function toConstructor(input: PotInput): Constructor<Pot<any>> {
  if (isPotFactory(input)) {
    return input._class;
  }
  return input;
}

// Internal settings structure used by logger
type TInternalSettings = {
  DEFAULT_LOGGING_ENABLED: boolean;
  DEFAULT_LOGGING_LEVEL: number;
  ALLOWED_LOGGING_SOURCE_TYPES: SourceType[];
};

// Normalize log level from string or number
function normalizeLogLevel(level: LogLevel | string | undefined): number {
  if (level === undefined) return 0;
  if (typeof level === "number") return level;
  const map: Record<string, number> = {
    trace: LogLevel.Trace,
    debug: LogLevel.Debug,
    verbose: LogLevel.Verbose,
    info: LogLevel.Info,
    warn: LogLevel.Warn,
    error: LogLevel.Error,
    fatal: LogLevel.Fatal,
  };
  return map[level] ?? 0;
}

// Normalize source type from string or SourceType
function normalizeSourceType(source: SourceType | string): SourceType {
  if (typeof source !== "string") return source;
  const map: Record<string, SourceType> = {
    core: SourceType.Core,
    task: SourceType.Task,
    workflow: SourceType.Workflow,
    framework: SourceType.Framework,
    plugin: SourceType.Plugin,
  };
  return map[source] ?? SourceType.Unknown;
}

// Create provider based on options
function createProvider<S>(options: TCoreOptions<S>): StorageProvider {
  if (options.provider) {
    return options.provider;
  }

  const storage = options.storage ?? "auto";

  if (storage === "memory") {
    return new MemoryProvider();
  }

  if (storage === "auto") {
    return isDeno ? new DenoKvProvider() : new MemoryProvider();
  }

  // File path - only works in Deno
  if (!isDeno) {
    throw new Error(
      `File-based storage "${storage}" is only supported in Deno. Use "memory" or a custom provider.`,
    );
  }
  return new DenoKvProvider(storage);
}

// Normalize options to internal format
function normalizeOptions<S>(options: TCoreOptions<S>): {
  provider: StorageProvider;
  settings: TInternalSettings;
  context: S | undefined;
} {
  // Provider
  const provider = createProvider(options);

  // Logging
  let loggingEnabled = true;
  let loggingLevel = 0;
  let allowedSources: SourceType[] = [
    SourceType.Core,
    SourceType.Task,
    SourceType.Workflow,
    SourceType.Framework,
    SourceType.Unknown,
    SourceType.Plugin,
  ];

  if (options.logging !== undefined) {
    if (typeof options.logging === "boolean") {
      loggingEnabled = options.logging;
    } else {
      loggingEnabled = true;
      const config = options.logging as TLoggingConfig;
      loggingLevel = normalizeLogLevel(config.level);
      if (config.sources) {
        allowedSources = config.sources.map(normalizeSourceType);
      }
    }
  }

  return {
    provider,
    settings: {
      DEFAULT_LOGGING_ENABLED: loggingEnabled,
      DEFAULT_LOGGING_LEVEL: loggingLevel,
      ALLOWED_LOGGING_SOURCE_TYPES: allowedSources,
    },
    context: options.context,
  };
}

export class Core<S extends TSpicy> implements TCore<S> {
  emitters = emitters;

  #globalPotDistributor: Distributor;
  #settings: TInternalSettings;

  constructor(options: TCoreOptions<S>) {
    const normalized = normalizeOptions(options);
    this.#settings = normalized.settings;

    this.#globalPotDistributor = new Distributor(
      normalized.provider,
      this,
      normalized.context,
    );
  }

  // Overloads for workflow with proper type inference
  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP>;
  workflow<D extends object>(
    contextPotFactory: PotFactory<D>,
  ): WorkflowBuilder<S, Pot<D & { [key: string]: unknown }>>;
  workflow(): WorkflowBuilder<S, ContextPot<{}>>;
  workflow(
    contextPotSource?: Constructor<ContextPot<{}>> | PotFactory<object>,
  ): WorkflowBuilder<S, Pot> {
    return new WorkflowBuilder<S, Pot>(
      contextPotSource || this.#createRandomContext(),
    );
  }

  #createRandomContext(): Constructor<ContextPot<{}>> {
    // deno-lint-ignore no-explicit-any
    const RandomContext = class extends ContextPot<any> {
      override data = {};
    };
    Object.defineProperty(RandomContext, "name", {
      value: `CONTEXT`,
    });
    return RandomContext as Constructor<ContextPot<{}>>;
  }

  task<Sources extends PotInput[]>(
    ...sources: Sources
  ): TaskBuilder<S, ToPots<Sources>> {
    const constructors = sources.map(toConstructor);
    // deno-lint-ignore no-explicit-any
    return new TaskBuilder<S, ToPots<Sources>>(...constructors as any);
  }

  createLogger = (options: TLoggerOptions): EventDrivenLogger => {
    return new EventDrivenLogger(
      emitters.logEventEmitter,
      this.#settings,
      options,
    );
  };

  async start() {
    await this.#globalPotDistributor.start();
  }

  register(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.register(builder);
  }

  disable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.disable(builder);
  }

  enable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.enable(builder);
  }

  /**
   * Send a pot to the core for processing
   * @param potLike - PotFactory (auto-creates), PotInstance, or TPot
   * @param builder - Optional task to route the pot to
   */
  // deno-lint-ignore no-explicit-any
  send(
    potLike: TPot | PotInstance<any> | PotFactory<any>,
    builder?: TTaskBuilder,
  ) {
    // Auto-create if PotFactory
    const pot = (typeof potLike === "object" && "create" in potLike &&
        "_class" in potLike)
      ? potLike.create() as unknown as TPot
      : potLike as TPot;

    if (builder) pot.to.task = builder.task.name;
    this.#globalPotDistributor.send(pot);
  }

  close(): void {
    this.#globalPotDistributor.close();
  }
}
