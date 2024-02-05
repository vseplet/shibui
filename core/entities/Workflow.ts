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

import { Constructor } from "../../helpers/types.ts";
import { EventDrivenLogger } from "../components/EventDrivenLogger.ts";
import { IPot } from "./Pot.ts";
import { ITask, ITaskBuilder, TaskBuilder } from "./Task.ts";

type WorkflowTriggerHandler<
  ContextPot extends IPot,
  TriggerPot extends IPot,
> = (args: { pot: TriggerPot; log: EventDrivenLogger }) => ContextPot | null;

interface IWorkflowBuilderSetupArgs<ContextPot extends IPot> {
  task: () => TaskBuilder<
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

export class WorkflowBuilder<ContextPot extends IPot>
  implements IWorkflowBuilder {
  contextPotConstructor: Constructor<ContextPot>;

  workflow: IWorkflow = {
    name: "unknown",
    triggers: {},
    firstTaskName: "unknown",
    tasks: [],
  };

  taskBuilders: Array<
    ITaskBuilder
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
      Constructor<IPot>
    >
  ) {
    for (const constructor of constructorList) {
      this.workflow.triggers[constructor.name] = {
        workflowName: this.workflow.name,
        potConstructor: constructor,
        test: () => {
          return new this.contextPotConstructor();
        },
      };
    }

    return this;
  }

  on<T extends IPot>(
    potConstructor: Constructor<T>,
    handler?: WorkflowTriggerHandler<ContextPot, T>,
  ) {
    if (handler) {
      this.workflow.triggers[potConstructor.name] = {
        workflowName: this.workflow.name,
        potConstructor,
        test: handler,
      };
    } else {
      this.workflow.triggers[potConstructor.name] = {
        workflowName: this.workflow.name,
        potConstructor,
        test: () => {
          return new this.contextPotConstructor();
        },
      };
    }

    return this;
  }

  #task() {
    const builder = new TaskBuilder<
      ContextPot,
      ContextPot
    >(1);
    builder.workflow(this);

    builder.on(
      this.contextPotConstructor as Constructor<Exclude<ContextPot, undefined>>,
      ({ ctx, allow, deny }) =>
        ctx.to.task === builder.task.name ? allow() : deny(),
    );

    this.taskBuilders.push(builder);
    return builder;
  }

  init(
    fun: (
      args: IWorkflowBuilderSetupArgs<ContextPot>,
    ) => ITaskBuilder,
  ) {
    const initArgs = {
      task: () => this.#task(),
    };

    this.workflow.firstTaskName = fun(initArgs).task.name;
    return this;
  }

  build(): IWorkflow {
    this.taskBuilders.forEach((builder) => {
      this.workflow.tasks.push(builder.build());
    });
    return this.workflow;
  }
}

export const workflow = <ContextPot extends IPot>(
  contextPotConstructor: Constructor<ContextPot>,
) => new WorkflowBuilder<ContextPot>(contextPotConstructor);
