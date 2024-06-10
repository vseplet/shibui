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

import type { Constructor } from "../helpers/types.ts";
import type { EventDrivenLogger } from "./components/EventDrivenLogger.ts";
import type { ShibuiCore } from "./components/ShibuiCore.ts";
import { emitters } from "./emitters.ts";
import type { task, TaskBuilder } from "./entities/TaskBuilder.ts";
import { workflow } from "./entities/WorkflowBuilder.ts";

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

export interface ITask {
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

export enum TriggerHandlerOp {
  ALLOW,
  DENY,
}

export type AnyWorkflowTaskBuilder<CTX extends IPot> = TaskBuilder<
  CTX,
  IPot,
  IPot,
  IPot,
  IPot
>;

export type Context<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> = {
  core: IShibuiCore;
  pots: [P1, P2, P3, P4, P5];
  log: IEventDrivenLogger;
};

export type TriggerHandlerContext<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> = Context<P1, P2, P3, P4, P5> & {
  allow: (
    potIndex?: number,
  ) => { op: TriggerHandlerOp.ALLOW; potIndex: number };
  deny: () => { op: TriggerHandlerOp.DENY };
};

export type DoHandlerContext<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> = Context<P1, P2, P3, P4, P5> & {
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

export type TriggerHandlerResult =
  | {
    op: TriggerHandlerOp.ALLOW;
    potIndex: number;
  }
  | {
    op: TriggerHandlerOp.DENY;
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

export type TaskTrigger = {
  taskName: string;
  potConstructor: Constructor<IPot>;
  slot: number;
  handler({}): TriggerHandlerResult;
  belongsToWorkflow: string | undefined;
};

export type WorkflowTriggerHandler<
  ContextPot extends IPot,
  TriggerPot extends IPot,
> = (args: { pot: TriggerPot; log: IEventDrivenLogger }) => ContextPot | null;

export interface IWorkflowBuilderSetupArgs<ContextPot extends IPot> {
  task1: () => TaskBuilder<
    ContextPot,
    IPot,
    IPot,
    IPot,
    IPot
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
  test({}): IPot | null;
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

export interface IShibuiCore {
  workflow: typeof workflow;
  task: typeof task;
  emitters: typeof emitters;
  settings: IShibuiCoreSettings;

  createLogger(options: ILoggerOptions): IEventDrivenLogger;
  execute(
    builder: ITaskBuilder | IWorkflowBuilder,
    pots?: Array<IPot>,
  ): Promise<IPot>;
  executeSync(
    builder: ITaskBuilder | IWorkflowBuilder,
    pots?: Array<IPot>,
  ): IPot;
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
