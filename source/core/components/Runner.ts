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

import type { Pot } from "../entities/Pot.ts";
import {
  DoHandlerOp,
  type DoHandlerResult,
  type IEventDrivenLogger,
  type IPot,
  type IShibuiCore,
  type ITask,
  type ITaskBuilder,
  IWorkflow,
  SourceType,
} from "../types.ts";

export default class Runner {
  #core: IShibuiCore;
  #kv: Deno.Kv;
  #log: IEventDrivenLogger;
  #tasks: { [name: string]: ITask } = {};

  constructor(core: IShibuiCore, kv: Deno.Kv) {
    this.#core = core;
    this.#kv = kv;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Runner",
    });
  }

  registerTask(task: ITask) {
    this.#tasks[task.name] = task;
    this.#log.inf(`registered task '${task.name}'`);
  }

  registerWorkflow(workflow: IWorkflow) {
    // this.#log.inf(`registered w '${workflow.name}'`);
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
          taskBuilders: ITaskBuilder | Array<ITaskBuilder>,
          data?: Partial<IPot["data"]>,
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
        repeat: (_data?: Partial<IPot["data"]>) => ({
          op: DoHandlerOp.REPEAT,
        }),
      });

      this.#processDoHandlerResult(pots, task, doResult);
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

  #onFail() {}

  #onNext(
    pots: Array<Pot>,
    task: ITask,
    nextTasks: Array<ITaskBuilder>,
    data?: Partial<unknown> | undefined,
  ) {
    if (task.belongsToWorkflow) {
      // это task из workflow скрипта
    } else {
      // это одиночный task
    }
    nextTasks.forEach((builder) => {
      const newContextPot = pots[0].copy(data || pots[0].data);
      newContextPot.from.task = task.name;
      newContextPot.from.workflow = task.belongsToWorkflow;
      newContextPot.to.task = builder.task.name;
      newContextPot.to.workflow = builder.task.belongsToWorkflow;
      this.#core.send(newContextPot);
    });
  }

  #onFinish() {}

  #onRepeat() {}

  #onError(pots: Array<Pot>, task: ITask, err: Error) {
    this.#log.err(
      `trying to process do handler result from task '${task.name}' by pot(?context) '${
        pots[0].name
      }' failed with error: '${err.message}'`,
    );
  }

  #processDoHandlerResult(
    pots: Array<Pot>,
    task: ITask,
    result: DoHandlerResult,
  ) {
    try {
      if (result.op === DoHandlerOp.FINISH) {
        this.#onFinish();
      } else if (result.op == DoHandlerOp.NEXT) {
        this.#onNext(pots, task, result.taskBuilders, result.data);
      } else if (result.op === DoHandlerOp.REPEAT) {
        this.#onRepeat();
      } else if (result.op === DoHandlerOp.FAIL) {
        this.#onFail();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#onError(pots, task, err);
      }
    }
  }
}
