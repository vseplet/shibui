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

import { emitters } from "$core/emitters";
import {
  SourceType,
  type TCore,
  type TCoreOptions,
  type TLoggerOptions,
  type TNewTaskBuilder,
  type TNewWorkflowBuilder,
  type TPot,
  type TSpicy,
} from "$core/types";
import { Distributor, EventDrivenLogger } from "$core/components";
import { Pot, WorkflowBuilder } from "$core/entities";
import type { Constructor } from "$helpers/types";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import type { ContextPot } from "$core/pots";

export class Core<S extends TSpicy> implements TCore<S> {
  emitters = emitters;

  #globalPotDistributor: Distributor<S>;
  settings = {
    DEFAULT_LOGGING_ENABLED: true,
    DEFAULT_LOGGING_LEVEL: 0,
    ALLOWED_LOGGING_SOURCE_TYPES: [
      SourceType.CORE,
      SourceType.TASK,
      SourceType.WORKFLOW,
      SourceType.FRAMEWORK,
      SourceType.UNKNOWN,
      SourceType.PLUGIN,
    ],
  };

  constructor(config: TCoreOptions<S>) {
    this.#globalPotDistributor = new Distributor<S>(this);
  }

  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP> {
    return new WorkflowBuilder<S, CP>(contextPotConstructor);
  }

  task<Pots extends Pot[]>(
    ...constructors: { [K in keyof Pots]: Constructor<Pots[K]> }
  ) {
    return new TaskBuilder<S, Pots>(...constructors);
  }

  createLogger = (options: TLoggerOptions) => {
    return new EventDrivenLogger(
      emitters.logEventEmitter,
      this.settings,
      options,
    );
  };

  async start() {
    await this.#globalPotDistributor.start();
  }

  // stop() {
  //   this.#globalPotDistributor.stop();
  //   this.emitters.coreEventEmitter.close();
  //   this.emitters.logEventEmitter.close();
  // }

  register(builder: TNewTaskBuilder | TNewWorkflowBuilder) {
    this.#globalPotDistributor.register(builder);
  }

  disable(builder: TNewTaskBuilder | TNewWorkflowBuilder) {
    this.#globalPotDistributor.disable(builder);
  }

  enable(builder: TNewTaskBuilder | TNewWorkflowBuilder) {
    this.#globalPotDistributor.enable(builder);
  }

  send(pot: TPot, builder?: TNewTaskBuilder) {
    if (builder) pot.to.task = builder.task.name;
    this.#globalPotDistributor.send(pot);
  }
}
