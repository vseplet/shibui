/**
 * Shibui - Workflow Automation Engine
 *
 * Main entry point - re-exports everything from submodules.
 */

import { Core } from "$shibui/runtime";
import type { TShibuiOptions, TSpicy } from "$shibui/types";
import { MemoryQueueProvider } from "./providers/MemoryQueueProvider.ts";
import { MemoryStorageProvider } from "./providers/MemoryStorageProvider.ts";
import { ConsoleLogger } from "./providers/ConsoleLogger.ts";

/**
 * Creates and returns a new instance of Shibui Core with sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal - uses Memory providers and ConsoleLogger
 * const app = shibui();
 *
 * // Without logging
 * const app = shibui({ logger: false });
 *
 * // With DenoKV persistence
 * const app = shibui({
 *   queue: new DenoKvQueueProvider("./data.db"),
 *   storage: new DenoKvStorageProvider("./data.db"),
 * });
 *
 * // Full configuration
 * const app = shibui({
 *   queue: new DenoKvQueueProvider("./data.db"),
 *   storage: new DenoKvStorageProvider("./data.db"),
 *   logger: new LuminousProvider({ level: "debug" }),
 *   context: { userId: "123" },
 * });
 * ```
 */
export function shibui<S extends TSpicy = {}>(
  options: TShibuiOptions<S> = {},
): Core<S> {
  const queue = options.queue ?? new MemoryQueueProvider();
  const storage = options.storage ?? new MemoryStorageProvider();
  const logger = options.logger === false
    ? null
    : (options.logger ?? new ConsoleLogger());

  return new Core({
    queue,
    storage,
    logger,
    context: options.context,
  });
}

export default shibui;

export {
  // Chain & Pipe utilities
  chain,
  // Pot factories
  context,
  CoreStartPot,
  // Execution utilities
  execute,
  pipe,
  pot,
  runCI,
  // Task & Workflow builders
  task,
  workflow,
} from "$shibui/api";

export { CoreStartPot as CoreStart } from "$shibui/api";

export {
  ContextPot,
  Core,
  Pot,
  SEvent,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/runtime";

export { MemoryQueueProvider } from "./providers/MemoryQueueProvider.ts";
export { DenoKvQueueProvider } from "./providers/DenoKvQueueProvider.ts";
export { MemoryStorageProvider } from "./providers/MemoryStorageProvider.ts";
export { DenoKvStorageProvider } from "./providers/DenoKvStorageProvider.ts";
export { ConsoleLogger } from "./providers/ConsoleLogger.ts";
export { LuminousProvider } from "./providers/LuminousProvider.ts";

export {
  detectRuntime,
  exit,
  getRuntimeInfo,
  getRuntimeVersion,
  isBun,
  isDeno,
  isNode,
  runtime,
} from "$helpers";

export {
  CoreEvent,
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  LogEvent,
  TaskFailedEvent,
  TaskFinishedEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
  WorkflowStartedEvent,
} from "$shibui/events";

export {
  DoOperation,
  EventType,
  isPotFactory,
  LogLevel,
  PotType,
  SourceType,
  TaskType,
  TriggerOperation,
  TriggerRule,
  UNKNOWN_TARGET,
} from "$shibui/types";

export type {
  // Chain & Pipe
  ChainConfig,
  // Type helpers
  Constructor,
  Equal,
  // Logging provider
  LogEntry,
  LoggingProvider,
  // Pot factory types
  PotClass,
  PotData,
  PotFactory,
  PotInput,
  PotInstance,
  PotLike,
  PotOf,
  PotOptions,
  PotWithData,
  // Queue provider
  QueueProvider,
  // Runtime
  Runtime,
  // Storage provider
  StorageEntry,
  StorageProvider,
  Tail,
  // Core types
  TAnyCore,
  TAnyTaskDoHandler,
  TAnyTaskTrigger,
  TasksStorage,
  TCore,
  TCoreOptions,
  TDoHandlerContext,
  TDoHandlerResult,
  TEventDrivenLogger,
  TLogEventArgs,
  TLogEventMetadata,
  TLoggerOptions,
  TOnHandlerContext,
  TOnHandlerResult,
  ToPot,
  ToPots,
  TPot,
  TPotPack,
  TPotsConstructorsList,
  Transform,
  TSEvent,
  TShibuiOptions,
  TSpicy,
  TTask,
  TTaskBuilder,
  TTaskDoHandler,
  TTaskTrigger,
  TTaskTriggerHandler,
  TTaskTriggerStorage,
  TWorkflow,
  TWorkflowBuilder,
  TWorkflowTrigger,
  TWorkflowTriggerHandler,
  TWorkflowTriggerHandlerContext,
  TWorkflowTriggersStorage,
  WorkflowsStorage,
} from "$shibui/types";
