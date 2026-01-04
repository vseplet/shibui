// deno-lint-ignore-file
import { SEvent } from "./runtime/SEvent.ts";
import {
  EventType,
  LogLevel,
  SourceType,
  TLogEventArgs,
  TLogEventMetadata,
  UNKNOWN_TARGET,
} from "$shibui/types";

// Core Events
export class CoreEvent extends SEvent {
  override type = EventType.Core;

  constructor() {
    super();
  }
}

export class TaskFailedEvent extends CoreEvent {}
export class TaskFinishedEvent extends CoreEvent {}
export class WorkflowFailedEvent extends CoreEvent {}
export class WorkflowFinishedEvent extends CoreEvent {}
export class WorkflowStartedEvent extends CoreEvent {}

// Log Events
export class LogEvent<T> extends SEvent {
  override type = EventType.Log;
  level = LogLevel.Unknown;
  sourceName: string = UNKNOWN_TARGET;
  sourceType = SourceType.Unknown;
  msg: string;
  metadata: T = {} as T;

  constructor(args: TLogEventArgs, msg = "", metadata?: T) {
    super();
    this.sourceName = args.sourceName;
    this.sourceType = args.sourceType;
    this.msg = msg;
    if (metadata) this.metadata = metadata;
  }
}

export class DebugLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Debug;
}

export class TraceLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Trace;
}

export class VerboseLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Verbose;
}

export class InfoLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Info;
}

export class WarnLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Warn;
}

export class ErrorLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Error;
}

export class FatalLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Fatal;
}
