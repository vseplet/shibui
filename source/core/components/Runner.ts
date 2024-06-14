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

import type { Pot } from "$core/entities";
import {
  DoHandlerOp,
  SourceType,
  type TCore,
  type TDoHandlerResult,
  type TEventDrivenLogger,
  type TPot,
  type TTask,
  type TTaskBuilder,
} from "$core/types";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$core/events";
import { delay } from "$deps";

export default class Runner {
  #core: TCore<{}>;
  #kv: Deno.Kv;
  #log: TEventDrivenLogger;
  #tasks: { [name: string]: TTask } = {};

  constructor(core: TCore<{}>, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Runner",
    });
  }

  registerTask(task: TTask) {
    this.#tasks[task.name] = task;
    this.#log.inf(`registered task '${task.name}'`);
  }

  async run(taskName: string, pots: Array<Pot>) {
    const task = this.#tasks[taskName];
    this.#log.trc(
      `trying to exec do handler from task '${taskName}' by pot '${
        pots[0].name
      }'...`,
    );

    try {
      const doResult = await task.do({
        core: this.#core,
        log: this.#core.createLogger({
          sourceType: SourceType.TASK,
          sourceName: `DO: ${taskName}`,
        }),
        pots,
        next: (
          taskBuilders: TTaskBuilder | Array<TTaskBuilder>,
          data?: Partial<TPot["data"]>,
        ) => ({
          op: DoHandlerOp.NEXT,
          taskBuilders: taskBuilders instanceof Array
            ? taskBuilders
            : [taskBuilders],
          data,
        }),
        fail: (reason?: string) => ({
          op: DoHandlerOp.FAIL,
          reason: reason || "",
        }),
        finish: () => ({ op: DoHandlerOp.FINISH }),
        repeat: (_data?: Partial<TPot["data"]>) => ({
          op: DoHandlerOp.REPEAT,
        }),
      });
      this.#processResult(pots, task, doResult);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#log.err(
          `trying to exec do handler from task '${taskName}' by pot '${
            pots[0].name
          }' failed with error: '${err.stack}'`,
        );
      } else {
        this.#log.flt(
          `trying to exec do handler from task '${taskName}' by pot '${
            pots[0].name
          }' failed with unknown error!`,
        );
      }
    }
  }

  #processResult(
    pots: Array<Pot>,
    task: TTask,
    result: TDoHandlerResult,
  ) {
    try {
      switch (result.op) {
        case DoHandlerOp.FINISH:
          this.#onFinish(task);
          break;
        case DoHandlerOp.NEXT:
          this.#onNext(pots, task, result.taskBuilders, result.data);
          break;
        case DoHandlerOp.REPEAT:
          this.#onRepeat(pots, task);
          break;
        case DoHandlerOp.FAIL:
          this.#onFail(task, result.reason);
          break;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#onError(pots, task, err);
      }
    }
  }

  #onFail(task: TTask, reason: string) {
    this.#log.err(`Task '${task.name}' failed due to reason: '${reason}'.`);
    this.#core.emitters.coreEventEmitter.emit(new TaskFailedEvent());
    if (task.belongsToWorkflow) {
      this.#log.err(
        `Workflow '${task.belongsToWorkflow}' failed due to task failure.`,
      );
      this.#core.emitters.coreEventEmitter.emit(new WorkflowFailedEvent());
    }
  }

  #onNext(
    pots: Array<Pot>,
    task: TTask,
    nextTasks: Array<TTaskBuilder>,
    data?: Partial<unknown> | undefined,
  ) {
    this.#core.emitters.coreEventEmitter.emit(new TaskFinishedEvent());

    nextTasks.forEach((builder) => {
      if (builder.task.belongsToWorkflow) {
        this.#log.inf(
          `calling the next task ${builder.task.name} within the workflow '${task.belongsToWorkflow}'.`,
        );
      } else {
        this.#log.inf(
          `calling the next task ${builder.task.name}`,
        );
      }
      const newContextPot = pots[0].copy(data || pots[0].data);
      newContextPot.from.task = task.name;
      newContextPot.from.workflow = task.belongsToWorkflow;
      newContextPot.to.task = builder.task.name;
      newContextPot.to.workflow = builder.task.belongsToWorkflow;
      this.#core.send(newContextPot);
    });
  }

  #onFinish(task: TTask) {
    if (task.belongsToWorkflow) {
      this.#log.inf(
        `Task '${task.name}' in workflow '${task.belongsToWorkflow}' successfully completed.`,
      );
    } else {
      this.#log.inf(`Task '${task.name}' successfully completed.`);
    }

    this.#core.emitters.coreEventEmitter.emit(new TaskFinishedEvent());

    if (task.belongsToWorkflow) {
      this.#core.emitters.coreEventEmitter.emit(new WorkflowFinishedEvent());
    }
  }

  async #onRepeat(pots: Array<Pot>, task: TTask, afterMs: number = 0) {
    await delay(afterMs);

    if (task.belongsToWorkflow) {
      // это task из workflow скрипта
    } else {
      // это одиночный task
    }
    this.run(task.name, pots);
  }

  #onError(pots: Array<Pot>, task: TTask, err: Error) {
    if (task.belongsToWorkflow) {
      this.#log.err(
        `trying to process do handler result from workflow ${task.belongsToWorkflow} task '${task.name}' by context '${
          pots[0].name
        }' failed with error: '${err.message}'`,
      );
    } else {
      this.#log.err(
        `trying to process do handler result from task '${task.name}' by pot'${
          pots[0].name
        }' failed with error: '${err.message}'`,
      );
    }
  }
}

export { Runner };
