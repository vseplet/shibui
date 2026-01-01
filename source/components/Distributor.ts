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

import { CoreStartPot } from "$shibui/pots";
import { Pot } from "$shibui/entities";
import {
  SourceType,
  type TAnyCore,
  type TEventDrivenLogger,
  type TPot,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$shibui/types";
import { Tester } from "$shibui/components";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import { WorkflowBuilder } from "../entities/WorkflowBuilder.ts";

export default class Distributor {
  #kv: Deno.Kv = undefined as unknown as Deno.Kv;
  #core: TAnyCore;
  #storagePath: string | undefined;
  #log: TEventDrivenLogger;
  #tester: Tester;

  constructor(storagePath: string | undefined, core: TAnyCore, context = {}) {
    this.#storagePath = storagePath;
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.Core,
      sourceName: "Distributor",
    });

    this.#tester = new Tester(core, context);
  }

  async #test(rawPotObj: TPot) {
    try {
      const pot = new Pot().deserialize(rawPotObj);
      if (!pot) return;
      this.#log.vrb(`received a pot '${pot.name}', ttl:{${pot.ttl}}`);
      if (!await this.#tester.test(pot) && pot.ttl > 0) {
        this.resend(pot);
      } else {
        this.#log.vrb(`drop the pot '${pot.name}' from queue`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.#log.flt(
          `failure in pot processing cycle with error: ${err.message} ${err.stack}`,
        );
      }
    }
  }

  async start() {
    this.#log.trc(`starting update cycle...`);
    this.#kv = await Deno.openKv(this.#storagePath);
    await this.#tester.init(this.#kv);
    this.#kv.listenQueue((rawPotObj: TPot) => this.#test(rawPotObj));
    this.send(new CoreStartPot());
  }

  register(builder: TTaskBuilder | TWorkflowBuilder) {
    if (builder instanceof WorkflowBuilder) {
      const workflow = builder.build();
      this.#tester.registerWorkflow(workflow);
    } else if (builder instanceof TaskBuilder) {
      const task = builder.build();
      this.#tester.registerTask(task);
    }
  }

  disable(builder: TTaskBuilder | TWorkflowBuilder) {
    if (builder instanceof WorkflowBuilder) {
      // TODO: implement workflow disable
    } else if (builder instanceof TaskBuilder) {
      // TODO: implement task disable
    }
  }

  enable(builder: TTaskBuilder | TWorkflowBuilder) {
    if (builder instanceof WorkflowBuilder) {
      // TODO: implement workflow enable
    } else if (builder instanceof TaskBuilder) {
      // TODO: implement task enable
    }
  }

  resend(pot: TPot) {
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

  send(pot: TPot) {
    this.#log.trc(`sending pot '${pot.name} to queue'`);
    this.#kv.enqueue(pot);
  }

  close(): void {
    this.#kv?.close();
  }
}

export { Distributor };
