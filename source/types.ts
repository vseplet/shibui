// deno-lint-ignore-file no-explicit-any
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

import type { Constructor, Equal, Tail } from "$helpers/types";
import type { emitters } from "$shibui/emitters";
import type { EventDrivenLogger } from "$shibui/components";
import type { TaskBuilder } from "./entities/TaskBuilder.ts";
import type { Pot, WorkflowBuilder } from "$shibui/entities";
import type { ContextPot } from "$shibui/pots";

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

export type TSError = {
  createdAt: number;
};

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

  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP>;

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

export type TCoreOptions<S = TSpicy> = {
  mode?: "simple" | "default";
  kv?: {
    inMemory?: boolean;
    path?: string;
  };
  logger?: {
    enable: boolean;
  };
  spicy?: S;
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
