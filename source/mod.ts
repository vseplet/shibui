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

/**
 * Shibui - Workflow Automation Engine
 *
 * Main entry point - re-exports everything from submodules.
 */

// ============================================================================
// Public API (v1.0)
// ============================================================================

export {
  // Chain & Pipe utilities
  chain,
  // Pot factories
  context,
  // Core creation
  core,
  CoreStartPot,
  // Execution utilities
  execute,
  pipe,
  pot,
  runCI,
  shibui,
  // Task & Workflow builders
  task,
  workflow,
} from "$shibui/api";

// Alias for backwards compatibility
export { CoreStartPot as CoreStart } from "$shibui/api";

// Default export
export { core as default } from "$shibui/api";

// ============================================================================
// Core Classes
// ============================================================================

export {
  ContextPot,
  Core,
  Pot,
  SEvent,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/core";

// ============================================================================
// Storage Providers
// ============================================================================

export { DenoKvProvider, MemoryProvider } from "$shibui/providers";

// ============================================================================
// Runtime Detection
// ============================================================================

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

// ============================================================================
// Events
// ============================================================================

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

// ============================================================================
// Enums
// ============================================================================

export {
  DoOperation,
  EventType,
  LogLevel,
  PotType,
  SourceType,
  TaskType,
  TriggerOperation,
  TriggerRule,
  UNKNOWN_TARGET,
} from "$shibui/types";

// ============================================================================
// Types
// ============================================================================

export type {
  // Chain & Pipe
  ChainConfig,
  // Type helpers
  Constructor,
  Equal,
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
  TPotData,
  TPotInstanceOf,
  TPotPack,
  TPotsConstructorsList,
  TPotSource,
  Transform,
  TSEvent,
  TSpicy,
  TTask,
  TTaskBuilder,
  TTaskDoHandler,
  TTaskTrigger,
  TTaskTriggerHandler,
  TTaskTriggerStorage,
  TWhenPredicate,
  TWorkflow,
  TWorkflowBuilder,
  TWorkflowTrigger,
  TWorkflowTriggerHandler,
  TWorkflowTriggerHandlerContext,
  TWorkflowTriggersStorage,
  WorkflowsStorage,
} from "$shibui/types";

export { isPotFactory } from "$shibui/types";
