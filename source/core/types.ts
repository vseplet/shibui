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

import type { TConstructor } from "$helpers/types";
import type { emitters } from "$core/emitters";
import type { TaskBuilder, WorkflowBuilder } from "$core/entities";

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
  type: SEventType;
  name: string;
  timestamp: number;
};

export type TTask = {
  type?: TaskType;
  name: string;
  attempts: number;
  timeout: number;
  slotsCount: number;
  triggers: {
    [key: string]: Array<TTaskTrigger<{}>>;
  };
  do({}): Promise<TDoHandlerResult>;
  belongsToWorkflow: string | undefined;
};

export type TTaskBuilder = {
  task: TTask;
  build(): TTask;
};

export type TTriggerHandlerOp = "ALLOW" | "DENY";

export type TSpicy = Record<string | number | symbol, never>;

export type TTriggerHandlerContext<
  S extends TSpicy,
  P1 extends TPot,
  P2 extends TPot | undefined = undefined,
  P3 extends TPot | undefined = undefined,
  P4 extends TPot | undefined = undefined,
  P5 extends TPot | undefined = undefined,
> = S & {
  core: TCore<S>;
  pots: [P1, P2, P3, P4, P5];
  log: TEventDrivenLogger;
  allow: (
    potIndex?: number,
  ) => { op: TTriggerHandlerOp; potIndex: number };
  deny: () => { op: TTriggerHandlerOp };
};

export type TDoHandlerContext<
  S extends TSpicy,
  P1 extends TPot,
  P2 extends TPot | undefined = undefined,
  P3 extends TPot | undefined = undefined,
  P4 extends TPot | undefined = undefined,
  P5 extends TPot | undefined = undefined,
> = S & {
  core: TCore<S>;
  pots: [P1, P2, P3, P4, P5];
  log: TEventDrivenLogger;

  next: (
    taskBuilders: TTaskBuilder | Array<TTaskBuilder>,
    data?: Partial<P1["data"]>,
  ) => {
    op: DoHandlerOp.NEXT;
    taskBuilders: Array<TTaskBuilder>;
    data?: Partial<P1["data"]>;
  };

  fail: (reason?: string) => {
    op: DoHandlerOp.FAIL;
    reason: string;
  };

  finish: () => {
    op: DoHandlerOp.FINISH;
  };

  repeat: (
    data?: Partial<P1["data"]>,
  ) => {
    op: DoHandlerOp.REPEAT;
    data?: Partial<P1["data"]>;
  };
};

export type TTriggerHandlerResult = {
  op: TTriggerHandlerOp;
  potIndex?: number;
};

export type TDoHandlerResult =
  | {
    op: DoHandlerOp.NEXT;
    taskBuilders: Array<TTaskBuilder>;
    data?: Partial<TPot["data"]>;
  }
  | {
    op: DoHandlerOp.FAIL;
    reason: string;
  }
  | {
    op: DoHandlerOp.FINISH;
  }
  | {
    op: DoHandlerOp.REPEAT;
    data?: Partial<TPot["data"]>;
  };

export type TTaskTrigger<S extends TSpicy> = {
  taskName: string;
  potConstructor: TConstructor<TPot>;
  slot: number;
  handler(
    ctx: TTriggerHandlerContext<
      S,
      TPot,
      TPot | undefined,
      TPot | undefined,
      TPot | undefined,
      TPot | undefined
    >,
  ): TTriggerHandlerResult;
  belongsToWorkflow: string | undefined;
};

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

export type IWorkflowBuilderSetupArgs<
  ContextPot extends TPot,
  S extends TSpicy,
> = {
  task1: () => TaskBuilder<
    S,
    ContextPot,
    TPot,
    TPot,
    TPot,
    TPot
  >;

  shared1: (
    builder: TaskBuilder<
      TSpicy,
      ContextPot,
      TPot,
      TPot,
      TPot,
      TPot
    >,
  ) => TaskBuilder<
    TSpicy,
    ContextPot,
    TPot,
    TPot,
    TPot,
    TPot
  >;
};

export type TWorkflowTrigger = {
  workflowName: string;
  potConstructor: TConstructor<TPot>;
  handler({}): TPot | null;
};

export type TWorkflow = {
  name: string;
  triggers: {
    [key: string]: TWorkflowTrigger;
  };
  tasks: Array<TTask>;
  firstTaskName: string;
};

export type TWorkflowBuilder = {
  workflow: TWorkflow;
  taskBuilders: Array<
    TTaskBuilder
  >;
  build(): TWorkflow;
};

export type TWorkflowTriggersStorage = {
  [potName: string]: Array<TWorkflowTrigger>;
};

export type TTaskTriggerStorage = {
  [potName: string]: Array<TTaskTrigger<{}>>;
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
  workflow<ContextPot extends TPot>(
    contextPotConstructor: TConstructor<ContextPot>,
  ): WorkflowBuilder<ContextPot, S>;
  task<
    P1 extends TPot,
    P2 extends TPot,
    P3 extends TPot,
    P4 extends TPot,
    P5 extends TPot,
  >(
    p1: TConstructor<P1>,
    p2?: TConstructor<P2>,
    p3?: TConstructor<P3>,
    p4?: TConstructor<P4>,
    p5?: TConstructor<P5>,
  ): TaskBuilder<S, P1, P2, P3, P4, P5>;
  emitters: typeof emitters;

  createLogger(options: TLoggerOptions): TEventDrivenLogger;
  start(): Promise<void>;
  register(builder: TTaskBuilder | TWorkflowBuilder): void;
  disable(builder: TTaskBuilder | TWorkflowBuilder): void;
  enable(builder: TTaskBuilder | TWorkflowBuilder): void;
  send(pot: TPot, builder?: TTaskBuilder): void;
};

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
  useDenoKV?: boolean;
  spicy?: S;
};

// Какая-то хуйня:
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

export enum PotType {
  UNKNOWN = "UNKNOWN",
  EXTERNAL = "EXTERNAL",
  INTERNAL = "INTERNAL",
  SYSTEM = "SYSTEM",
  CONTEXT = "CONTEXT",
}

export enum DoHandlerOp {
  NEXT,
  FAIL,
  FINISH,
  REPEAT,
}

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

export enum SEventType {
  UNKNOWN,
  CORE,
  LOG,
  RUNNER,
  WORKFLOW,
  TASK,
}

export enum TaskType {
  single,
  depended,
  singleWorkflow,
  dependedWorkflow,
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
