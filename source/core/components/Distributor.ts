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

import { CoreStartPot } from "$core/pots";
import { Pot } from "$core/entities";
import {
  SourceType,
  type TAnyCore,
  type TCoreOptions,
  type TEventDrivenLogger,
  type TPot,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$core/types";
import { Tester } from "$core/components";
import { TaskBuilder } from "../entities/TaskBuilder.ts";
import { WorkflowBuilder } from "../entities/WorkflowBuilder.ts";

export default class Distributor {
  #kv: Deno.Kv = undefined as unknown as Deno.Kv;
  #core: TAnyCore;
  #coreOptions: TCoreOptions = {};
  #log: TEventDrivenLogger;
  #tester: Tester;

  constructor(coreOptions: TCoreOptions, core: TAnyCore, spicy = {}) {
    this.#coreOptions = coreOptions;
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.CORE,
      sourceName: "Distributor",
    });

    this.#tester = new Tester(core, this.#kv, spicy);
  }

  #test(rawPotObj: TPot) {
    try {
      const pot = new Pot().deserialize(rawPotObj);
      if (!pot) return;
      this.#log.vrb(`received a pot '${pot.name}', ttl:{${pot.ttl}}`);
      if (!this.#tester.test(pot) && pot.ttl > 0) {
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
    this.#kv = await Deno.openKv(
      this.#coreOptions.kv?.path || this.#coreOptions.kv?.inMemory
        ? ":memory:"
        : undefined,
    );
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

    // this.#tester.show();
  }

  disable(builder: TTaskBuilder | TWorkflowBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
    }
  }

  enable(builder: TTaskBuilder | TWorkflowBuilder) {
    if (builder instanceof WorkflowBuilder) {
    } else if (builder instanceof TaskBuilder) {
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
}

export { Distributor };
