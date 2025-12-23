// Import and re-export enums from types
import {
  DoOperation,
  EventType,
  LogLevel,
  PotType,
  SourceType,
  TaskType,
  TriggerOperation,
  TriggerRule,
  UNKNOWN_TARGET,
} from "$core/types";

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
};

import type {
  TDoOp,
  TEventType,
  TLogLevel,
  TLogSource,
  TPotType,
  TTaskType,
  TTriggerOp,
} from "$core/types";

// ============================================================================
// Deprecated Constants - Use enums instead
// ============================================================================

/** @deprecated Use TriggerOperation.Allow instead */
export const TRIGGER_OP_ALLOW: TTriggerOp = TriggerOperation.Allow;
/** @deprecated Use TriggerOperation.Deny instead */
export const TRIGGER_OP_DENY: TTriggerOp = TriggerOperation.Deny;

/** @deprecated Use DoOperation.Next instead */
export const DO_OP_NEXT: TDoOp = DoOperation.Next;
/** @deprecated Use DoOperation.Fail instead */
export const DO_OP_FAIL: TDoOp = DoOperation.Fail;
/** @deprecated Use DoOperation.Finish instead */
export const DO_OP_FINISH: TDoOp = DoOperation.Finish;
/** @deprecated Use DoOperation.Repeat instead */
export const DO_OP_REPEAT: TDoOp = DoOperation.Repeat;

/** @deprecated Use PotType.Unknown instead */
export const POT_TYPE_UNKNOWN: TPotType = PotType.Unknown;
/** @deprecated Use PotType.External instead */
export const POT_TYPE_EXTERNAL: TPotType = PotType.External;
/** @deprecated Use PotType.Internal instead */
export const POT_TYPE_INTERNAL: TPotType = PotType.Internal;
/** @deprecated Use PotType.System instead */
export const POT_TYPE_SYSTEM: TPotType = PotType.System;
/** @deprecated Use PotType.Context instead */
export const POT_TYPE_CONTEXT: TPotType = PotType.Context;

/** @deprecated Use LogLevel.Unknown instead */
export const LOG_LEVEL_UNKNOWN: TLogLevel = LogLevel.Unknown;
/** @deprecated Use LogLevel.Trace instead */
export const LOG_LEVEL_TRACE: TLogLevel = LogLevel.Trace;
/** @deprecated Use LogLevel.Debug instead */
export const LOG_LEVEL_DEBUG: TLogLevel = LogLevel.Debug;
/** @deprecated Use LogLevel.Verbose instead */
export const LOG_LEVEL_VERBOSE: TLogLevel = LogLevel.Verbose;
/** @deprecated Use LogLevel.Info instead */
export const LOG_LEVEL_INFO: TLogLevel = LogLevel.Info;
/** @deprecated Use LogLevel.Warn instead */
export const LOG_LEVEL_WARN: TLogLevel = LogLevel.Warn;
/** @deprecated Use LogLevel.Error instead */
export const LOG_LEVEL_ERROR: TLogLevel = LogLevel.Error;
/** @deprecated Use LogLevel.Fatal instead */
export const LOG_LEVEL_FATAL: TLogLevel = LogLevel.Fatal;

/** @deprecated Use SourceType.Unknown instead */
export const LOG_SOURCE_UNKNOWN: TLogSource = SourceType.Unknown;
/** @deprecated Use SourceType.Core instead */
export const LOG_SOURCE_CORE: TLogSource = SourceType.Core;
/** @deprecated Use SourceType.Task instead */
export const LOG_SOURCE_TASK: TLogSource = SourceType.Task;
/** @deprecated Use SourceType.TaskTest instead */
export const LOG_SOURCE_TASK_ON: TLogSource = SourceType.TaskTest;
/** @deprecated Use SourceType.TaskDo instead */
export const LOG_SOURCE_TASK_DO: TLogSource = SourceType.TaskDo;
/** @deprecated Use SourceType.Workflow instead */
export const LOG_SOURCE_WORKFLOW: TLogSource = SourceType.Workflow;

/** @deprecated Use TaskType.Single instead */
export const TASK_TYPE_SINGLE: TTaskType = TaskType.Single;
/** @deprecated Use TaskType.Dependent instead */
export const TASK_TYPE_DEPENDED: TTaskType = TaskType.Dependent;
/** @deprecated Use TaskType.SingleWorkflow instead */
export const TASK_TYPE_SINGLE_WORKFLOW: TTaskType = TaskType.SingleWorkflow;
/** @deprecated Use TaskType.DependentWorkflow instead */
export const TASK_TYPE_DEPENDED_WORKFLOW: TTaskType = TaskType.DependentWorkflow;

/** @deprecated Use EventType.Unknown instead */
export const EVENT_TYPE_UNKNOWN: TEventType = EventType.Unknown;
/** @deprecated Use EventType.Core instead */
export const EVENT_TYPE_CORE: TEventType = EventType.Core;
/** @deprecated Use EventType.Log instead */
export const EVENT_TYPE_LOG: TEventType = EventType.Log;
/** @deprecated Use EventType.Runner instead */
export const EVENT_TYPE_RUNNER: TEventType = EventType.Runner;
/** @deprecated Use EventType.Workflow instead */
export const EVENT_TYPE_WORKFLOW: TEventType = EventType.Workflow;
/** @deprecated Use EventType.Task instead */
export const EVENT_TYPE_TASK: TEventType = EventType.Task;
