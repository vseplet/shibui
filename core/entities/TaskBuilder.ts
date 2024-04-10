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

// deno-lint-ignore-file
import { Constructor } from "../../helpers/types.ts";
import { EventDrivenLogger } from "../components/EventDrivenLogger.ts";
import { IPot } from "./Pot.ts";
import core from "../mod.ts";
import { IWorkflowBuilder } from "./WorkflowBuilder.ts";
import { ExternalPot } from "../../pots/ExternalPot.ts";
import { TaskNameMissingError } from "../errors/TaskNameMissingError.ts";

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

export class TaskBuilder<
  P1 extends IPot,
  P2 extends IPot | undefined = undefined,
  P3 extends IPot | undefined = undefined,
  P4 extends IPot | undefined = undefined,
  P5 extends IPot | undefined = undefined,
> implements ITaskBuilder {
  task: ITask = {
    name: "unknown",
    attempts: 1,
    timeout: 0,
    slotsCount: 0,
    do: async ({ fail }: DoHandlerArgs<P1>) => {
      return fail("not implemented");
    },
    triggers: {},
    belongsToWorkflow: undefined,
  };

  constructor(
    p1: Constructor<P1>,
    p2?: Constructor<P2>,
    p3?: Constructor<P3>,
    p4?: Constructor<P4>,
    p5?: Constructor<P5>,
  ) {
    this.task.slotsCount = arguments.length;
  }

  belongsToWorkflow(builder: IWorkflowBuilder) {
    this.task.belongsToWorkflow = builder.workflow.name;
    return this;
  }

  name(name: string | TemplateStringsArray) {
    const workflowPrefix = this.task.belongsToWorkflow
      ? `[${this.task.belongsToWorkflow}] `
      : "";
    if (name instanceof Array) {
      this.task.name = workflowPrefix + name[0];
    } else {
      this.task.name = workflowPrefix + name;
    }

    for (const potName in this.task.triggers) {
      this.task.triggers[potName].forEach((trigger) =>
        trigger.taskName = this.task.name
      );
    }

    return this;
  }

  attempts(count: number) {
    this.task.attempts = count;
    return this;
  }

  timeout(ms: number) {
    this.task.timeout = ms;
    return this;
  }

  triggers(
    ...constructorList: Array<
      Constructor<Exclude<P1, undefined>>
    >
  ) {
    for (const constructor of constructorList) {
      if (
        !this.task
          .triggers[constructor.name]
      ) {
        this.task
          .triggers[constructor.name] = [];
      }

      this.task.triggers[constructor.name].push({
        taskName: this.task.name,
        potConstructor: constructor,
        slot: Object.keys(this.task.triggers).length - 1,
        handler: ({ allow }: TriggerHandlerArgs<IPot>) => {
          return allow();
        },
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  on<TP extends Exclude<P1 | P2 | P3 | P4 | P5, undefined>>(
    potConstructor: Constructor<TP>,
    handler?: (
      args: TriggerHandlerArgs<P1, P2, P3, P4, P5>,
    ) => TriggerHandlerResult,
    slot?: number,
  ): this {
    if (
      !this.task
        .triggers[potConstructor.name]
    ) {
      this.task
        .triggers[potConstructor.name] = [];
    }

    if (handler) {
      this.task.triggers[potConstructor.name].push({
        taskName: this.task.name,
        potConstructor,
        slot: Object.keys(this.task.triggers).length - 1,
        handler,
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    } else {
      this.task.triggers[potConstructor.name].push({
        taskName: this.task.name,
        potConstructor,
        slot: slot || Object.keys(this.task.triggers).length - 1,
        handler: ({ allow }: TriggerHandlerArgs<TP>) => {
          return allow();
        },
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  do(
    handler: (
      args: DoHandlerArgs<P1, P2, P3, P4, P5>,
    ) => Promise<DoHandlerResult>,
  ) {
    this.task.do = handler;
    return this;
  }

  strategy() {
    return this;
  }

  onFail(handler: (error: Error) => void) {
    return this;
  }

  build(): ITask {
    if (this.task.name == "unknown") {
      throw new TaskNameMissingError();
    }

    if (Object.keys(this.task.triggers).length == 0) {
      throw new Error();
    }

    return this.task;
  }
}

export const task = <
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
) =>
  new TaskBuilder<P1, P2, P3, P4, P5>(
    p1,
    p2,
    p3,
    p4,
    p5,
  );

export const task1 = <
  P1 extends IPot,
>(
  p1: Constructor<P1>,
) => new TaskBuilder<P1>(p1);
