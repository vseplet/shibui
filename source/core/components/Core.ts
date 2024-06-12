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
  type ICore,
  type ICoreOptions,
  type ILoggerOptions,
  type IPot,
  type ITaskBuilder,
  type IWorkflowBuilder,
  SourceType,
} from "$core/types";
import { Distributor, EventDrivenLogger } from "$core/components";
import { TaskBuilder, WorkflowBuilder } from "$core/entities";
import type { Constructor } from "$helpers/types";

export class Core<S> implements ICore<S> {
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

  constructor(config: ICoreOptions<S>) {
    this.#globalPotDistributor = new Distributor<S>(this);
  }

  workflow<ContextPot extends IPot>(
    contextPotConstructor: Constructor<ContextPot>,
  ): WorkflowBuilder<ContextPot, S> {
    return new WorkflowBuilder<ContextPot, S>(contextPotConstructor);
  }

  task<
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
  ) {
    return new TaskBuilder<P1, P2, P3, P4, P5, S>(
      p1,
      p2,
      p3,
      p4,
      p5,
    );
  }

  createLogger = (options: ILoggerOptions) => {
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

  register(builder: ITaskBuilder | IWorkflowBuilder) {
    this.#globalPotDistributor.register(builder);
  }

  disable = (builder: ITaskBuilder | IWorkflowBuilder) => {
    this.#globalPotDistributor.disable(builder);
  };

  enable = (builder: ITaskBuilder | IWorkflowBuilder) => {
    this.#globalPotDistributor.enable(builder);
  };

  send = (pot: IPot, builder?: ITaskBuilder) => {
    if (builder) pot.to.task = builder.task.name;
    this.#globalPotDistributor.send(pot);
  };
}
