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
  TPot,
  TSpicy,
  TTaskBuilder,
  TWorkflow,
  TWorkflowBuilder,
} from "$core/types";
import { type Pot, TaskBuilder } from "$core/entities";

export class WorkflowBuilder<Spicy extends TSpicy, CPot extends Pot>
  implements TWorkflowBuilder {
  ctxPotConstructor: Constructor<CPot>;
  workflow: TWorkflow = {
    name: "unknown",
    firstTaskName: "",
    triggers: {},
    tasks: [],
  };

  taskBuilders: Array<
    TTaskBuilder
  > = [];

  constructor(
    ctxPotConstructor: Constructor<CPot>,
  ) {
    this.ctxPotConstructor = ctxPotConstructor;
  }

  on(potConstructor: Constructor<Pot>, handler?: (pot: TPot) => void) {
    if (handler) {
      this.workflow.triggers[potConstructor.name] = {
        workflowName: this.workflow.name,
        potConstructor,
        handler,
      };
    } else {
      this.workflow.triggers[potConstructor.name] = {
        workflowName: this.workflow.name,
        potConstructor,
        handler: () => {
          return new this.ctxPotConstructor();
        },
      };
    }

    return this;
  }

  name(name: string | TemplateStringsArray) {
    if (name instanceof Array) {
      this.workflow.name = name[0];
    } else {
      this.workflow.name = name;
    }

    return this;
  }

  // triggers(
  //   ...constructorList: Array<
  //     Constructor<TPot>
  //   >
  // ) {
  //   for (const constructor of constructorList) {
  //     this.workflow.triggers[constructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor: constructor,
  //       handler: () => {
  //         return new this.contextPotConstructor();
  //       },
  //     };
  //   }

  //   return this;
  // }

  sq(
    _cb: (args: {
      task: <Pots extends Pot[]>(
        ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
      ) => TaskBuilder<Spicy, [CPot, ...Pots], CPot>;
      shared: (
        builder: TaskBuilder<any, any, any>,
      ) => TaskBuilder<Spicy, [], CPot>;
    }) => TTaskBuilder,
  ) {
    this.workflow.firstTaskName = _cb({
      task: <Pots extends Pot[]>(
        ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
      ) => {
        const builder = new TaskBuilder<Spicy, [CPot, ...Pots], CPot>(
          this.ctxPotConstructor,
          ...potConstructors,
        ).belongsToWorkflow(this);

        const length = builder.task.triggers[this.ctxPotConstructor.name]
          ?.length;

        if (!length || length == 0) {
          builder.on(
            this.ctxPotConstructor,
            ({ ctx, allow, deny }) =>
              ctx.to.task === builder.task.name ? allow() : deny(),
          );
        }

        this.taskBuilders.push(builder);

        return builder;
      },

      shared: (builder) => {
        builder.belongsToWorkflow(this);

        const length = builder.task.triggers[this.ctxPotConstructor.name]
          ?.length;

        if (!length || length == 0) {
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

  build() {
    this.taskBuilders.forEach((builder) => {
      this.workflow.tasks.push(builder.build());
    });

    return this.workflow;
  }
}
