// deno-lint-ignore-file no-unused-vars
import { PotType, TriggerOperation } from "$shibui/types";
import type { Pot } from "$shibui/runtime";
import {
  SourceType,
  type StorageProvider,
  type TAnyCore,
  type TasksStorage,
  type TEventDrivenLogger,
  type TSpicy,
  type TTask,
  type TTaskTriggerStorage,
  type TWorkflow,
  type TWorkflowTriggersStorage,
  type WorkflowsStorage,
} from "$shibui/types";
import { Filler, Runner } from "$shibui/runtime";

export class Tester {
  #core: TAnyCore;
  #provider: StorageProvider | null = null;
  #log: TEventDrivenLogger;
  #filler: Filler;
  #runner: Runner;
  #spicy: TSpicy;

  #tasks: TasksStorage = {};
  #workflows: WorkflowsStorage = {};

  #taskTriggers: TTaskTriggerStorage = {}; // запускаются от одного пота
  #dependentTaskTriggers: TTaskTriggerStorage = {}; // запускаются от нескольких потов
  #workflowTriggers: TWorkflowTriggersStorage = {}; // запускаются от одного пота и генерирует контекст в очередь
  #workflowTaskTriggers: TTaskTriggerStorage = {}; // запускаются от одного контекстного пота
  #workflowDependentTaskTriggers: TTaskTriggerStorage = {}; // запускаются от нескольких потов, но при наличии контекста

  constructor(core: TAnyCore, spicy = {}) {
    this.#spicy = spicy;
    this.#core = core;
    this.#log = core.createLogger({
      sourceType: SourceType.Core,
      sourceName: "Tester",
    });
    this.#filler = new Filler(core);
    this.#runner = new Runner(core, this.#spicy);
  }

  async init(provider: StorageProvider): Promise<void> {
    this.#provider = provider;
    await this.#filler.init(provider);
    this.#runner.init(provider);
  }

  registerTask(task: TTask) {
    this.#filler.registerTask(task);
    this.#runner.registerTask(task);

    this.#tasks[task.name] = task;
    const triggersCount = Object.keys(task.triggers).length;

    if (triggersCount > 1 && task.belongsToWorkflow) {
      throw new Error(
        "Current implementation does not support multiple triggers for a task with workflow!",
      );
    }

    const storage = task.belongsToWorkflow
      ? triggersCount > 1
        ? this.#workflowDependentTaskTriggers
        : this.#workflowTaskTriggers
      : triggersCount > 1
      ? this.#dependentTaskTriggers
      : this.#taskTriggers;

    for (const potName in task.triggers) {
      storage[potName] ||= [];
      storage[potName].push(...task.triggers[potName]);
    }

    this.#log.vrb(
      `registered task '${task.name}'${
        task.belongsToWorkflow ? ` of workflow '${task.belongsToWorkflow}'` : ""
      }`,
    );
  }

  registerWorkflow(workflow: TWorkflow) {
    this.#workflows[workflow.name] = workflow;
    workflow.tasks.forEach((task) => this.registerTask(task));
    for (const potName in workflow.triggers) {
      this.#workflowTriggers[potName] ||= [];
      this.#workflowTriggers[potName].push(workflow.triggers[potName]);
    }
  }

  async test(pot: Pot): Promise<boolean> {
    if (pot.type == PotType.Context) {
      return this.#testWorkflowTaskTriggers(pot) ||
        this.#testWorkflowDependedTaskTriggers(pot);
    } else {
      return this.#testTaskTriggers(pot) ||
        await this.#testDependedTaskTriggers(pot) ||
        this.#testWorkflowTriggers(pot) ||
        this.#testWorkflowTaskTriggers(pot) ||
        this.#testWorkflowDependedTaskTriggers(pot);
    }
  }

  #createTaskTriggerHandlerContext(
    potName: string,
    taskName: string,
    slot: number,
    pot: Pot,
  ) {
    return {
      core: this.#core,
      ...this.#spicy,
      allow: (index?: number) => ({
        op: TriggerOperation.Allow,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: TriggerOperation.Deny }),
      log: this.#core.createLogger({
        sourceType: SourceType.Task,
        sourceName: `ON (${[potName]}): ${taskName}`,
      }),
      pot,
    };
  }

  #createWorkflowTaskTriggerHandlerContext(
    potName: string,
    taskName: string,
    slot: number,
    ctx: Pot,
    pot?: Pot,
  ) {
    return {
      core: this.#core,
      ...this.#spicy,
      allow: (index?: number) => ({
        op: TriggerOperation.Allow,
        potIndex: index !== undefined ? index : slot,
      }),
      deny: () => ({ op: TriggerOperation.Deny }),
      log: this.#core.createLogger({
        sourceType: SourceType.Task,
        sourceName: `ON (${[potName]}): ${taskName}`,
      }),
      ctx,
      pot,
    };
  }

  #testTaskTriggers(pot: Pot): boolean {
    const triggers = this.#taskTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found task triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const result = trigger.handler(this.#createTaskTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        pot,
      ));

      if (result.op === TriggerOperation.Allow) {
        this.#log.inf(
          `allow run task '${trigger.taskName}' by pot '${pot.name}'`,
        );

        this.#runner.run(trigger.taskName, [pot]);

        return true;
      } else if (result.op === TriggerOperation.Deny) {
        this.#log.inf(
          `deny run task '${trigger.taskName}' by pot '${pot.name}'`,
        );
        return false;
      }
    }).includes(true);
  }

  async #testDependedTaskTriggers(pot: Pot): Promise<boolean> {
    const triggers = this.#dependentTaskTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(`not found depended task triggers for pot '${pot.name}'`);
      return false;
    }

    for (const trigger of triggers) {
      this.#log.trc(
        `trying to exec depended task trigger handler '${trigger.taskName}' by pot '${pot.name}'...`,
      );

      const triggerContext = this.#createTaskTriggerHandlerContext(
        pot.name,
        trigger.taskName,
        trigger.slot,
        pot,
      );

      const result = trigger.handler(triggerContext);

      if (result.op === TriggerOperation.Allow) {
        this.#log.inf(
          `allow run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );

        const pack = await this.#filler.fill(
          trigger.taskName,
          pot,
          result?.potIndex || 0,
        );

        if (pack) {
          this.#runner.run(pack.taskName, pack.pots);
        }

        return true;
      } else if (result.op === TriggerOperation.Deny) {
        this.#log.inf(
          `deny run depended task '${trigger.taskName}' by pot '${pot.name}'`,
        );
      }
    }
    return false;
  }

  #testWorkflowTriggers(pot: Pot): boolean {
    const triggers = this.#workflowTriggers[pot.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow triggers for pot '${pot.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec trigger handler from workflow '${trigger.workflowName}' by pot '${pot.name}'...`,
      );

      const contextPot = trigger.handler(pot);

      if (!contextPot) {
        this.#log.trc(
          `deny run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
        );
        return false;
      }

      this.#log.vrb(
        `allow run workflow '${trigger.workflowName}' by pot '${pot.name}'`,
      );

      // TODO: переделать
      contextPot.to.task = this.#workflows[trigger.workflowName].firstTaskName;
      contextPot.to.workflow = trigger.workflowName;
      contextPot.from.workflow = trigger.workflowName;
      this.#core.send(contextPot);
      return true;
    }).includes(true);
  }

  #testWorkflowTaskTriggers(ctx: Pot): boolean {
    const triggers = this.#workflowTaskTriggers[ctx.name];

    if (!triggers) {
      this.#log.trc(
        `not found workflow task triggers for pot '${ctx.name}'`,
      );
      return false;
    }

    return triggers.map((trigger) => {
      this.#log.trc(
        `trying to exec workflow '${trigger.belongsToWorkflow}' task trigger handler '${trigger.taskName}' by ctx '${ctx.name}'...`,
      );

      const result = trigger.handler(
        this.#createWorkflowTaskTriggerHandlerContext(
          ctx.name,
          trigger.taskName,
          trigger.slot,
          ctx,
        ),
      );

      if (result.op === TriggerOperation.Allow) {
        this.#log.inf(
          `allow run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by ctx '${ctx.name}'`,
        );
        this.#runner.run(trigger.taskName, [], ctx);
        return true;
      } else if (result.op === TriggerOperation.Deny) {
        this.#log.inf(
          `deny run workflow '${trigger.belongsToWorkflow}' task '${trigger.taskName}' by ctx '${ctx.name}'`,
        );
        return false;
      }
    }).includes(true);
  }

  #testWorkflowDependedTaskTriggers(pot: Pot): boolean {
    return false;
  }

  /** Get info about registered tasks for dashboard */
  getTasksInfo() {
    return Object.entries(this.#tasks).map(([name, task]) => ({
      name,
      belongsToWorkflow: task.belongsToWorkflow,
      triggersCount: Object.keys(task.triggers).length,
      triggers: Object.keys(task.triggers),
    }));
  }

  /** Get info about registered workflows for dashboard */
  getWorkflowsInfo() {
    return Object.entries(this.#workflows).map(([name, workflow]) => ({
      name,
      tasksCount: workflow.tasks.length,
      firstTaskName: workflow.firstTaskName,
    }));
  }
}
