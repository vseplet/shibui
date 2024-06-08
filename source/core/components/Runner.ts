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
  SourceType,
} from "../types.ts";

export default class Runner {
  #core: IShibuiCore;
  #logger: IEventDrivenLogger;
  #tasks: { [name: string]: ITask } = {};

  constructor(core: IShibuiCore) {
    this.#core = core;
    this.#logger = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Runner",
    });
  }

  #processDoHandlerResult(
    pots: Array<Pot<any>>,
    task: ITask,
    result: DoHandlerResult,
  ): boolean {
    try {
      if (result.op === DoHandlerOp.FINISH) {
        // core.core.send(new core.pots.task.TaskFinishedPot());
      } else if (result.op == DoHandlerOp.NEXT) {
        //TODO: пофиксить преобразование данных в next

        result.taskBuilders.forEach((builder) => {
          const copyOfContextPot = pots[0].copy(result.data || pots[0].data);
          copyOfContextPot.from.task = task.name;
          copyOfContextPot.from.workflow = task.belongsToWorkflow;
          copyOfContextPot.to.task = builder.task.name;
          copyOfContextPot.to.workflow = builder.task.belongsToWorkflow;

          // console.log(pots[0]);
          // console.log(copyOfContextPot);

          this.#core.send(copyOfContextPot);
          // core.core.send(new core.pots.task.TaskCallingNext());
        });
      } else if (result.op === DoHandlerOp.REPEAT) {
        // core.core.send(new core.pots.task.TaskRepeatedPot());
        return true;
      } else if (result.op === DoHandlerOp.FAIL) {
        // core.core.send(new core.pots.task.TaskFailedPot());
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#logger.err(
          `trying to process do handler result from task '${task.name}' by pot(?context) '${
            pots[0].name
          }' failed with error: '${err.message}'`,
        );
      }
      return true;
    }
    return false;
  }

  registerTask(task: ITask) {
    this.#tasks[task.name] = task;
    this.#logger.inf(`registered task '${task.name}'`);
  }

  async runDoHandler(taskName: string, pots: Array<Pot<any>>) {
    const task = this.#tasks[taskName];

    for (let attempt = 0; attempt < task.attempts; attempt++) {
      try {
        this.#logger.trc(
          `trying to exec do handler from task '${taskName}' by pot '${
            pots[0].name
          }'...`,
        );

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

        if (!this.#processDoHandlerResult(pots, task, doResult)) {
          break;
        }
        this.#logger.err(
          `repeat exec do handler from task '${taskName}' by pot '${
            pots[0].name
          }`,
        );
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.#logger.err(
            `trying to exec do handler from task '${taskName}' by pot '${
              pots[0].name
            }' failed with error: '${err.stack}'`,
          );
        } else {
          this.#logger.flt(
            `trying to exec do handler from task '${taskName}' by pot '${
              pots[0].name
            }' failed with unknown error!`,
          );
        }
      }
    }
  }
}
