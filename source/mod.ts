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

import { Core } from "$shibui/components";
import type {
  TCoreOptions,
  TPot,
  TSpicy,
  TTaskBuilder,
  TWorkflowBuilder,
} from "$shibui/types";
import type { Constructor } from "$helpers/types";
import type { Pot } from "$shibui/entities";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$shibui/events";
import { delay } from "@std/async";
import { TaskBuilder } from "./entities/TaskBuilder.ts";
import { WorkflowBuilder } from "./entities/WorkflowBuilder.ts";
import { ContextPot } from "$shibui/pots";
import { createRandomContext } from "./helpers/createRandomContext.ts";
import { emitters } from "$shibui/emitters";
import { levelName } from "./components/EventDrivenLogger.ts";

/**
 * Executes a task or workflow using the provided builder.
 * @param {TTaskBuilder | TWorkflowBuilder} builder - The task or workflow builder.
 * @param {Array<TPot>} [pots] - An array of IPot objects to send to the core.
 * @param {TCoreOptions<S>} [_options] - Core options.
 * @returns {Promise<boolean>} - Returns true if execution is successful, otherwise false.
 */
export const execute = async <S extends TSpicy>(
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<TPot>,
  options?: TCoreOptions<S>,
): Promise<boolean> => {
  let isComplete = false;
  let isOk = true;

  const tmpCore = new Core(options || {});
  tmpCore.register(builder);

  const finish = () => {
    isComplete = true;
  };

  const fail = () => {
    isComplete = true;
    isOk = false;
  };

  if (builder instanceof TaskBuilder) {
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      TaskFinishedEvent,
      finish,
    );
    tmpCore.emitters.coreEventEmitter.addListenerByName(TaskFailedEvent, fail);
  } else {
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      WorkflowFinishedEvent,
      finish,
    );
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      WorkflowFailedEvent,
      fail,
    );
  }

  await tmpCore.start();
  if (pots) pots.forEach((pot) => tmpCore.send(pot));
  while (!isComplete) await delay(0);
  tmpCore.close();
  return isOk;
};

export const runCI = <S extends TSpicy>(
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<TPot>,
): void => {
  emitters.logEventEmitter.addListener((event) => {
    if (event.level > 3) {
      if (event.sourceType === "TASK") {
        console.log(
          `${levelName[event.level]} (${event.sourceName}): ${event.msg}`,
        );
      } else if (event.sourceType === "CORE") {
        console.log(`${levelName[event.level]} (SYSTEM): ${event.msg}`);
      }
    }
  });

  execute(builder, pots, {
    kv: {
      inMemory: true,
    },
    logger: {
      enable: false,
    },
  }).then((value) => {
    Deno.exit(value ? 0 : -1);
  });
};

export const task = <
  Pots extends Pot[],
  CPot extends ContextPot<{}> | undefined = undefined,
>(
  ...constructors: { [K in keyof Pots]: Constructor<Pots[K]> }
): TaskBuilder<{}, Pots, CPot> => {
  return new TaskBuilder<{}, Pots, CPot>(...constructors);
};

export const workflow = <CP extends ContextPot<{}>>(
  contextPotConstructor?: Constructor<CP>,
): WorkflowBuilder<TSpicy, CP> =>
  new WorkflowBuilder<TSpicy, CP>(
    contextPotConstructor || createRandomContext(ContextPot),
  );

/**
 * Creates and returns a new instance of ShibuiCore.
 * @param {TCoreOptions} [config={ }] - Configuration for ShibuiCore.
 * @returns {TCore} - A new instance of ShibuiCore.
 */
export const core = <S extends TSpicy = {}>(
  config: TCoreOptions<S> = {},
  // TODO: fix TCore type, add settings
): Core<S> => {
  return new Core<S>(config);
};

export default core;

// Re-export everything from submodules for convenience
export {
  ContextPot,
  CoreStartPot,
  ExternalPot,
  InternalPot,
  SystemPot,
} from "$shibui/pots";

export {
  Pot,
  SError,
  SEvent,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/entities";

export {
  CoreEvent,
  DebugLogEvent,
  ErrorLogEvent,
  FatalLogEvent,
  InfoLogEvent,
  LogEvent,
  TaskFailedEvent,
  TaskFinishedEvent,
  TraceLogEvent,
  VerboseLogEvent,
  WarnLogEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
  WorkflowStartedEvent,
} from "$shibui/events";

export { TaskNameMissingError, TaskTriggersMissingError } from "$shibui/errors";

export {
  DoOperation,
  EventType,
  LogLevel,
  PotType,
  SourceType,
  TaskType,
  TriggerOperation,
  TriggerRule,
  UNKNOWN_TARGET,
} from "$shibui/constants";

export type {
  TAnyCore,
  TAnyTaskDoHandler,
  TAnyTaskTrigger,
  TasksStorage,
  TCore,
  TCoreOptions,
  TDoHandlerContext,
  TDoHandlerResult,
  TEventDrivenLogger,
  TLogEventArgs,
  TLogEventMetadata,
  TLoggerOptions,
  TOnHandlerContext,
  TOnHandlerResult,
  TPot,
  TPotPack,
  TPotsConstructorsList,
  TSError,
  TSEvent,
  TSpicy,
  TTask,
  TTaskBuilder,
  TTaskDoHandler,
  TTaskTrigger,
  TTaskTriggerHandler,
  TTaskTriggerStorage,
  TWorkflow,
  TWorkflowBuilder,
  TWorkflowTrigger,
  TWorkflowTriggerHandler,
  TWorkflowTriggerHandlerContext,
  TWorkflowTriggersStorage,
  WorkflowsStorage,
} from "$shibui/types";
