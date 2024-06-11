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
import { Constructor } from "$helpers/types";
import { TaskNameMissingError } from "$core/errors";
import {
  DoHandlerContext,
  DoHandlerResult,
  IPot,
  ITask,
  ITaskBuilder,
  IWorkflowBuilder,
  TriggerHandlerContext,
  TriggerHandlerResult,
} from "$core/types";

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
    do: async ({ fail }: DoHandlerContext<P1>) => {
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
    this.task.slotsCount =
      Array.from(arguments).filter((arg) => arg !== undefined).length;
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
        handler: (
          { allow }: TriggerHandlerContext<P1, IPot, IPot, IPot, IPot>,
        ) => {
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
      args: TriggerHandlerContext<P1>,
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
        handler: (
          { allow }: TriggerHandlerContext<TP>,
        ) => {
          return allow();
        },
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  onRule<TP extends Exclude<P1 | P2 | P3 | P4, undefined>>(
    rule: "ForThisTask" | "ForAnyTask" | "ForUnknown",
    potConstructor: Constructor<TP>,
    slot?: number,
  ) {
    let handler;

    if (
      !this.task
        .triggers[potConstructor.name]
    ) {
      this.task
        .triggers[potConstructor.name] = [];
    }

    if (rule === "ForThisTask") {
      handler = (
        { allow, deny, pots }: TriggerHandlerContext<
          TP
        >,
      ) => {
        return pots[0].to.task === this.task.name ? allow() : deny();
      };
    } else if (rule == "ForAnyTask") {
      handler = (
        { allow, deny, pots }: TriggerHandlerContext<
          TP
        >,
      ) => {
        return pots[0].to.task !== this.task.name &&
            pots[0].to.task !== "unknown"
          ? allow()
          : deny();
      };
    } else if (rule == "ForUnknown") {
      handler = (
        { allow, deny, pots }: TriggerHandlerContext<
          TP,
          IPot,
          IPot,
          IPot,
          IPot
        >,
      ) => {
        return pots[0].to.task === "unknown" ? allow() : deny();
      };
    } else {
      handler = (
        { deny }: TriggerHandlerContext<TP>,
      ) => {
        return deny();
      };
    }

    this.task.triggers[potConstructor.name].push({
      taskName: this.task.name,
      potConstructor,
      slot: slot || this.task.triggers[potConstructor.name].length,
      handler,
      belongsToWorkflow: this.task.belongsToWorkflow,
    });

    return this;
  }

  do(
    handler: (
      args: DoHandlerContext<P1, P2, P3, P4, P5>,
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
) => new TaskBuilder<P1, IPot, IPot, IPot, IPot>(p1);
