import type {
  TDoOp,
  TEventType,
  TLogLevel,
  TLogSource,
  TPotType,
  TTaskType,
  TTriggerOp,
} from "$core/types";

export const TRIGGER_OP_ALLOW: TTriggerOp = "ALLOW";
export const TRIGGER_OP_DENY: TTriggerOp = "DENY";

export const DO_OP_NEXT: TDoOp = "NEXT";
export const DO_OP_FAIL: TDoOp = "FAIL";
export const DO_OP_FINISH: TDoOp = "FINISH";
export const DO_OP_REPEAT: TDoOp = "REPEAT";

export const POT_TYPE_UNKNOWN: TPotType = "UNKNOWN";
export const POT_TYPE_EXTERNAL: TPotType = "EXTERNAL";
export const POT_TYPE_INTERNAL: TPotType = "INTERNAL";
export const POT_TYPE_SYSTEM: TPotType = "SYSTEM";
export const POT_TYPE_CONTEXT: TPotType = "CONTEXT";

export const LOG_LEVEL_UNKNOWN: TLogLevel = "UNKNOWN";
export const LOG_LEVEL_TRACE: TLogLevel = "TRACE";
export const LOG_LEVEL_DEBUG: TLogLevel = "DEBUG";
export const LOG_LEVEL_VERBOSE: TLogLevel = "VERBOSE";
export const LOG_LEVEL_INFO: TLogLevel = "INFO";
export const LOG_LEVEL_WARN: TLogLevel = "WARN";
export const LOG_LEVEL_ERROR: TLogLevel = "ERROR";
export const LOG_LEVEL_FATAL: TLogLevel = "FATAL";

export const LOG_SOURCE_UNKNOWN: TLogSource = "UNKNOWN";
export const LOG_SOURCE_CORE: TLogSource = "CORE";
export const LOG_SOURCE_TASK: TLogSource = "TASK";
export const LOG_SOURCE_TASK_ON: TLogSource = "TASK.ON";
export const LOG_SOURCE_TASK_DO: TLogSource = "TASK.DO";
export const LOG_SOURCE_WORKFLOW: TLogSource = "WORKFLOW";

export const TASK_TYPE_SINGLE: TTaskType = "single";
export const TASK_TYPE_DEPENDED: TTaskType = "depended";
export const TASK_TYPE_SINGLE_WORKFLOW: TTaskType = "singleWorkflow";
export const TASK_TYPE_DEPENDED_WORKFLOW: TTaskType = "dependedWorkflow";

export const EVENT_TYPE_UNKNOWN: TEventType = "UNKNOWN";
export const EVENT_TYPE_CORE: TEventType = "CORE";
export const EVENT_TYPE_LOG: TEventType = "LOG";
export const EVENT_TYPE_RUNNER: TEventType = "RUNNER";
export const EVENT_TYPE_WORKFLOW: TEventType = "WORKFLOW";
export const EVENT_TYPE_TASK: TEventType = "TASK";
