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
import type { emitters } from "$core/emitters";
import type { EventDrivenLogger } from "$core/components";
import type { TaskBuilder } from "./entities/TaskBuilder.ts";
import type {
  DO_OP_FAIL,
  DO_OP_FINISH,
  DO_OP_NEXT,
  DO_OP_REPEAT,
  TRIGGER_OP_ALLOW,
  TRIGGER_OP_DENY,
} from "$core/constants";
import type { Pot, WorkflowBuilder } from "$core/entities";
import type { ContextPot } from "$core/pots";

export type TPot = {
  toc: number;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
  name: string;
  type: TPotType;
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
  type: TEventType;
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

export type TTriggerOp = "ALLOW" | "DENY";
export type TPotType =
  | "UNKNOWN"
  | "EXTERNAL"
  | "INTERNAL"
  | "SYSTEM"
  | "CONTEXT";

export type TDoOp = "NEXT" | "FAIL" | "FINISH" | "REPEAT";

export type TLogLevel =
  | "UNKNOWN"
  | "TRACE"
  | "DEBUG"
  | "VERBOSE"
  | "INFO"
  | "WARN"
  | "ERROR"
  | "FATAL";

export type TLogSource =
  | "UNKNOWN"
  | "CORE"
  | "TASK"
  | "TASK.ON"
  | "TASK.DO"
  | "WORKFLOW";

export type TTaskType =
  | "single"
  | "depended"
  | "singleWorkflow"
  | "dependedWorkflow";

export type TEventType =
  | "UNKNOWN"
  | "CORE"
  | "LOG"
  | "RUNNER"
  | "WORKFLOW"
  | "TASK";

export enum Level {
  UNKNOWN = 0,
  TRACE = 1,
  DEBUG = 2,
  VERBOSE = 3,
  INFO = 4,
  WARN = 5,
  ERROR = 6,
  FATAL = 7,
}

export enum SourceType {
  UNKNOWN = "UNKNOWN",
  CORE = "CORE",
  TASK = "TASK",
  TASK_TEST = "TASK.ON",
  TASK_DO = "TASK.DO",
  WORKFLOW = "WORKFLOW",
  WORKFLOW_TEST = "WORKFLOW.TEST",
  WORKFLOW_FAIL = "WORKFLOW.FAIL",
  FRAMEWORK = "FRAMEWORK",
  PLUGIN = "PLUGIN",
}

export type TOnHandlerResult = {
  op: TTriggerOp;
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
      op: typeof TRIGGER_OP_ALLOW;
      potIndex?: number;
    };
    deny: () => {
      op: typeof TRIGGER_OP_DENY;
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
  op: TDoOp;
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
      op: typeof DO_OP_NEXT;
      taskBuilders: Array<TTaskBuilder>;
      data?: Partial<Pots[0]["data"]>;
    };
    finish: () => {
      op: typeof DO_OP_FINISH;
    };
    fail: (reason?: string) => {
      op: typeof DO_OP_FAIL;
      reason?: string;
    };
    repeat: () => {
      op: typeof DO_OP_REPEAT;
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
