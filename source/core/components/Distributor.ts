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

import Runner from "./Runner.ts";
import { CoreStartPot } from "../pots/CoreStartPot.ts";
import { Pot } from "../entities/Pot.ts";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import { WorkflowBuilder } from "../entities/WorkflowBuilder.ts";
import {
  type IEventDrivenLogger,
  type IPot,
  type IShibuiCore,
  type ITaskBuilder,
  type IWorkflowBuilder,
  SourceType,
} from "../types.ts";
import { Tester } from "./Tester.ts";
import { Filler } from "./Filler.ts";

export default class Distributor {
  #kv: Deno.Kv = undefined as unknown as Deno.Kv;
  #core: IShibuiCore;
  #log: IEventDrivenLogger;

  #runner: Runner;
  #tester: Tester;
  #filler: Filler;

  constructor(core: IShibuiCore) {
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Distributor",
    });
    this.#tester = new Tester(core, this.#kv);
    this.#filler = new Filler(core, this.#kv);
    this.#runner = new Runner(core, this.#kv);
  }

  #processPot(pot: Pot): boolean {
    this.#tester.test(pot);
    // this.#filler.fill(pot);
    // this.#runner.run("", []);
    return true;
  }

  async start() {
    this.#log.inf(`init deno kv...`);
    this.#kv = await Deno.openKv();
    this.#log.inf(`starting update cycle...`);
    this.#core.send(new CoreStartPot());

    this.#kv.listenQueue((rawPotObj: IPot) => {
      try {
        const pot = new Pot().deserialize(rawPotObj);

        if (pot) {
          this.#log.vrb(`received a pot '${pot.name}, ttl:{${pot.ttl}}'`);
          if (!this.#processPot(pot) && pot.ttl > 0) {
            this.resend(pot);
          } else {
            this.#log.vrb(`drop the pot '${pot.name} from queue`);
          }
        } else {
          return;
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.#log.flt(
            `failure in pot processing cycle with error: ${err.message} ${err.stack}`,
          );
        }
      }
    });
  }

  register(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
      const workflow = builder.build();
      this.#tester.registerWorkflow(workflow);
      this.#runner.registerWorkflow(workflow);
    } else if (builder instanceof TaskBuilder) {
      const task = builder.build();
      this.#tester.registerTask(task);
      this.#runner.registerTask(task);
    }

    console.log(this.#tester);
  }

  disable(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
    }
  }

  enable(builder: IWorkflowBuilder | ITaskBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
    }
  }

  resend(pot: IPot) {
    if (pot.ttl > 0) {
      this.#log.trc(
        `return pot '${pot.name}' with ttl:{${pot.ttl}} back to the queue`,
      );
      pot.ttl--;
      this.#kv.enqueue(pot);
    } else {
      this.#log.wrn(
        `pot '${pot.name}' ran out of ttl =(`,
      );
    }
  }

  send(pot: IPot) {
    this.#log.trc(`sending pot '${pot.name} to queue'`);
    this.#kv.enqueue(pot);
  }
}
