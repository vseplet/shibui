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

import { Core } from "$core/components";
import type {
  TCore,
  TCoreOptions,
  TPot,
  TSpicy,
  TTaskBuilder,
  TWorkflowBuilder,
} from "$core/types";
import type { TConstructor } from "$helpers/types";
import { TaskBuilder, WorkflowBuilder } from "$core/entities";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$core/events";
import { delay } from "$deps";

/**
 * Executes a task or workflow using the provided builder.
 * @param {TTaskBuilder | TWorkflowBuilder} builder - The task or workflow builder.
 * @param {Array<TPot>} [pots] - An array of IPot objects to send to the core.
 * @returns {Promise<boolean>} - Returns true if execution is successful, otherwise false.
 */
export const execute = async (
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<TPot>,
): Promise<boolean> => {
  const startTime = new Date().getTime();
  let isComplete = false;
  let isOk = true;

  const tmpCore = new Core({ useDenoKV: false });
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
  // tmpCore.stop();
  return isOk;
};

/**
 * Creates a new task builder with the specified IPot constructors.
 * @param {TConstructor<P1>} p1 - Constructor for the first IPot.
 * @param {TConstructor<P2>} [p2] - Constructor for the second IPot.
 * @param {TConstructor<P3>} [p3] - Constructor for the third IPot.
 * @param {TConstructor<P4>} [p4] - Constructor for the fourth IPot.
 * @param {TConstructor<P5>} [p5] - Constructor for the fifth IPot.
 * @returns {TaskBuilder<P1, P2, P3, P4, P5>} - A new task builder.
 */
export const task = <
  P1 extends TPot,
  P2 extends TPot,
  P3 extends TPot,
  P4 extends TPot,
  P5 extends TPot,
>(
  p1: TConstructor<P1>,
  p2?: TConstructor<P2>,
  p3?: TConstructor<P3>,
  p4?: TConstructor<P4>,
  p5?: TConstructor<P5>,
) =>
  new TaskBuilder<TSpicy, P1, P2, P3, P4, P5>(
    p1,
    p2,
    p3,
    p4,
    p5,
  );

/**
 * Creates a new workflow builder with the specified context IPot constructor.
 * @param {TConstructor<ContextPot>} contextPotConstructor - Constructor for the context IPot.
 * @returns {WorkflowBuilder<ContextPot>} - A new workflow builder.
 */
export const workflow = <ContextPot extends TPot>(
  contextPotConstructor: TConstructor<ContextPot>,
) => new WorkflowBuilder<ContextPot, TSpicy>(contextPotConstructor);

/**
 * Creates and returns a new instance of ShibuiCore.
 * @param {TCoreOptions} [config={ useDenoKV: true }] - Configuration for ShibuiCore.
 * @returns {TCore} - A new instance of ShibuiCore.
 */
export const core = <S extends TSpicy = {}>(
  config: TCoreOptions<S> = { useDenoKV: true },
): TCore<S> => {
  return new Core<S>(config);
};

export default core;
