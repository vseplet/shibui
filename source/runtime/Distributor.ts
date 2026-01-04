import { CoreStartPot } from "./CoreStartPot.ts";
import { Pot } from "$shibui/runtime";
import {
  type QueueProvider,
  SourceType,
  type StorageProvider,
  type TAnyCore,
  type TEventDrivenLogger,
  type TPot,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$shibui/types";
import { TaskBuilder, Tester, WorkflowBuilder } from "$shibui/runtime";

export default class Distributor {
  #queue: QueueProvider;
  #storage: StorageProvider;
  #core: TAnyCore;
  #log: TEventDrivenLogger;
  #tester: Tester;

  constructor(
    queue: QueueProvider,
    storage: StorageProvider,
    core: TAnyCore,
    context = {},
  ) {
    this.#queue = queue;
    this.#storage = storage;
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
    await this.#queue.open();
    await this.#storage.open();
    await this.#tester.init(this.#storage);
    this.#queue.listen((rawPotObj: TPot) => this.#test(rawPotObj));
    this.send(CoreStartPot.create() as TPot);
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
      this.#queue.enqueue(pot);
    } else {
      this.#log.wrn(
        `pot '${pot.name}' ran out of ttl =(`,
      );
    }
  }

  send(pot: TPot) {
    this.#log.trc(`sending pot '${pot.name} to queue'`);
    this.#queue.enqueue(pot);
  }

  close(): void {
    this.#queue.close();
    this.#storage.close();
  }
}

export { Distributor };
