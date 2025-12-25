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

import { emitters } from "$shibui/emitters";
import {
  SourceType,
  type TCore,
  type TCoreOptions,
  type TLoggerOptions,
  type TPot,
  type TSpicy,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$shibui/types";
import { Distributor, EventDrivenLogger } from "$shibui/components";
import { type Pot, WorkflowBuilder } from "$shibui/entities";
import type { Constructor } from "$helpers/types";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import type { ContextPot } from "$shibui/pots";
import type { PotFactory, PotInstance } from "../pot.ts";

// Type helpers for task() to accept both PotFactory and Constructor
// deno-lint-ignore no-explicit-any
type PotInput = Constructor<Pot<any>> | PotFactory<any>;

// deno-lint-ignore no-explicit-any
type ToPot<S> = S extends Constructor<infer P extends Pot<any>> ? P
  // deno-lint-ignore no-explicit-any
  : S extends PotFactory<infer D> ? Pot<D & { [key: string]: any }>
  : never;

type ToPots<Sources extends PotInput[]> = {
  [K in keyof Sources]: ToPot<Sources[K]>;
};

// deno-lint-ignore no-explicit-any
function isPotFactory(input: PotInput): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

// deno-lint-ignore no-explicit-any
function toConstructor(input: PotInput): Constructor<Pot<any>> {
  if (isPotFactory(input)) {
    return input._class;
  }
  return input;
}

export class Core<S extends TSpicy> implements TCore<S> {
  emitters = emitters;

  #globalPotDistributor: Distributor;
  settings = {
    DEFAULT_LOGGING_ENABLED: true,
    DEFAULT_LOGGING_LEVEL: 0,
    ALLOWED_LOGGING_SOURCE_TYPES: [
      SourceType.Core,
      SourceType.Task,
      SourceType.Workflow,
      SourceType.Framework,
      SourceType.Unknown,
      SourceType.Plugin,
    ],
  };

  constructor(options: TCoreOptions) {
    this.#globalPotDistributor = new Distributor(options, this, options.spicy);
    if (options.logger?.enable === false) {
      this.settings.DEFAULT_LOGGING_ENABLED = false;
    }
  }

  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP> {
    return new WorkflowBuilder<S, CP>(contextPotConstructor);
  }

  task<Sources extends PotInput[]>(
    ...sources: Sources
  ): TaskBuilder<S, ToPots<Sources>> {
    const constructors = sources.map(toConstructor);
    // deno-lint-ignore no-explicit-any
    return new TaskBuilder<S, ToPots<Sources>>(...constructors as any);
  }

  createLogger = (options: TLoggerOptions): EventDrivenLogger => {
    return new EventDrivenLogger(
      emitters.logEventEmitter,
      this.settings,
      options,
    );
  };

  async start() {
    await this.#globalPotDistributor.start();
  }

  register(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.register(builder);
  }

  disable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.disable(builder);
  }

  enable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.enable(builder);
  }

  /**
   * Send a pot to the core for processing
   * @param potLike - PotFactory (auto-creates), PotInstance, or TPot
   * @param builder - Optional task to route the pot to
   */
  // deno-lint-ignore no-explicit-any
  send(potLike: TPot | PotInstance<any> | PotFactory<any>, builder?: TTaskBuilder) {
    // Auto-create if PotFactory
    const pot = (typeof potLike === "object" && "create" in potLike && "_class" in potLike)
      ? potLike.create() as unknown as TPot
      : potLike as TPot;

    if (builder) pot.to.task = builder.task.name;
    this.#globalPotDistributor.send(pot);
  }

  close(): void {
    this.#globalPotDistributor.close();
  }
}
