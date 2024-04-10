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

import { IPot, Pot } from "../entities/Pot.ts";
import {
  DoHandlerResult,
  ITask,
  ITaskBuilder,
} from "../entities/TaskBuilder.ts";
import { EventDrivenLogger } from "../components/EventDrivenLogger.ts";
import core from "../mod.ts";
import { SourceType } from "../../events/LogEvents.ts";
import { DoHandlerOp } from "../entities/TaskBuilder.ts";

export default class Runner {
  #logger = new EventDrivenLogger({
    sourceType: SourceType.CORE,
    sourceName: "Runner",
  });
  #tasks: { [name: string]: ITask } = {};

  constructor() {
  }

  #processDoHandlerResult(
    pots: Array<Pot<any>>,
    task: ITask,
    result: DoHandlerResult,
  ): boolean {
    try {
      if (result.op === DoHandlerOp.FINISH) {
        // core.api.send(new core.pots.task.TaskFinishedPot());
      } else if (result.op === DoHandlerOp.NEXT) {
        //TODO: пофиксить преобразование данных в next
        result.tasks.forEach((builder) => {
          const copyOfContextPot = pots[0].copy(result.data || pots[0].data);
          copyOfContextPot.from.task = builder.task.name;
          copyOfContextPot.from.workflow = builder.task.belongsToWorkflow;
          copyOfContextPot.to.task = builder.task.name;
          copyOfContextPot.to.workflow = builder.task.belongsToWorkflow;
          core.api.send(copyOfContextPot);
          // core.api.send(new core.pots.task.TaskCallingNext());
        });
      } else if (result.op === DoHandlerOp.REPEAT) {
        // core.api.send(new core.pots.task.TaskRepeatedPot());
        return true;
      } else if (result.op === DoHandlerOp.FAIL) {
        // core.api.send(new core.pots.task.TaskFailedPot());
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
          api: core.api,
          log: new EventDrivenLogger({
            sourceType: SourceType.TASK,
            sourceName: `DO: ${taskName}`,
          }),
          ctx: pots[0],
          p1: pots[0],
          p2: pots[1] ? pots[1] : {} as IPot,
          p3: pots[2] ? pots[2] : {} as IPot,
          p4: pots[3] ? pots[3] : {} as IPot,
          next: (
            taskBuilders: ITaskBuilder | Array<ITaskBuilder>,
            data?: Partial<IPot["data"]>,
          ) => ({
            op: "next",
            taskBuilders: taskBuilders instanceof Array
              ? taskBuilders
              : [taskBuilders],
            data,
          }),
          fail: (reason?: string) => ({ op: "fail", reason: reason || "" }),
          finish: () => ({ op: "finish" }),
          repeat: (_data?: Partial<IPot["data"]>) => ({ op: "repeat" }),
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
            }' failed with error: '${err.message}'`,
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
