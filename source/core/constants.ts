import type {
  TDoOp,
  TEventType,
  TLogLevel,
  TLogSource,
  TPotType,
  TTaskType,
  TTriggerHandlerOp,
  TTriggerOp,
} from "$core/types";

export const TRIGGER_OP_ALLOW: TTriggerHandlerOp = "ALLOW";
export const TRIGGER_OP_DENY: TTriggerHandlerOp = "DENY";

export const TRIGGER_OP = {
  ALLOW: "ALLOW" as TTriggerOp,
  DENY: "DENY" as TTriggerOp,
};

export const POT_TYPE = {
  UNKNOWN: "UNKNOWN" as TPotType,
  EXTERNAL: "EXTERNAL" as TPotType,
  INTERNAL: "INTERNAL" as TPotType,
  SYSTEM: "SYSTEM" as TPotType,
  CONTEXT: "CONTEXT" as TPotType,
};

export const DO_OP = {
  NEXT: "NEXT" as TDoOp,
  FAIL: "FAIL" as TDoOp,
  FINISH: "FINISH" as TDoOp,
  REPEAT: "REPEAT" as TDoOp,
};

export const LOG_LEVEL = {
  UNKNOWN: "UNKNOWN" as TLogLevel,
  TRACE: "TRACE" as TLogLevel,
  DEBUG: "DEBUG" as TLogLevel,
  VERBOSE: "VERBOSE" as TLogLevel,
  INFO: "INFO" as TLogLevel,
  WARN: "WARN" as TLogLevel,
  ERROR: "ERROR" as TLogLevel,
  FATAL: "FATAL" as TLogLevel,
};

export const LOG_SOURCE = {
  UNKNOWN: "UNKNOWN" as TLogSource,
  CORE: "CORE" as TLogSource,
  TASK: "TASK" as TLogSource,
  TASK_ON: "TASK.ON" as TLogSource,
  TASK_DO: "TASK.DO" as TLogSource,
  WORKFLOW: "WORKFLOW" as TLogSource,
};

export const TASK_TYPE = {
  SINGLE: "single" as TTaskType,
  DEPENDED: "depended" as TTaskType,
  SINGLE_WORKFLOW: "singleWorkflow" as TTaskType,
  DEPENDED_WORKFLOW: "dependedWorkflow" as TTaskType,
};

export const EVENT_TYPE = {
  UNKNOWN: "UNKNOWN" as TEventType,
  CORE: "CORE" as TEventType,
  LOG: "LOG" as TEventType,
  RUNNER: "RUNNER" as TEventType,
  WORKFLOW: "WORKFLOW" as TEventType,
  TASK: "TASK" as TEventType,
};
