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
import type {
  TSpicy,
  TTaskBuilder,
  TWorkflow,
  TWorkflowBuilder,
} from "$shibui/types";
import { UNKNOWN_TARGET } from "$shibui/types";
import { type Pot, TaskBuilder } from "$shibui/entities";
import { CoreStartPot } from "$shibui/pots";
import type { PotFactory } from "../pot.ts";

// Helper to check if input is PotFactory
// deno-lint-ignore no-explicit-any
function isPotFactory(input: any): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

// Get constructor from either PotFactory or Constructor
function getConstructor(
  input: Constructor<Pot> | PotFactory<object>,
): Constructor<Pot> {
  if (isPotFactory(input)) {
    // deno-lint-ignore no-explicit-any
    return input._class as any;
  }
  return input;
}

export class WorkflowBuilder<Spicy extends TSpicy, CPot extends Pot>
  implements TWorkflowBuilder {
  private ctxPotConstructor: Constructor<CPot>;
  private taskBuilders: Array<
    TTaskBuilder
  > = [];

  workflow: TWorkflow = {
    name: UNKNOWN_TARGET,
    firstTaskName: "",
    triggers: {},
    tasks: [],
  };

  constructor(
    ctxPotSource: Constructor<CPot> | PotFactory<object>,
  ) {
    // Accept either Constructor or PotFactory
    this.ctxPotConstructor =
      (isPotFactory(ctxPotSource)
        ? ctxPotSource._class
        : ctxPotSource) as Constructor<CPot>;
  }

  private addTrigger(
    potConstructor: Constructor<Pot>,
    handler?: (pot: Pot) => void,
  ) {
    this.workflow.triggers[potConstructor.name] = {
      workflowName: this.workflow.name,
      potConstructor,
      handler: handler || (() => new this.ctxPotConstructor()),
    };
  }

  on(
    potSource: Constructor<Pot> | PotFactory<object>,
    handler?: (pot: Pot) => CPot | null,
  ): this {
    this.addTrigger(getConstructor(potSource), handler);
    return this;
  }

  name(name: string | TemplateStringsArray): this {
    this.workflow.name = name instanceof Array ? name[0] : name;
    return this;
  }

  triggers(...sourceList: Array<Constructor<Pot> | PotFactory<object>>): this {
    sourceList.forEach((source) => this.addTrigger(getConstructor(source)));
    return this;
  }

  sq(
    sequence: (args: {
      task: <Pots extends Pot[]>(
        ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
      ) => TaskBuilder<Spicy, [CPot, ...Pots], CPot>;
      shared: (
        builder: TaskBuilder<Spicy, [CPot], CPot>,
      ) => TaskBuilder<Spicy, [CPot], CPot>;
    }) => TTaskBuilder,
  ): this {
    const createBuilder = <Pots extends Pot[]>(
      ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
    ) => {
      const builder = new TaskBuilder<Spicy, [CPot, ...Pots], CPot>(
        this.ctxPotConstructor,
        ...potConstructors,
      );

      builder.belongsToWorkflow(this);
      const length = builder.task.triggers[this.ctxPotConstructor.name]?.length;
      if (!length || length === 0) {
        builder.on(
          this.ctxPotConstructor,
          ({ ctx, allow, deny }) =>
            ctx.to.task === builder.task.name ? allow() : deny(),
        );
      }
      this.taskBuilders.push(builder);
      return builder;
    };

    this.workflow.firstTaskName = sequence({
      task: createBuilder,
      shared: (builder) => {
        builder.belongsToWorkflow(this);
        const length = builder.task.triggers[this.ctxPotConstructor.name]
          ?.length;
        if (!length || length === 0) {
          builder.on(
            this.ctxPotConstructor,
            ({ ctx, allow, deny }) =>
              ctx.to.task === builder.task.name ? allow() : deny(),
          );
        }
        this.taskBuilders.push(builder);
        return builder;
      },
    }).task.name;

    return this;
  }

  build(): TWorkflow {
    if (Object.keys(this.workflow.triggers).length == 0) {
      this.on(CoreStartPot, (_pot) => new this.ctxPotConstructor());
    }

    this.taskBuilders.forEach((builder) => {
      this.workflow.tasks.push(builder.build());
    });

    return this.workflow;
  }
}
