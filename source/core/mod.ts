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

import { ShibuiCore } from "$core/components";
import type { IPot, ITaskBuilder, IWorkflowBuilder } from "$core/types";
import type { Constructor } from "$helpers/types";
import { TaskBuilder, WorkflowBuilder } from "$core/entities";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$core/events";
import { delay } from "$deps";

export const execute = async (
  builder: ITaskBuilder | IWorkflowBuilder,
  pots?: Array<IPot>,
): Promise<boolean> => {
  const startTime = new Date().getTime();
  let isComplete = false;
  let isOk = true;

  const tmpCore = new ShibuiCore();
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
  return isOk;
};

export const task = <
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
) =>
  new TaskBuilder<P1, P2, P3, P4, P5>(
    p1,
    p2,
    p3,
    p4,
    p5,
  );

export const workflow = <ContextPot extends IPot>(
  contextPotConstructor: Constructor<ContextPot>,
) => new WorkflowBuilder<ContextPot>(contextPotConstructor);

export const core = () => {
  return new ShibuiCore();
};

const defaultCore = new ShibuiCore();
export default defaultCore;
