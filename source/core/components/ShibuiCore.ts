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

import { workflow } from "../entities/WorkflowBuilder.ts";
import { task } from "../entities/TaskBuilder.ts";
import { emitters } from "../emitters.ts";
import { syncPromiseWithTimeout } from "../../helpers/syncPromiseWithTimeout.ts";
import {
  type ILoggerOptions,
  type IPot,
  type IShibuiCore,
  type ITaskBuilder,
  type IWorkflowBuilder,
  SourceType,
} from "../types.ts";
import Distributor from "./Distributor.ts";
import { EventDrivenLogger } from "./EventDrivenLogger.ts";

export class ShibuiCore implements IShibuiCore {
  workflow = workflow;
  task = task;
  emitters = emitters;

  #globalPotDistributor: Distributor;
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

  constructor() {
    this.#globalPotDistributor = new Distributor(this);
  }

  createLogger = (options: ILoggerOptions) => {
    return new EventDrivenLogger(this.settings, options);
  };

  async execute(
    builder: ITaskBuilder | IWorkflowBuilder,
    pots?: Array<IPot>,
  ): Promise<IPot> {
    const distributor = new Distributor(this);
    distributor.register(builder);

    if (pots) {
      pots.forEach((pot) => {
        distributor.send(pot);
      });
    }

    distributor.start();

    return {} as IPot;
  }

  executeSync(
    builder: ITaskBuilder | IWorkflowBuilder,
    pots?: Array<IPot>,
  ): IPot {
    return syncPromiseWithTimeout<IPot>(() => this.execute(builder, pots));
  }

  async init() {
    await this.#globalPotDistributor.init();
  }

  async start() {
    await this.#globalPotDistributor.start();
  }

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
