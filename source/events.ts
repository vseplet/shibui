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

// Registration Events
export class TaskRegisteredEvent extends CoreEvent {
  constructor(
    public readonly taskName: string,
    public readonly triggers: string[],
    public readonly belongsToWorkflow?: string,
  ) {
    super();
  }
}

export class WorkflowRegisteredEvent extends CoreEvent {
  constructor(
    public readonly workflowName: string,
    public readonly tasksCount: number,
    public readonly firstTaskName: string,
  ) {
    super();
  }
}

// Queue Events
export class PotEnqueuedEvent extends CoreEvent {
  constructor(
    public readonly potName: string,
    public readonly potUuid: string,
    public readonly potType: string,
  ) {
    super();
  }
}

export class PotDequeuedEvent extends CoreEvent {
  constructor(
    public readonly potName: string,
    public readonly potUuid: string,
  ) {
    super();
  }
}

export class PotDroppedEvent extends CoreEvent {
  constructor(
    public readonly potName: string,
    public readonly potUuid: string,
    public readonly reason: string,
  ) {
    super();
  }
}

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
