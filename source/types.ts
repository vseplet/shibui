// deno-lint-ignore-file no-explicit-any
import type { emitters } from "$shibui/emitters";
import type { EventDrivenLogger } from "./core/EventDrivenLogger.ts";
import type { TaskBuilder } from "./core/TaskBuilder.ts";
import type { ContextPot, Pot } from "./core/Pot.ts";
import type { WorkflowBuilder } from "./core/WorkflowBuilder.ts";

// ============================================================================
// Type Helpers
// ============================================================================

export type Constructor<C> = new () => C;
export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest
  : never;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false;

// ============================================================================
// Runtime Types
// ============================================================================

export type Runtime = "deno" | "bun" | "node" | "unknown";

// ============================================================================
// Chain & Pipe Types
// ============================================================================

/**
 * Chain configuration returned by chain()
 */
export interface ChainConfig {
  /** List of task builders in order */
  readonly tasks: TTaskBuilder[];
  /** Name of the chain */
  readonly name: string;
}

/**
 * Transform function type for pipe()
 */
export type Transform<In, Out> = (input: In) => Out;

// ============================================================================
// Pot Factory Types (v1.0 API)
// ============================================================================

/** Options for pot creation */
export interface PotOptions {
  /** Time-to-live for the pot (number of processing attempts) */
  ttl?: number;
}

/** Runtime pot instance - compatible with TPot */
export interface PotInstance<T> {
  /** Unique identifier */
  uuid: `${string}-${string}-${string}-${string}-${string}`;
  /** Pot name */
  name: string;
  /** Pot type */
  type: PotType;
  /** Time of creation */
  toc: number;
  /** Time-to-live */
  ttl: number;
  /** Actual data */
  data: T;
  /** Routing: where this pot came from */
  from: {
    task: string;
    workflow: string;
  };
  /** Routing: where this pot should go */
  to: {
    task: string;
    workflow: string;
  };
}

/** Internal Pot class type for TaskBuilder compatibility */
export type PotClass<T extends object> = new () => Pot<
  T & { [key: string]: any }
>;

/** Pot factory returned by pot() function */
export interface PotFactory<T extends object> {
  /** Type name for identification */
  readonly name: string;
  /** Default values */
  readonly defaults: T;
  /** TTL setting */
  readonly ttl: number;
  /** Create a new pot instance with optional data override */
  create(data?: Partial<T>): PotInstance<T>;
  /** Initialize existing data (for compatibility) */
  init(data: Partial<T>): PotInstance<T>;
  /** Internal: class constructor for TaskBuilder compatibility */
  readonly _class: PotClass<T>;
}

/** Type helper to extract data type from a Pot class or PotFactory */
export type PotData<P> = P extends Constructor<Pot<infer D>> ? D
  : P extends PotFactory<infer D> ? D
  : never;

/** Type helper to extract pot instance type from a Pot class or PotFactory */
export type PotOf<P> = P extends Constructor<Pot<infer D>> ? Pot<D>
  : P extends PotFactory<infer D> ? PotInstance<D>
  : never;

// ============================================================================
// Enums
// ============================================================================

/**
 * Pot types categorize data containers by their origin and purpose
 */
export enum PotType {
  Unknown = "UNKNOWN",
  External = "EXTERNAL",
  Internal = "INTERNAL",
  System = "SYSTEM",
  Context = "CONTEXT",
}

/**
 * Result operations returned from task do() handlers
 */
export enum DoOperation {
  Next = "NEXT",
  Fail = "FAIL",
  Finish = "FINISH",
  Repeat = "REPEAT",
}

/**
 * Trigger operations returned from trigger handlers
 */
export enum TriggerOperation {
  Allow = "ALLOW",
  Deny = "DENY",
}

/**
 * Built-in trigger rules for task activation
 */
export enum TriggerRule {
  /** Accept only pots explicitly targeted to this task */
  ForThisTask = "FOR_THIS_TASK",
  /** Accept pots targeted to any known task */
  ForAnyTask = "FOR_ANY_TASK",
  /** Accept pots with unknown destination */
  ForUnknown = "FOR_UNKNOWN",
}

/**
 * Log levels for event-driven logger
 */
export enum LogLevel {
  Unknown = 0,
  Trace = 1,
  Debug = 2,
  Verbose = 3,
  Info = 4,
  Warn = 5,
  Error = 6,
  Fatal = 7,
}

/**
 * Source types for logging
 */
export enum SourceType {
  Unknown = "UNKNOWN",
  Core = "CORE",
  Task = "TASK",
  TaskTest = "TASK.ON",
  TaskDo = "TASK.DO",
  Workflow = "WORKFLOW",
  WorkflowTest = "WORKFLOW.TEST",
  WorkflowFail = "WORKFLOW.FAIL",
  Framework = "FRAMEWORK",
  Plugin = "PLUGIN",
}

/**
 * Task types categorize tasks by dependencies and context
 */
export enum TaskType {
  Single = "SINGLE",
  Dependent = "DEPENDENT",
  SingleWorkflow = "SINGLE_WORKFLOW",
  DependentWorkflow = "DEPENDENT_WORKFLOW",
}

/**
 * Event types for core event emitter
 */
export enum EventType {
  Unknown = "UNKNOWN",
  Core = "CORE",
  Log = "LOG",
  Runner = "RUNNER",
  Workflow = "WORKFLOW",
  Task = "TASK",
}

/**
 * Special constant for unknown targets
 */
export const UNKNOWN_TARGET = "unknown" as const;

// ============================================================================
// Types
// ============================================================================

export type TPot = {
  toc: number;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
  name: string;
  type: PotType;
  from: {
    workflow: string;
    task: string;
  };
  to: {
    workflow: string;
    task: string;
  };
  ttl: number;
  data: unknown;
};

export type TPotPack = Array<TPot>;

export type TSEvent = {
  type: EventType;
  name: string;
  timestamp: number;
};

export type TSpicy = {};

export type TWorkflowTriggerHandlerContext<
  TriggerPot extends TPot,
  S = TSpicy,
> = S & {
  pot: TriggerPot;
  log: TEventDrivenLogger;
};

export type TWorkflowTriggerHandler<
  ContextPot extends TPot,
  TriggerPot extends TPot,
  S = TSpicy,
> = (args: TWorkflowTriggerHandlerContext<TriggerPot, S>) => ContextPot | null;

export type TWorkflowTrigger = {
  workflowName: string;
  potConstructor: Constructor<TPot>;
  handler: any;
};

export type TWorkflowTriggersStorage = {
  [potName: string]: Array<TWorkflowTrigger>;
};

export type TTaskTriggerStorage = {
  [potName: string]: Array<TTaskTrigger<any, any, any>>;
};

export type WorkflowsStorage = { [workflowName: string]: TWorkflow };

export type TasksStorage = { [taskName: string]: TTask };

export type TLogEventArgs = {
  sourceType: SourceType;
  sourceName: string;
};

export type TLoggerOptions = {
  sourceType?: SourceType;
  sourceName?: string;
};

export type TCore<S extends TSpicy> = {
  emitters: typeof emitters;

  // Overloads for workflow with proper type inference
  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP>;
  workflow<D extends object>(
    contextPotFactory: PotFactory<D>,
  ): WorkflowBuilder<S, Pot<D & { [key: string]: unknown }>>;
  workflow(): WorkflowBuilder<S, ContextPot<{}>>;

  task<Pots extends Pot[]>(
    ...constructors: { [K in keyof Pots]: Constructor<Pots[K]> }
  ): TaskBuilder<S, Pots>;

  createLogger(options: TLoggerOptions): TEventDrivenLogger;
  start(): Promise<void>;
  register(builder: TTaskBuilder | TWorkflowBuilder): void;
  disable(builder: TTaskBuilder | TWorkflowBuilder): void;
  enable(builder: TTaskBuilder | TWorkflowBuilder): void;
  send(pot: TPot, builder?: TTaskBuilder): void;
};

export type TAnyCore = TCore<any>;

export type TEventDrivenLogger = {
  dbg(msg: string): void;
  trc(msg: string): void;
  vrb(msg: string): void;
  inf(msg: string): void;
  err(msg: string): void;
  wrn(msg: string): void;
  flt(msg: string): void;
};

export type TLogEventMetadata = {
  name?: string;
};

/**
 * Logging level - can be string name or numeric value
 */
export type LogLevelName =
  | "trace"
  | "debug"
  | "verbose"
  | "info"
  | "warn"
  | "error"
  | "fatal";

/**
 * Source type name for filtering logs
 */
export type SourceTypeName =
  | "core"
  | "task"
  | "workflow"
  | "framework"
  | "plugin";

/**
 * Detailed logging configuration
 */
export type TLoggingConfig = {
  /** Minimum log level to display */
  level?: LogLevel | LogLevelName;
  /** Which source types to log */
  sources?: (SourceType | SourceTypeName)[];
};

/**
 * Core configuration options (providers are required).
 * Use shibui() for convenient defaults.
 *
 * @example
 * ```typescript
 * new Core({
 *   queue: new MemoryQueueProvider(),
 *   storage: new MemoryStorageProvider(),
 *   logger: new ConsoleLogger(),
 * })
 * ```
 */
export type TCoreOptions<S = TSpicy> = {
  /** Queue provider for message passing */
  queue: QueueProvider;

  /** Storage provider for KV persistence */
  storage: StorageProvider;

  /** Logging provider (null to disable) */
  logger: LoggingProvider | null;

  /** Custom context data available in tasks */
  context?: S;
};

/**
 * Shibui configuration options with sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal - uses Memory providers and ConsoleLogger
 * shibui()
 *
 * // Without logging
 * shibui({ logger: false })
 *
 * // With DenoKV persistence
 * shibui({
 *   queue: new DenoKvQueueProvider("./data.db"),
 *   storage: new DenoKvStorageProvider("./data.db"),
 * })
 *
 * // Full configuration
 * shibui({
 *   queue: new DenoKvQueueProvider("./data.db"),
 *   storage: new DenoKvStorageProvider("./data.db"),
 *   logger: new LuminousProvider({ level: "debug" }),
 *   context: { userId: "123" },
 * })
 * ```
 */
export type TShibuiOptions<S = TSpicy> = {
  /** Queue provider (default: MemoryQueueProvider) */
  queue?: QueueProvider;

  /** Storage provider (default: MemoryStorageProvider) */
  storage?: StorageProvider;

  /** Logging provider (default: ConsoleLogger, false to disable) */
  logger?: LoggingProvider | false;

  /** Custom context data available in tasks */
  context?: S;
};

export type TOnHandlerResult = {
  op: TriggerOperation;
  potIndex?: number;
};

export type TOnHandlerContext<Spicy, CtxPot, TriggerPot> =
  & Spicy
  & (CtxPot extends undefined ? { pot: TriggerPot }
    : Equal<TriggerPot, CtxPot> extends true ? { ctx: CtxPot }
    : { ctx: CtxPot; pot: TriggerPot })
  & {
    log: EventDrivenLogger;
    allow: (index?: number) => {
      op: TriggerOperation.Allow;
      potIndex?: number;
    };
    deny: () => {
      op: TriggerOperation.Deny;
    };
  };

export type TTaskTriggerHandler<Spicy, CtxPot, TriggerPot> = (
  args: TOnHandlerContext<Spicy, CtxPot, TriggerPot>,
) => TOnHandlerResult;

export type TTaskTrigger<Spicy, CTX, TP> = {
  taskName: string;
  potConstructor: Constructor<Pot>;
  slot: number;
  handler: TTaskTriggerHandler<Spicy, CTX, TP>;
  belongsToWorkflow: string | undefined;
};

export type TAnyTaskTrigger = TTaskTrigger<any, any, any>;

export type TDoHandlerResult = {
  op: DoOperation;
  reason?: string;
  taskBuilders?: Array<TTaskBuilder>;
  data?: Partial<TPot["data"]>;
  afterMs?: number;
};

export type TDoHandlerContext<Spicy, CtxPot, Pots extends Pot[]> =
  & Spicy
  & (CtxPot extends undefined ? { pots: Pots }
    : { ctx: CtxPot; pots: Tail<Pots> })
  & {
    log: EventDrivenLogger;
    next: (
      builders: Array<TTaskBuilder> | TTaskBuilder,
      data?: Partial<Pots[0]["data"]>,
    ) => {
      op: DoOperation.Next;
      taskBuilders: Array<TTaskBuilder>;
      data?: Partial<Pots[0]["data"]>;
    };
    finish: () => {
      op: DoOperation.Finish;
    };
    fail: (reason?: string) => {
      op: DoOperation.Fail;
      reason?: string;
    };
    repeat: () => {
      op: DoOperation.Repeat;
    };
  };

export type TTaskDoHandler<Spicy, CtxPot, Pots extends Pot[]> = (
  args: TDoHandlerContext<Spicy, CtxPot, Pots>,
) => Promise<TDoHandlerResult>;

export type TAnyTaskDoHandler = TTaskDoHandler<any, Pot[], any>;

export type TTask = {
  name: string;
  attempts: number;
  interval: number;
  timeout: number;
  slotsCount: number;
  belongsToWorkflow: string | undefined;
  triggers: { [key: string]: Array<TAnyTaskTrigger> };
  do: TAnyTaskDoHandler;
  fail: (error: Error) => Promise<void>;
};

export type TTaskBuilder = {
  task: TTask;
  build(): TTask;
};

export type TWorkflow = {
  name: string;
  triggers: { [key: string]: TWorkflowTrigger };
  tasks: Array<TTask>;
  firstTaskName: string;
};

export type TWorkflowBuilder = {
  workflow: TWorkflow;
  build: () => TWorkflow;
};

export type TPotsConstructorsList = Array<Constructor<Pot>>;

/**
 * Predicate function for .when() trigger filtering
 */
export type TWhenPredicate<T> = (data: T) => boolean;

// ============================================================================
// Pot Input Types
// ============================================================================

/**
 * Input type for task(): either a Pot class constructor or a PotFactory
 */
// deno-lint-ignore no-explicit-any
export type PotInput = Constructor<Pot<any>> | PotFactory<any>;

/**
 * Input for send()/execute(): can be PotFactory, PotInstance, or TPot
 */
// deno-lint-ignore no-explicit-any
export type PotLike = TPot | PotInstance<any> | PotFactory<any>;

/**
 * Type guard to check if input is a PotFactory
 */
// deno-lint-ignore no-explicit-any
export function isPotFactory(input: any): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "create" in input &&
    "name" in input && "_class" in input;
}

/**
 * Convert a single PotInput to its Pot type
 */
// deno-lint-ignore no-explicit-any
export type ToPot<S> = S extends Constructor<infer P extends Pot<any>> ? P
  : S extends PotFactory<infer D> ? Pot<D & { [key: string]: unknown }>
  : never;

/**
 * Convert array of PotInputs to array of Pot types
 */
export type ToPots<Sources extends PotInput[]> = {
  [K in keyof Sources]: ToPot<Sources[K]>;
};

/**
 * Type helper to create a Pot type from data type (for workflow context)
 */
export type PotWithData<D extends object> = Pot<D & { [key: string]: unknown }>;

// ============================================================================
// Provider Interfaces
// ============================================================================

/**
 * Entry returned by scan()
 */
export type StorageEntry = {
  key: string[];
  pot: TPot;
};

/**
 * Queue provider interface for message passing.
 * Implement this interface to use custom queue backends (Redis, RabbitMQ, etc.)
 *
 * @example
 * ```typescript
 * import type { QueueProvider } from "@vseplet/shibui";
 *
 * class RedisQueueProvider implements QueueProvider {
 *   async open() { await this.client.connect(); }
 *   close() { this.client.disconnect(); }
 *   async enqueue(pot) { await this.client.lpush("queue", JSON.stringify(pot)); }
 *   listen(handler) { this.client.blpop("queue", (msg) => handler(JSON.parse(msg))); }
 * }
 * ```
 */
export interface QueueProvider {
  /** Initialize connection */
  open(): Promise<void>;

  /** Close connection and cleanup */
  close(): void;

  /** Add pot to processing queue */
  enqueue(pot: TPot): Promise<void>;

  /** Subscribe to queue messages */
  listen(handler: (pot: TPot) => void): void;
}

/**
 * Storage provider interface for KV persistence.
 * Implement this interface to use custom storage backends (Redis, PostgreSQL, etc.)
 *
 * @example
 * ```typescript
 * import type { StorageProvider } from "@vseplet/shibui";
 *
 * class RedisStorageProvider implements StorageProvider {
 *   async open() { await this.client.connect(); }
 *   close() { this.client.disconnect(); }
 *   async store(key, pot) { await this.client.hset("pots", key.join(":"), JSON.stringify(pot)); }
 *   async retrieve(key) { const v = await this.client.hget("pots", key.join(":")); return v ? JSON.parse(v) : null; }
 *   async remove(key) { await this.client.hdel("pots", key.join(":")); }
 *   async *scan(prefix) { ... }
 *   async removeMany(keys) { ... }
 * }
 * ```
 */
export interface StorageProvider {
  /** Initialize connection */
  open(): Promise<void>;

  /** Close connection and cleanup */
  close(): void;

  /** Store pot by composite key */
  store(key: string[], pot: TPot): Promise<void>;

  /** Retrieve pot by key, null if not found */
  retrieve(key: string[]): Promise<TPot | null>;

  /** Remove pot by key */
  remove(key: string[]): Promise<void>;

  /** Iterate over all pots matching key prefix */
  scan(prefix: string[]): AsyncIterableIterator<StorageEntry>;

  /** Remove multiple pots atomically */
  removeMany(keys: string[][]): Promise<void>;
}

/**
 * Log entry passed to LoggingProvider
 */
export interface LogEntry {
  level: LogLevel;
  sourceType: SourceType;
  sourceName: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Logging provider interface for pluggable log backends.
 * Implement this interface to use custom loggers (file, external services, etc.)
 *
 * @example
 * ```typescript
 * import type { LoggingProvider } from "@vseplet/shibui";
 *
 * class FileLoggingProvider implements LoggingProvider {
 *   log(entry) {
 *     fs.appendFileSync("app.log", JSON.stringify(entry) + "\n");
 *   }
 * }
 *
 * core({ logging: new FileLoggingProvider() })
 * ```
 */
export interface LoggingProvider {
  /** Log an entry */
  log(entry: LogEntry): void;
}
