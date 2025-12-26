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

import type { Pot } from "$shibui/entities";
import { TaskNameMissingError } from "$shibui/errors";
import type { Constructor } from "$helpers/types";
import type {
  TOnHandlerContext,
  TPotsConstructorsList,
  TSpicy,
  TTask,
  TTaskDoHandler,
  TTaskTriggerHandler,
  TWhenPredicate,
  TWorkflowBuilder,
} from "$shibui/types";
import { TriggerRule, UNKNOWN_TARGET } from "$shibui/types";
import { CoreStartPot } from "$shibui/pots";
import type { PotFactory } from "../pot.ts";

// Helper to check if input is PotFactory
// deno-lint-ignore no-explicit-any
function isPotFactory(input: any): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

// Get constructor from either PotFactory or Constructor
// deno-lint-ignore no-explicit-any
function getConstructor<T extends Pot<any>>(
  input: Constructor<T> | PotFactory<T["data"]>,
): Constructor<T> {
  if (isPotFactory(input)) {
    // deno-lint-ignore no-explicit-any
    return input._class as any;
  }
  return input;
}

export class TaskBuilder<
  Spicy extends TSpicy,
  Pots extends Pot[],
  CTX extends Pot | undefined = undefined,
> {
  private potsConstructors: TPotsConstructorsList = [];

  task: TTask = {
    name: UNKNOWN_TARGET,
    attempts: 1,
    timeout: 0,
    interval: 0,
    slotsCount: 0,
    belongsToWorkflow: undefined,
    triggers: {},
    do: () => {
      throw new Error("not implemented");
    },
    fail: async () => {},
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
    rule: TriggerRule,
    _potConstructor: Constructor<TP>,
  ) {
    switch (rule) {
      case TriggerRule.ForThisTask:
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) ===
              this.task.name
            ? args.allow()
            : args.deny();
      case TriggerRule.ForAnyTask:
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) !==
              UNKNOWN_TARGET
            ? args.allow()
            : args.deny();
      case TriggerRule.ForUnknown:
        return (args: TOnHandlerContext<Spicy, CTX, TP>) =>
          ("ctx" in args ? args.ctx.to.task : args.pot.to.task) ===
              UNKNOWN_TARGET
            ? args.allow()
            : args.deny();
      default:
        return ({ deny }: TOnHandlerContext<Spicy, CTX, TP>) => deny();
    }
  }

  constructor(
    ..._constructors: { [K in keyof Pots]: Constructor<Pots[K]> | null }
  ) {
    if (arguments.length > 5) throw new Error("over 5 pots!");
    this.potsConstructors = arguments as unknown as TPotsConstructorsList;

    this.task.slotsCount =
      Array.from(arguments).filter((arg) => arg !== undefined).length;
  }

  belongsToWorkflow(builder: TWorkflowBuilder): this {
    this.task.belongsToWorkflow = builder.workflow.name;
    return this;
  }

  name(name: string | TemplateStringsArray): this {
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

  attempts(count: number): this {
    this.task.attempts = count;
    return this;
  }

  interval(ms: number): this {
    this.task.interval = ms;
    return this;
  }

  timeout(ms: number): this {
    this.task.timeout = ms;
    return this;
  }

  triggers(..._constructors: Pots): this {
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
    potSource: Constructor<TP> | PotFactory<TP["data"]>,
    handler?: TTaskTriggerHandler<Spicy, CTX, TP>,
    slot?: number,
  ): this {
    const pot = getConstructor(potSource);
    if (!this.task.triggers[pot.name]) this.task.triggers[pot.name] = [];
    this.task.triggers[pot.name].push(this.createTrigger(pot, handler, slot));
    return this;
  }

  onRule<TP extends Pots[number]>(
    rule: TriggerRule,
    potSource: Constructor<TP> | PotFactory<TP["data"]>,
    slot?: number,
  ): this {
    const potConstructor = getConstructor(potSource);
    const handler = this.createRuleHandler(rule, potConstructor);
    if (!this.task.triggers[potConstructor.name]) {
      this.task.triggers[potConstructor.name] = [];
    }

    this.task.triggers[potConstructor.name].push(
      this.createTrigger(potConstructor, handler, slot),
    );
    return this;
  }

  /**
   * Simple predicate-based trigger filter (v1.0 API)
   * @example
   * task(Counter)
   *   .when(data => data.value > 0.5)
   *   .do(...)
   */
  when<TP extends Pots[number] = Pots[0]>(
    predicate: TWhenPredicate<TP["data"]>,
    potConstructor?: Constructor<TP>,
    slot?: number,
  ): this {
    // If no pot constructor provided, use the first one from constructor args
    const targetPot = potConstructor || this.potsConstructors[0];
    if (!targetPot) {
      throw new Error("No pot constructor available for .when() - provide one as second argument");
    }

    const handler = (args: TOnHandlerContext<Spicy, CTX, TP>) => {
      const pot = "ctx" in args ? args.ctx : args.pot;
      return predicate(pot.data) ? args.allow() : args.deny();
    };

    if (!this.task.triggers[targetPot.name]) {
      this.task.triggers[targetPot.name] = [];
    }

    this.task.triggers[targetPot.name].push(
      this.createTrigger(targetPot as Constructor<TP>, handler, slot),
    );
    return this;
  }

  do(
    handler: TTaskDoHandler<Spicy, CTX, Pots>,
  ): this {
    this.task.do = handler;
    return this;
  }

  strategy(): this {
    return this;
  }

  fail(handler: (error: Error) => Promise<void>): this {
    this.task.fail = handler;
    return this;
  }

  /**
   * Alias for fail() - more familiar naming (v1.0 API)
   * @example
   * task("Name", Counter)
   *   .do(...)
   *   .catch(error => console.error(error))
   */
  catch(handler: (error: Error) => Promise<void>): this {
    return this.fail(handler);
  }

  /**
   * Configure retry behavior with a single object (v1.0 API)
   * @example
   * task("Name", Counter)
   *   .retry({ attempts: 3, interval: 1000, timeout: 5000 })
   *   .do(...)
   */
  retry(config: {
    attempts?: number;
    interval?: number;
    timeout?: number;
  }): this {
    if (config.attempts !== undefined) this.task.attempts = config.attempts;
    if (config.interval !== undefined) this.task.interval = config.interval;
    if (config.timeout !== undefined) this.task.timeout = config.timeout;
    return this;
  }

  build(): TTask {
    if (this.task.name == UNKNOWN_TARGET) {
      throw new TaskNameMissingError();
    }

    if (this.potsConstructors.length == 0) {
      this.on(CoreStartPot);
    } else if (Object.keys(this.task.triggers).length == 0) {
      for (const constructor of this.potsConstructors) {
        this.on(constructor);
      }
    }

    return this.task;
  }
}
