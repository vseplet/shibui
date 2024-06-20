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
import { TaskNameMissingError, TaskTriggersMissingError } from "$core/errors";
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

  private createTrigger<TP extends Pots[number]>(
    pot: Constructor<TP>,
    handler?: TTaskTriggerHandler<Spicy, CTX, TP>,
    slot?: number,
  ) {
    return {
      taskName: this.task.name,
      potConstructor: pot,
      slot: slot || Object.keys(this.task.triggers).length - 1,
      handler: handler || (({ allow }) => allow()),
      belongsToWorkflow: this.task.belongsToWorkflow,
    };
  }

  private createRuleHandler<TP extends Pots[number]>(
    rule: "ForThisTask" | "ForAnyTask" | "ForUnknown",
    potConstructor: Constructor<TP>,
  ) {
    switch (rule) {
      case "ForThisTask":
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) ===
              this.task.name
            ? args.allow()
            : args.deny();
      case "ForAnyTask":
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) !== "unknown"
            ? args.allow()
            : args.deny();
      case "ForUnknown":
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) === "unknown"
            ? args.allow()
            : args.deny();
      default:
        return ({ deny }: TOnHandlerContext<Spicy, CTX, TP>) => deny();
    }
  }

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
    this.task.name = workflowPrefix + (name instanceof Array ? name[0] : name);

    for (const potName in this.task.triggers) {
      this.task.triggers[potName].forEach((
        trigger,
      ) => (trigger.taskName = this.task.name));
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

  triggers(..._constructors: Pots) {
    for (const constructor of arguments) {
      if (!this.task.triggers[constructor.name]) {
        this.task.triggers[constructor.name] = [];
      }

      this.task.triggers[constructor.name].push(
        this.createTrigger(constructor),
      );
    }

    return this;
  }

  on<TP extends Pots[number]>(
    pot: Constructor<TP>,
    handler?: TTaskTriggerHandler<Spicy, CTX, TP>,
    slot?: number,
  ) {
    if (!this.task.triggers[pot.name]) this.task.triggers[pot.name] = [];
    this.task.triggers[pot.name].push(this.createTrigger(pot, handler, slot));
    return this;
  }

  onRule<TP extends Pots[number]>(
    rule: "ForThisTask" | "ForAnyTask" | "ForUnknown",
    potConstructor: Constructor<TP>,
    slot?: number,
  ) {
    const handler = this.createRuleHandler(rule, potConstructor);
    if (!this.task.triggers[potConstructor.name]) {
      this.task.triggers[potConstructor.name] = [];
    }

    this.task.triggers[potConstructor.name].push(
      this.createTrigger(potConstructor, handler, slot),
    );
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
      throw new TaskTriggersMissingError();
    }

    return this.task;
  }
}
