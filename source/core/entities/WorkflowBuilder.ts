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
  IWorkflowBuilderSetupArgs,
  TPot,
  TSpicy,
  TTaskBuilder,
  TWorkflow,
  TWorkflowBuilder,
  TWorkflowTriggerHandler,
} from "$core/types";
import { TaskBuilder } from "$core/entities";

export class WorkflowBuilder<ContextPot extends TPot, S extends TSpicy>
  implements TWorkflowBuilder {
  contextPotConstructor: Constructor<ContextPot>;

  workflow: TWorkflow = {
    name: "unknown",
    triggers: {},
    firstTaskName: "unknown",
    tasks: [],
  };

  taskBuilders: Array<
    TTaskBuilder
  > = [];

  constructor(contextPotConstructor: Constructor<ContextPot>) {
    this.contextPotConstructor = contextPotConstructor;
  }

  name(name: string | TemplateStringsArray) {
    if (name instanceof Array) {
      this.workflow.name = name[0];
    } else {
      this.workflow.name = name;
    }

    return this;
  }

  triggers(
    ...constructorList: Array<
      Constructor<TPot>
    >
  ) {
    for (const constructor of constructorList) {
      this.workflow.triggers[constructor.name] = {
        workflowName: this.workflow.name,
        potConstructor: constructor,
        handler: () => {
          return new this.contextPotConstructor();
        },
      };
    }

    return this;
  }

  on<T extends TPot>(
    potConstructor: Constructor<T>,
    handler?: TWorkflowTriggerHandler<ContextPot, T, S>,
  ) {
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
          return new this.contextPotConstructor();
        },
      };
    }

    return this;
  }

  // #task() {
  //   const builder = task1(this.contextPotConstructor);
  //   builder.belongsToWorkflow(this);

  //   builder.on(
  //     this.contextPotConstructor as Constructor<Exclude<ContextPot, undefined>>,
  //     ({ pots, allow, deny }) =>
  //       pots[0].to.task === builder.task.name ? allow() : deny(),
  //   );

  //   this.taskBuilders.push(builder);
  //   return builder;
  // }

  #task1(
    builder: TaskBuilder<S, ContextPot, TPot, TPot, TPot, TPot>,
  ): TaskBuilder<S, ContextPot, TPot, TPot, TPot, TPot> {
    builder.belongsToWorkflow(this);

    const length = builder.task.triggers[this.contextPotConstructor.name]
      ?.length;

    if (!length || length == 0) {
      builder.on(
        this.contextPotConstructor as Constructor<
          Exclude<ContextPot, undefined>
        >,
        ({ pots, allow, deny }) =>
          pots[0].to.task === builder.task.name ? allow() : deny(),
      );
    }

    this.taskBuilders.push(builder);
    return builder;
  }

  sq(
    fun: (
      args: IWorkflowBuilderSetupArgs<ContextPot, S>,
    ) => TaskBuilder<S, ContextPot, TPot, TPot, TPot, TPot>,
  ) {
    const initArgs = {
      task1: (): TaskBuilder<
        S,
        ContextPot,
        TPot,
        TPot,
        TPot,
        TPot
      > => {
        const builder = new TaskBuilder<
          S,
          ContextPot,
          TPot,
          TPot,
          TPot,
          TPot
        >(this.contextPotConstructor);
        return this.#task1(builder);
      },
      shared1: (
        builder: TaskBuilder<
          TSpicy,
          ContextPot,
          TPot,
          TPot,
          TPot,
          TPot
        >,
      ) => this.#task1(builder), // TODO: сделать тип task'и универсальным
      // task2: <TriggerPot extends IPot>() => this.#task2<TriggerPot>(),
      // task3: <
      //   TriggerPot2 extends IPot,
      //   TriggerPot3 extends IPot,
      // >() => this.#task3<TriggerPot2, TriggerPot3>(),
      // task4: <
      //   TriggerPot2 extends IPot,
      //   TriggerPot3 extends IPot,
      //   TriggerPot4 extends IPot,
      // >() => this.#task4<TriggerPot2, TriggerPot3, TriggerPot4>(),
    };

    this.workflow.firstTaskName = fun(initArgs).task.name;
    return this;
  }

  build(): TWorkflow {
    this.taskBuilders.forEach((builder) => {
      this.workflow.tasks.push(builder.build());
    });
    return this.workflow;
  }
}
