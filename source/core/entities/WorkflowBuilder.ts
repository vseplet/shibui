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
} from "$core/types";
import type { Pot, TaskBuilder } from "$core/entities";

export class WorkflowBuilder<Spicy extends TSpicy, CPot extends Pot>
  implements TWorkflowBuilder {
  workflow: TWorkflow = {
    name: "unknown",
    firstTaskName: "",
    triggers: {},
    tasks: [],
  };

  constructor(
    public ctxPotConstructor: Constructor<CPot>,
  ) {
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

  // on<T extends TPot>(
  //   potConstructor: Constructor<T>,
  //   handler?: TWorkflowTriggerHandler<ContextPot, T, S>,
  // ) {
  //   if (handler) {
  //     this.workflow.triggers[potConstructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor,
  //       handler,
  //     };
  //   } else {
  //     this.workflow.triggers[potConstructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor,
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
    }) => TTaskBuilder,
  ) {
    this.workflow.firstTaskName = _cb({} as any).task.name;
    return this;
  }

  build() {
    return this.workflow;
  }
}
