/*
 * Copyright 2023 Vsevolod Plentev
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
import { IWorkflowBuilder, WorkflowBuilder } from "../entities/Workflow.ts";

export type TestHandlerArgs<
  PC extends IPot | undefined,
  PT extends IPot | undefined = undefined,
> =
  & {
    api: typeof core.api;
    ctx: PC;
    log: EventDrivenLogger;
    allow: (potIndex?: number) => { op: "allow"; potIndex: number };
    deny: () => { op: "deny" };
  }
  & (PT extends undefined ? {}
    : {
      pot: PT;
    });

export type TestHandlerResult =
  | {
    op: "allow";
    potIndex: number;
  }
  | {
    op: "deny";
  };

export type DoHandlerArgs<
  P1 extends IPot,
> =
  & {
    api: typeof core.api;
    log: EventDrivenLogger;
    ctx: P1;
    p1: P1;

    next: (
      taskBuilders: ITaskBuilder | Array<ITaskBuilder>,
      data?: Partial<P1["data"]>,
    ) => {
      op: "next";
      taskBuilders: Array<ITaskBuilder>;
      data?: Partial<P1["data"]>;
    };

    fail: (reason?: string) => {
      op: "fail";
      reason: string;
    };

    finish: () => {
      op: "finish";
    };

    repeat: (data?: Partial<P1["data"]>) => {
      op: "repeat";
    };
  }

export type DoHandlerResult =
  | {
    op: "next";
    taskBuilders: Array<ITaskBuilder>;
    data?: Partial<IPot["data"]>;
  }
  | {
    op: "fail";
    reason: string;
  }
  | {
    op: "finish";
  }
  | {
    op: "repeat";
    data?: Partial<IPot["data"]>;
  };

export type TaskTrigger = {
  taskName: string;
  potConstructor: Constructor<IPot>;
  slot: number; // TODO: надо точно знать какой слот заполняет хендлер данного триггера
  test({}): TestHandlerResult;
  ofWorkflow: string | undefined;
};

export interface ITask {
  name: string; // TODOL сделать так, чтобы имя в workflow было уникальным для этого workflow
  attempts: number;
  slotsCount: number;
  triggers: { // TODO: вот тут надо поработать над неймингом
    [key: string]: Array<TaskTrigger>;
  };
  do({}): Promise<DoHandlerResult>;
  ofWorkflow: string | undefined;
}

export interface ITaskBuilder {
  task: ITask;
  build(): ITask;
}

export class TaskBuilder<
  P1 extends IPot,
  PC extends IPot | undefined = undefined,
> implements ITaskBuilder {
  ctxPotConstructor: (Constructor<P1>) | undefined;

  task: ITask = {
    name: "",
    attempts: 1,
    // РЕШЕНО: вот с этим параметром есть проблема. Для обычных тасок слоты выделяются нормально, а для  workflow - беда.
    slotsCount: 0,
    do: async ({ fail }: DoHandlerArgs<P1>) => {
      return fail("not implemented");
    },
    triggers: {},
    ofWorkflow: undefined,
  };

  constructor(
    count: number,
  ) {
    this.task.slotsCount = count;
  }

  workflow(builder: IWorkflowBuilder) {
    this.task.ofWorkflow = builder.workflow.name;
    return this;
  }

  name(name: string | TemplateStringsArray) {
    const workflowPrefix = this.task.ofWorkflow
      ? `[${this.task.ofWorkflow}] `
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
        test: ({ allow }: TestHandlerArgs<IPot>) => {
          return allow();
        },
        ofWorkflow: this.task.ofWorkflow,
      });
    }

    return this;
  }

  /**
   * Adds a trigger event handler for the specified potential constructor to the task.
   *
   * @param potConstructor The constructor of the potential to listen for trigger events.
   * @param handler (Optional) A function that handles the trigger event and takes an argument of type TestHandlerArgs<P1>.
   *                This function should return a TestHandlerResult.
   * @returns Returns the current object or class (the task) to enable method chaining.
   */
  on<TP extends Exclude<P1, undefined>>(
    potConstructor: Constructor<TP>,
    test?: (
      args: PC extends undefined ? TestHandlerArgs<TP>
        : TestHandlerArgs<PC, TP>,
    ) => TestHandlerResult,
    slot?: number,
  ): this {
    if (
      !this.task
        .triggers[potConstructor.name]
    ) {
      this.task
        .triggers[potConstructor.name] = [];
    }

    // console.log(
    //   `${this.task.name} | ${this.task.ofWorkflow} | ${potConstructor.name}`,
    // );

    if (test) {
      this.task.triggers[potConstructor.name].push({
        taskName: this.task.name,
        potConstructor,
        slot: Object.keys(this.task.triggers).length - 1,
        test,
        ofWorkflow: this.task.ofWorkflow,
      });
    } else {
      this.task.triggers[potConstructor.name].push({
        taskName: this.task.name,
        potConstructor,
        slot: slot || Object.keys(this.task.triggers).length - 1,
        test: ({ allow }: TestHandlerArgs<TP>) => {
          return allow();
        },
        ofWorkflow: this.task.ofWorkflow,
      });
    }

    return this;
  }

  onRule<TP extends Exclude<P1, undefined>>(
    rule: "ForThisTask" | "ForAnyTask" | "ForUnknown",
    potConstructor: Constructor<TP>,
    slot?: number,
  ) {
    let test;

    if (
      !this.task
        .triggers[potConstructor.name]
    ) {
      this.task
        .triggers[potConstructor.name] = [];
    }

    if (rule === "ForThisTask") {
      test = ({ allow, deny, ctx }: TestHandlerArgs<TP>) => {
        return ctx.to.task === this.task.name ? allow() : deny();
      };
    } else if (rule == "ForAnyTask") {
      test = ({ allow, deny, ctx }: TestHandlerArgs<TP>) => {
        return ctx.to.task !== this.task.name && ctx.to.task !== "unknown"
          ? allow()
          : deny();
      };
    } else if (rule == "ForUnknown") {
      test = ({ allow, deny, ctx }: TestHandlerArgs<TP>) => {
        return ctx.to.task === "unknown" ? allow() : deny();
      };
    } else {
      test = ({ deny }: TestHandlerArgs<TP>) => {
        return deny();
      };
    }

    this.task.triggers[potConstructor.name].push({
      taskName: this.task.name,
      potConstructor,
      slot: slot || this.task.triggers[potConstructor.name].length,
      test: test,
      ofWorkflow: this.task.ofWorkflow,
    });

    return this;
  }

  /**
   * Sets the "do" handler function for the task.
   *
   * @param handler A function that handles the "do" operation and takes an argument of type DoHandlerArgs<P1, P2, P3, P4>.
   *               This function should return a Promise containing the result of the "do" operation, of type DoHandlerResult.
   * @returns Returns the current object or class (the task) to enable method chaining.
   */
  do(
    handler: (args: DoHandlerArgs<P1>) => Promise<DoHandlerResult>,
  ) {
    this.task.do = handler;
    return this;
  }

  /**
   * Attaches an error handler to the Task
   *
   * @param handler A function that handles errors and takes one argument - an error object (Error).
   * @returns {ITaskBuilder} this
   */
  error(handler: (error: Error) => void) {
    return this;
  }

  /**
   * Returns the built task object.
   *
   * @returns The built task object of type ITask.
   */
  build(): ITask {
    return this.task;
  }
}

export const task = <ContextPot extends IPot>() =>
  new TaskBuilder<ContextPot>(
    1,
  );
