import { emitters } from "$shibui/emitters";
import { Dashboard } from "$shibui/dashboard";
import {
  isPotFactory,
  type LoggingProvider,
  type PotFactory,
  type PotInput,
  type PotInstance,
  type TCore,
  type TCoreOptions,
  type TLoggerOptions,
  type ToPots,
  type TPot,
  type TSpicy,
  type TTaskBuilder,
  type TWorkflowBuilder,
} from "$shibui/types";
import {
  ContextPot,
  Distributor,
  EventDrivenLogger,
  type Pot,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/runtime";
import type { Constructor } from "$helpers/types";

// deno-lint-ignore no-explicit-any
function toConstructor(input: PotInput): Constructor<Pot<any>> {
  if (isPotFactory(input)) {
    return input._class;
  }
  return input;
}

export class Core<S extends TSpicy> implements TCore<S> {
  emitters = emitters;

  #globalPotDistributor: Distributor;
  #loggingProvider: LoggingProvider | null;
  #dashboard: Dashboard | null = null;
  #dashboardOptions: { port: number; enabled: boolean } | null = null;

  constructor(options: TCoreOptions<S>) {
    this.#loggingProvider = options.logger;

    this.#globalPotDistributor = new Distributor(
      options.queue,
      options.storage,
      this,
      options.context,
    );

    // Setup dashboard if enabled
    if (options.dashboard) {
      if (typeof options.dashboard === "boolean") {
        this.#dashboardOptions = { port: 3000, enabled: true };
      } else {
        this.#dashboardOptions = {
          port: options.dashboard.port ?? 3000,
          enabled: options.dashboard.enabled ?? true,
        };
      }
    }
  }

  // Overloads for workflow with proper type inference
  workflow<CP extends ContextPot<{}>>(
    contextPotConstructor: Constructor<CP>,
  ): WorkflowBuilder<S, CP>;
  workflow<D extends object>(
    contextPotFactory: PotFactory<D>,
  ): WorkflowBuilder<S, Pot<D>>;
  workflow(): WorkflowBuilder<S, ContextPot<{}>>;
  workflow(
    contextPotSource?: Constructor<ContextPot<{}>> | PotFactory<object>,
  ): WorkflowBuilder<S, Pot> {
    return new WorkflowBuilder<S, Pot>(
      contextPotSource || this.#createRandomContext(),
    );
  }

  #createRandomContext(): Constructor<ContextPot<{}>> {
    // deno-lint-ignore no-explicit-any
    const RandomContext = class extends ContextPot<any> {
      override data = {};
    };
    Object.defineProperty(RandomContext, "name", {
      value: `CONTEXT`,
    });
    return RandomContext as Constructor<ContextPot<{}>>;
  }

  task<Sources extends PotInput[]>(
    ...sources: Sources
  ): TaskBuilder<S, ToPots<Sources>> {
    const constructors = sources.map(toConstructor);
    // deno-lint-ignore no-explicit-any
    return new TaskBuilder<S, ToPots<Sources>>(...constructors as any);
  }

  createLogger = (options: TLoggerOptions): EventDrivenLogger => {
    return new EventDrivenLogger(
      emitters.logEventEmitter,
      this.#loggingProvider,
      options,
    );
  };

  async start() {
    await this.#globalPotDistributor.start();

    // Start dashboard if enabled
    if (this.#dashboardOptions?.enabled) {
      this.#dashboard = new Dashboard(this.#dashboardOptions.port, this);
      this.#dashboard.start();
    }
  }

  register(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.register(builder);
  }

  disable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.disable(builder);
  }

  enable(builder: TTaskBuilder | TWorkflowBuilder) {
    this.#globalPotDistributor.enable(builder);
  }

  /**
   * Send a pot to the core for processing
   * @param potLike - PotFactory (auto-creates), PotInstance, or TPot
   * @param builder - Optional task to route the pot to
   */
  // deno-lint-ignore no-explicit-any
  send(
    potLike: TPot | PotInstance<any> | PotFactory<any>,
    builder?: TTaskBuilder,
  ) {
    // Auto-create if PotFactory
    const pot = (typeof potLike === "object" && "create" in potLike &&
        "_class" in potLike)
      ? potLike.create() as unknown as TPot
      : potLike as TPot;

    if (builder) pot.to.task = builder.task.name;
    this.#globalPotDistributor.send(pot);
  }

  close(): void {
    this.#globalPotDistributor.close();

    // Stop dashboard if running
    if (this.#dashboard) {
      this.#dashboard.stop();
      this.#dashboard = null;
    }
  }

  /** Get current system state for dashboard */
  getState() {
    return this.#globalPotDistributor.getState();
  }
}
