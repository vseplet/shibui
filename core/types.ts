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

import { Constructor } from "../helpers/types.ts";
import { EventDrivenLogger } from "./components/EventDrivenLogger.ts";
import { TaskBuilder } from "./entities/TaskBuilder.ts";
import core from "./mod.ts";

export enum PotType {
  UNKNOWN = "UNKNOWN",
  EXTERNAL = "EXTERNAL",
  INTERNAL = "INTERNAL",
  SYSTEM = "SYSTEM",
  CONTEXT = "CONTEXT",
}

export interface IPot {
  toc: number;
  uuid: string;
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

export type TriggerHandlerArgs<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> = {
  api: typeof core.api;
  pots: [P1, P2, P3, P4, P5];
  log: EventDrivenLogger;
  allow: (
    potIndex?: number,
  ) => { op: TriggerHandlerOp.ALLOW; potIndex: number };
  deny: () => { op: TriggerHandlerOp.DENY };
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

export type DoHandlerArgs<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> = {
  api: typeof core.api;
  log: EventDrivenLogger;
  pots: [P1, P2, P3, P4, P5];

  next: (
    tasks: ITaskBuilder | Array<ITaskBuilder>,
    data?: Array<[
      Partial<P1["data"]>,
      Partial<P2 extends IPot ? P2["data"] : never>,
      Partial<P3 extends IPot ? P3["data"] : never>,
      Partial<P4 extends IPot ? P4["data"] : never>,
      Partial<P5 extends IPot ? P5["data"] : never>,
    ]>,
  ) => {
    op: DoHandlerOp.NEXT;
    tasks: Array<ITaskBuilder>;
    data?: Array<[
      Partial<P1["data"]>,
      Partial<P2 extends IPot ? P2["data"] : never>,
      Partial<P3 extends IPot ? P3["data"] : never>,
      Partial<P4 extends IPot ? P4["data"] : never>,
      Partial<P5 extends IPot ? P5["data"] : never>,
    ]>;
  };

  fail: (reason?: string) => {
    op: DoHandlerOp.FAIL;
    reason: string;
  };

  finish: () => {
    op: DoHandlerOp.FINISH;
  };

  repeat: (
    data?: Array<[
      Partial<P1["data"]>,
      Partial<P2 extends IPot ? P2["data"] : never>,
      Partial<P3 extends IPot ? P3["data"] : never>,
      Partial<P4 extends IPot ? P4["data"] : never>,
      Partial<P5 extends IPot ? P5["data"] : never>,
    ]>,
  ) => {
    op: DoHandlerOp.REPEAT;
  };
};

export type DoHandlerResult =
  | {
    op: DoHandlerOp.NEXT;
    tasks: Array<ITaskBuilder>;
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
> = (args: { pot: TriggerPot; log: EventDrivenLogger }) => ContextPot | null;

export interface IWorkflowBuilderSetupArgs<ContextPot extends IPot> {
  task1: () => TaskBuilder<
    ContextPot
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
