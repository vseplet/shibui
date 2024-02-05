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

// deno-lint-ignore-file
import { syncPromiseWithTimeout } from "../helpers/syncPromiseWithTimeout.ts";
import Distributor from "./components/Distributor.ts";
import { IPot } from "./entities/Pot.ts";
import { ITaskBuilder } from "./entities/Task.ts";
import { IWorkflowBuilder } from "./entities/Workflow.ts";
import {
  EventDrivenLogger,
  ILoggerOptions,
} from "./components/EventDrivenLogger.ts";
import { SourceType } from "../events/LogEvents.ts";

const globalPotDistributor = new Distributor();

const settings = {
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

const execute = async (
  builder: ITaskBuilder | IWorkflowBuilder,
  pots?: Array<IPot>,
): Promise<IPot> => {
  const distributor = new Distributor();
  distributor.register(builder);

  if (pots) {
    pots.forEach((pot) => {
      distributor.send(pot);
    });
  }

  distributor.start();

  return {} as IPot;
};

const executeSync = (
  builder: ITaskBuilder | IWorkflowBuilder,
  pots?: Array<IPot>,
): IPot => {
  return syncPromiseWithTimeout<IPot>(() => execute(builder, pots));
};

const start = () => {
  globalPotDistributor.start();
};

const register = (builder: ITaskBuilder | IWorkflowBuilder) => {
  globalPotDistributor.register(builder);
};

const disable = (builder: ITaskBuilder | IWorkflowBuilder) => {
  globalPotDistributor.disable(builder);
};

const enable = (builder: ITaskBuilder | IWorkflowBuilder) => {
  globalPotDistributor.enable(builder);
};

const send = (pot: IPot) => {
  globalPotDistributor.send(pot);
};

const sendTo = (builder: ITaskBuilder, pot: IPot) => {
  pot.to.task = builder.task.name;
  globalPotDistributor.send(pot);
};

const createLogger = (options: ILoggerOptions) => {
  return new EventDrivenLogger(options);
};

const api = {
  start,
  register,
  disable,
  enable,
  send,
  sendTo,
  execute,
  executeSync,
  settings,
  createLogger,
};

export default api;
