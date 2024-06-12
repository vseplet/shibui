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

import type { Constructor } from "$helpers/types";
import type { emitters } from "$core/emitters";
import type { task, TaskBuilder } from "./entities/TaskBuilder.ts";
import type { workflow, WorkflowBuilder } from "./entities/WorkflowBuilder.ts";

export enum PotType {
  UNKNOWN = "UNKNOWN",
  EXTERNAL = "EXTERNAL",
  INTERNAL = "INTERNAL",
  SYSTEM = "SYSTEM",
  CONTEXT = "CONTEXT",
}

export interface IPot {
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
}

export type IPotPack = Array<IPot>;

export interface IShibuiError {
  createdAt: number;
}

export enum ShibuiEventType {
  UNKNOWN,
  CORE,
  LOG,
  RUNNER,
  WORKFLOW,
  TASK,
}

export interface IShibuiEvent {
  type: ShibuiEventType;
  name: string;
  timestamp: number;
}

export enum TaskType {
  single,
  depended,
  singleWorkflow,
  dependedWorkflow,
}

export interface ITask {
  type?: TaskType;
  name: string;
  attempts: number;
  timeout: number;
  slotsCount: number;
  triggers: {
    [key: string]: Array<TaskTrigger>;
  };
  do({}): Promise<DoHandlerResult>;
  belongsToWorkflow: string | undefined;
}

export interface ITaskBuilder {
  task: ITask;
  build(): ITask;
}

export type TriggerHandlerOp = "ALLOW" | "DENY";

export type AnyWorkflowTaskBuilder<CTX extends IPot> = TaskBuilder<
  CTX,
  IPot,
  IPot,
  IPot,
  IPot
>;

export type Spicy = Record<string | number | symbol, never>;

export type Context<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
  S = Spicy,
> = {
  core: ICore;
  pots: [P1, P2, P3, P4, P5];
  log: IEventDrivenLogger;
} & S;

export type TriggerHandlerContext<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
  S = Spicy,
> = Context<P1, P2, P3, P4, P5, S> & {
  allow: (
    potIndex?: number,
  ) => { op: TriggerHandlerOp; potIndex: number };
  deny: () => { op: TriggerHandlerOp };
};

export type DoHandlerContext<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
  S = Spicy,
> = Context<P1, P2, P3, P4, P5, S> & {
  next: (
    taskBuilders: ITaskBuilder | Array<ITaskBuilder>,
    data?: Partial<P1["data"]>,
  ) => {
    op: DoHandlerOp.NEXT;
    taskBuilders: Array<ITaskBuilder>;
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

export type TriggerHandlerResult = {
  op: TriggerHandlerOp;
  potIndex?: number;
};

export enum DoHandlerOp {
  NEXT,
  FAIL,
  FINISH,
  REPEAT,
}

export type DoHandlerResult =
  | {
    op: DoHandlerOp.NEXT;
    taskBuilders: Array<ITaskBuilder>;
    data?: Partial<IPot["data"]>;
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
    data?: Partial<IPot["data"]>;
  };

export type TaskTrigger<S = Spicy> = {
  taskName: string;
  potConstructor: Constructor<IPot>;
  slot: number;
  handler(
    ctx: TriggerHandlerContext<
      IPot,
      IPot | undefined,
      IPot | undefined,
      IPot | undefined,
      IPot | undefined,
      S
    >,
  ): TriggerHandlerResult;
  belongsToWorkflow: string | undefined;
};

export type WorkflowTriggerHandlerContext<
  TriggerPot extends IPot,
  S = Spicy,
> = S & {
  pot: TriggerPot;
  log: IEventDrivenLogger;
};

export type WorkflowTriggerHandler<
  ContextPot extends IPot,
  TriggerPot extends IPot,
  S = Spicy,
> = (args: WorkflowTriggerHandlerContext<TriggerPot, S>) => ContextPot | null;

export interface IWorkflowBuilderSetupArgs<ContextPot extends IPot, S = Spicy> {
  task1: () => TaskBuilder<
    ContextPot,
    IPot,
    IPot,
    IPot,
    IPot,
    S
  >;

  shared1: (
    builder: TaskBuilder<
      ContextPot,
      IPot,
      IPot,
      IPot,
      IPot
    >,
  ) => TaskBuilder<
    ContextPot,
    IPot,
    IPot,
    IPot,
    IPot
  >;
}

export type WorkflowTrigger = {
  workflowName: string;
  potConstructor: Constructor<IPot>;
  handler({}): IPot | null;
};

export interface IWorkflow {
  name: string;
  triggers: {
    [key: string]: WorkflowTrigger;
  };
  tasks: Array<ITask>;
  firstTaskName: string;
}

export interface IWorkflowBuilder {
  workflow: IWorkflow;
  taskBuilders: Array<
    ITaskBuilder
  >;
  build(): IWorkflow;
}

export type WorkflowTriggersStorage = {
  [potName: string]: Array<WorkflowTrigger>;
};

export type TaskTriggerStorage = {
  [potName: string]: Array<TaskTrigger>;
};

export type WorkflowsStorage = { [workflowName: string]: IWorkflow };

export type TasksStorage = { [taskName: string]: ITask };

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

export interface ILogEventArgs {
  sourceType: SourceType;
  sourceName: string;
}

export interface ILoggerOptions {
  sourceType?: SourceType;
  sourceName?: string;
}

interface IShibuiCoreSettings {
  DEFAULT_LOGGING_ENABLED: boolean;
  DEFAULT_LOGGING_LEVEL: number;
  ALLOWED_LOGGING_SOURCE_TYPES: SourceType[];
}

export interface ICore<S = Spicy> {
  workflow<ContextPot extends IPot>(
    contextPotConstructor: Constructor<ContextPot>,
  ): WorkflowBuilder<ContextPot, S>;
  task<
    P1 extends IPot,
    P2 extends IPot,
    P3 extends IPot,
    P4 extends IPot,
    P5 extends IPot,
  >(
    p1: Constructor<P1>,
    p2?: Constructor<P2>,
    p3?: Constructor<P3>,
    p4?: Constructor<P4>,
    p5?: Constructor<P5>,
  ): TaskBuilder<P1, P2, P3, P4, P5, S>;
  emitters: typeof emitters;
  settings: IShibuiCoreSettings;

  createLogger(options: ILoggerOptions): IEventDrivenLogger;
  start(): Promise<void>;
  register(builder: ITaskBuilder | IWorkflowBuilder): void;
  disable(builder: ITaskBuilder | IWorkflowBuilder): void;
  enable(builder: ITaskBuilder | IWorkflowBuilder): void;
  send(pot: IPot, builder?: ITaskBuilder): void;
}

export interface IEventDrivenLogger {
  dbg(msg: string): void;
  trc(msg: string): void;
  vrb(msg: string): void;
  inf(msg: string): void;
  err(msg: string): void;
  wrn(msg: string): void;
  flt(msg: string): void;
}

export interface ILogEventMetadata {
  name?: string;
}

export interface ICoreOptions<S = Spicy> {
  useDenoKV?: boolean;
  spicy?: S;
}
