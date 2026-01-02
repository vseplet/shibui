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
  PotInput,
  PotLike,
  PotWithData,
  TCoreOptions,
  ToPots,
  TPot,
  TSpicy,
  TTaskBuilder,
  TWorkflowBuilder,
} from "$shibui/types";
import { exit } from "$helpers";
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
import type { PotFactory } from "./pot.ts";

/** Check if input is a PotFactory */
// deno-lint-ignore no-explicit-any
function isPotFactoryInput(input: PotLike): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "create" in input &&
    "_class" in input;
}

/** Convert PotLike to TPot */
function toPot(input: PotLike): TPot {
  if (isPotFactoryInput(input)) {
    return input.create() as unknown as TPot;
  }
  return input as TPot;
}

/**
 * Executes a task or workflow using the provided builder.
 * @param {TTaskBuilder | TWorkflowBuilder} builder - The task or workflow builder.
 * @param {Array<PotLike>} [pots] - Pot factories, instances, or raw pots.
 * @param {TCoreOptions<S>} [_options] - Core options.
 * @returns {Promise<boolean>} - Returns true if execution is successful, otherwise false.
 *
 * @example
 * const Counter = pot("Counter", { value: 0 });
 * // All these work:
 * await execute(myTask, [Counter]);                    // Factory - auto-creates
 * await execute(myTask, [Counter.create({ value: 5 })]);  // Instance
 */
export const execute = async <S extends TSpicy>(
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<PotLike>,
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
  if (pots) pots.forEach((pot) => tmpCore.send(toPot(pot)));
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
    storage: "memory",
    logging: false,
  }).then((value) => {
    exit(value ? 0 : 1);
  });
};

/** Check if input is a PotFactory */
// deno-lint-ignore no-explicit-any
function isPotFactory(input: PotInput): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

/** Convert PotInput to Constructor */
// deno-lint-ignore no-explicit-any
function toConstructor(input: PotInput): Constructor<Pot<any>> {
  if (isPotFactory(input)) {
    return input._class;
  }
  return input;
}

/**
 * Creates a new task builder
 *
 * @example
 * // With pot() factory (v1.0 - recommended)
 * const Counter = pot("Counter", { value: 0 });
 * task(Counter).name("Task").do(...)
 *
 * // With class (legacy)
 * task(MyPot).name("Task").do(...)
 */
export const task = <
  Sources extends PotInput[],
  CPot extends ContextPot<{}> | undefined = undefined,
>(
  ...sources: Sources
): TaskBuilder<{}, ToPots<Sources>, CPot> => {
  const constructors = sources.map(toConstructor);
  // deno-lint-ignore no-explicit-any
  return new TaskBuilder<{}, ToPots<Sources>, CPot>(...constructors as any);
};

// Overloads for proper type inference
export function workflow<CP extends ContextPot<{}>>(
  contextPotConstructor: Constructor<CP>,
): WorkflowBuilder<TSpicy, CP>;
export function workflow<D extends object>(
  contextPotFactory: PotFactory<D>,
): WorkflowBuilder<TSpicy, PotWithData<D>>;
export function workflow(): WorkflowBuilder<TSpicy, ContextPot<{}>>;
// Implementation
export function workflow(
  contextPotSource?: Constructor<ContextPot<{}>> | PotFactory<object>,
): WorkflowBuilder<TSpicy, Pot> {
  return new WorkflowBuilder<TSpicy, Pot>(
    contextPotSource || createRandomContext(ContextPot),
  );
}

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

// Alias: shibui = core
export const shibui = core;

// New v1.0 API - pot factory
export {
  context,
  CoreStartPot as CoreStart,
  pot,
  type PotData,
  type PotFactory,
  type PotInstance,
  type PotOf,
  type PotOptions,
} from "./pot.ts";

// New v1.0 API - chain and pipe utilities
export { chain, type ChainConfig, pipe, type Transform } from "./chain.ts";

// Storage providers
export { DenoKvProvider, MemoryProvider } from "$shibui/providers";

// Runtime detection
export {
  detectRuntime,
  exit,
  getRuntimeInfo,
  getRuntimeVersion,
  isBun,
  isDeno,
  isNode,
  type Runtime,
  runtime,
} from "$helpers";

// Re-export everything from submodules for convenience
export { ContextPot, CoreStartPot } from "$shibui/pots";

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
  // Type helpers
  PotInput,
  PotLike,
  PotWithData,
  // Storage provider
  StorageEntry,
  StorageProvider,
  // Core types
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
  ToPot,
  ToPots,
  TPot,
  TPotData,
  TPotInstanceOf,
  TPotPack,
  TPotsConstructorsList,
  TPotSource,
  TSError,
  TSEvent,
  TSpicy,
  TTask,
  TTaskBuilder,
  TTaskDoHandler,
  TTaskTrigger,
  TTaskTriggerHandler,
  TTaskTriggerStorage,
  TWhenPredicate,
  TWorkflow,
  TWorkflowBuilder,
  TWorkflowTrigger,
  TWorkflowTriggerHandler,
  TWorkflowTriggerHandlerContext,
  TWorkflowTriggersStorage,
  WorkflowsStorage,
} from "$shibui/types";

export { isPotFactory } from "$shibui/types";
