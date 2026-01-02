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

import type { Pot } from "$shibui/core";
import {
  SourceType,
  type StorageProvider,
  type TAnyCore,
  type TDoHandlerResult,
  type TEventDrivenLogger,
  type TPot,
  type TSpicy,
  type TTask,
  type TTaskBuilder,
} from "$shibui/types";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$shibui/events";
import { DoOperation, UNKNOWN_TARGET } from "$shibui/types";
import { delay } from "@std/async";
import { promiseWithTimeout } from "$helpers";

export default class Runner {
  #core: TAnyCore;
  #provider: StorageProvider | null = null;
  #log: TEventDrivenLogger;
  #spicy: TSpicy;
  #tasks: { [name: string]: TTask } = {};

  constructor(core: TAnyCore, spicy: any = {}) {
    this.#spicy = spicy;
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.Core,
      sourceName: "Runner",
    });
  }

  init(provider: StorageProvider): void {
    this.#provider = provider;
  }

  registerTask(task: TTask) {
    this.#tasks[task.name] = task;
    this.#log.trc(`registered task '${task.name}'`);
  }

  async run(taskName: string, pots: Array<Pot>, ctx?: Pot) {
    const task = this.#tasks[taskName];
    this.#log.trc(
      `trying to exec do handler from task '${taskName}' by pot '${
        pots[0]?.name || ctx?.name
      }'...`,
    );

    try {
      if (task.attempts > 0) task.attempts--;

      const doPromise = () =>
        task.do({
          core: this.#core,
          ...this.#spicy,
          log: this.#core.createLogger({
            sourceType: SourceType.Task,
            sourceName: `DO: ${taskName}`,
          }),
          pots,
          ctx,
          next: (
            taskBuilders: TTaskBuilder | Array<TTaskBuilder>,
            data?: Partial<TPot["data"]>,
          ) => ({
            op: DoOperation.Next,
            taskBuilders: taskBuilders instanceof Array
              ? taskBuilders
              : [taskBuilders],
            data,
          }),
          fail: (reason?: string) => ({
            op: DoOperation.Fail,
            reason: reason || "",
          }),
          finish: () => ({ op: DoOperation.Finish }),
          repeat: (_data?: Partial<TPot["data"]>) => ({
            op: DoOperation.Repeat,
          }),
        });

      const doResult = task.timeout > 0
        ? await promiseWithTimeout(doPromise(), task.timeout)
        : await doPromise();

      if (doResult == null) {
        this.#onError({
          ctx,
          pots,
          task,
          err: new Error(`task '${task.name}' timeout`),
        });
      } else {
        this.#processResult(task, doResult, pots, ctx);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#log.err(
          `trying to exec do handler from task '${taskName}' by pot '${
            pots[0]?.name || ctx?.name
          }' failed with error: '${err.stack}'`,
        );
      } else {
        this.#log.flt(
          `trying to exec do handler from task '${taskName}' by pot '${
            pots[0]?.name || ctx?.name
          }' failed with unknown error!`,
        );
      }

      this.#onError({
        ctx,
        pots,
        task,
        err: err as Error,
      });
    }
  }

  #processResult(
    task: TTask,
    result: TDoHandlerResult,
    pots: Array<Pot>,
    ctx?: Pot,
  ) {
    try {
      switch (result.op) {
        case DoOperation.Finish:
          this.#onFinish(task);
          break;
        case DoOperation.Next:
          this.#onNext({
            pots,
            ctx,
            task,
            nextTasks: result.taskBuilders || [],
            data: result.data,
          });
          break;
        case DoOperation.Repeat:
          this.#onRepeat({
            pots,
            ctx,
            task,
            afterMs: result?.afterMs || 0,
          });
          break;
        case DoOperation.Fail:
          this.#onFail({
            task,
            reason: result?.reason || "",
          });
          break;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#onError({
          ctx,
          pots,
          task,
          err,
        });
      }
    }
  }

  #onFail({
    task,
    reason,
  }: {
    task: TTask;
    reason: string;
  }) {
    this.#log.err(`Task '${task.name}' failed due to reason: '${reason}'.`);
    this.#core.emitters.coreEventEmitter.emit(new TaskFailedEvent());
    if (task.belongsToWorkflow) {
      this.#log.err(
        `Workflow '${task.belongsToWorkflow}' failed due to task failure.`,
      );
      this.#core.emitters.coreEventEmitter.emit(new WorkflowFailedEvent());
    }

    task.fail(new Error(reason));
  }

  #onNext({
    pots,
    ctx,
    task,
    nextTasks,
    data,
  }: {
    pots: Array<Pot>;
    ctx?: Pot;
    task: TTask;
    nextTasks: Array<TTaskBuilder>;
    data?: Partial<unknown> | undefined;
  }) {
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
      if (ctx) {
        const newContextPot = ctx.copy(data || ctx.data);
        newContextPot.from.task = task.name;
        newContextPot.from.workflow = task.belongsToWorkflow || UNKNOWN_TARGET;
        newContextPot.to.task = builder.task.name;
        newContextPot.to.workflow = builder.task.belongsToWorkflow ||
          UNKNOWN_TARGET;
        this.#core.send(newContextPot);
      } else {
        const newContextPot = pots[0].copy(data || pots[0].data);
        newContextPot.from.task = task.name;
        newContextPot.from.workflow = task.belongsToWorkflow || UNKNOWN_TARGET;
        newContextPot.to.task = builder.task.name;
        newContextPot.to.workflow = builder.task.belongsToWorkflow ||
          UNKNOWN_TARGET;
        this.#core.send(newContextPot);
      }
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

  async #onRepeat({
    pots,
    ctx: _ctx,
    task,
    afterMs,
  }: {
    pots: Array<Pot>;
    ctx?: Pot;
    task: TTask;
    afterMs: number;
  }) {
    await delay(afterMs);

    if (task.belongsToWorkflow) {
      this.#log.inf(
        `repeat the task ${task.name} within the workflow '${task.belongsToWorkflow}'.`,
      );
    } else {
      this.#log.inf(
        `repeat the task ${task.name}`,
      );
    }

    this.run(task.name, pots);
  }

  async #onError({
    ctx: _ctx,
    pots,
    task,
    err,
  }: {
    ctx?: Pot;
    pots: Array<Pot>;
    task: TTask;
    err: Error;
  }) {
    if (task.belongsToWorkflow) {
      this.#log.err(
        `trying to process do handler result from workflow '${task.belongsToWorkflow}' task '${task.name}' by context '${
          pots[0]?.name
        }' failed with error: '${err.stack}'`,
      );
    } else {
      this.#log.err(
        `trying to process do handler result from task '${task.name}' by pot'${
          pots[0]?.name
        }' failed with error: '${err.stack}'`,
      );
    }

    if (task.attempts > 0) {
      if (task.interval > 0) await delay(task.interval);

      if (task.belongsToWorkflow) {
        this.#log.inf(
          `retrying task '${task.name}' in workflow '${task.belongsToWorkflow}'.`,
        );
      } else {
        this.#log.inf(
          `retrying task '${task.name}'`,
        );
      }

      this.run(task.name, pots);
    } else {
      this.#core.emitters.coreEventEmitter.emit(new TaskFinishedEvent());

      if (task.belongsToWorkflow) {
        this.#core.emitters.coreEventEmitter.emit(new WorkflowFinishedEvent());
      }

      task.fail(err);
    }
  }
}

export { Runner };
