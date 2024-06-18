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

import type { Pot } from "$core/entities";
import { TaskNameMissingError } from "$core/errors";
import type { Constructor } from "$helpers/types";
import type {
  TOnHandlerContext,
  TSpicy,
  TTask,
  TTaskDoHandler,
  TTaskTriggerHandler,
  TWorkflowBuilder,
} from "$core/types";

export class TaskBuilder<
  Spicy extends TSpicy,
  Pots extends Pot[],
  CTX extends Pot | undefined = undefined,
> {
  task: TTask = {
    name: "unknown",
    attempts: 1,
    timeout: 0,
    slotsCount: 0,
    belongsToWorkflow: undefined,
    triggers: {},
    do: async () => {
      throw new Error("not implemented");
    },
  };

  constructor(
    ..._constructors: { [K in keyof Pots]: Constructor<Pots[K]> }
  ) {
    if (arguments.length > 5) throw new Error("over 5 pots!");
    this.task.slotsCount =
      Array.from(arguments).filter((arg) => arg !== undefined).length;
  }

  belongsToWorkflow(builder: TWorkflowBuilder) {
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
    ..._constructors: Pots
  ) {
    for (const constructor of arguments) {
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
        handler: ({ allow }) => allow(),
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  on<TP extends Pots[number]>(
    pot: Constructor<TP>,
    handler?: TTaskTriggerHandler<Spicy, CTX, TP>,
    slot?: number,
  ) {
    if (
      !this.task
        .triggers[pot.name]
    ) {
      this.task
        .triggers[pot.name] = [];
    }

    if (handler) {
      this.task.triggers[pot.name].push({
        taskName: this.task.name,
        potConstructor: pot,
        slot: Object.keys(this.task.triggers).length - 1,
        handler,
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    } else {
      this.task.triggers[pot.name].push({
        taskName: this.task.name,
        potConstructor: pot,
        slot: slot || Object.keys(this.task.triggers).length - 1,
        handler: ({ allow }) => allow(),
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  onRule<TP extends Pots[number]>(
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
      handler = (args: TOnHandlerContext<Spicy, CTX, TP>) => {
        if ("ctx" in args) {
          return args.ctx.to.task === this.task.name
            ? args.allow()
            : args.deny();
        } else {
          return args.pot.to.task === this.task.name
            ? args.allow()
            : args.deny();
        }
      };
    } else if (rule == "ForAnyTask") {
      handler = (
        args: TOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        if ("ctx" in args) {
          return args.ctx.to.task !== "unknown" ? args.allow() : args.deny();
        } else {
          return args.pot.to.task !== "unknown" ? args.allow() : args.deny();
        }
      };
    } else if (rule == "ForUnknown") {
      handler = (
        args: TOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        if ("ctx" in args) {
          return args.ctx.to.task === "unknown" ? args.allow() : args.deny();
        } else {
          return args.pot.to.task === "unknown" ? args.allow() : args.deny();
        }
      };
    } else {
      handler = (
        { deny }: TOnHandlerContext<Spicy, CTX, TP>,
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
    handler: TTaskDoHandler<Spicy, CTX, Pots>,
  ) {
    this.task.do = handler;
    return this;
  }

  strategy() {
    return this;
  }

  onFail(_handler: (error: Error) => void) {
    return this;
  }

  build(): TTask {
    if (this.task.name == "unknown") {
      throw new TaskNameMissingError();
    }

    if (Object.keys(this.task.triggers).length == 0) {
      throw new Error();
    }

    return this.task;
  }
}
