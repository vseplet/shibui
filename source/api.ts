/**
 * Shibui v1.0 Public API
 *
 * This module contains all public API functions:
 * - pot(), context() - data container factories
 * - task(), workflow() - builders
 * - core(), shibui() - core instance creation
 * - execute(), runCI() - execution utilities
 * - chain(), pipe() - composition utilities
 */

import {
  ContextPot,
  Core,
  Pot,
  TaskBuilder,
  WorkflowBuilder,
} from "$shibui/core";
import type {
  ChainConfig,
  Constructor,
  PotClass,
  PotFactory,
  PotInput,
  PotInstance,
  PotLike,
  PotOptions,
  PotWithData,
  TCoreOptions,
  ToPots,
  TPot,
  Transform,
  TSpicy,
  TTaskBuilder,
  TWorkflowBuilder,
} from "$shibui/types";
import { PotType } from "$shibui/types";
import { createRandomContext, exit } from "$helpers";
import {
  TaskFailedEvent,
  TaskFinishedEvent,
  WorkflowFailedEvent,
  WorkflowFinishedEvent,
} from "$shibui/events";
import { delay } from "@std/async";
import { emitters } from "$shibui/emitters";
import { levelName } from "./core/EventDrivenLogger.ts";

// ============================================================================
// Pot Factory (v1.0 API)
// ============================================================================

const UNKNOWN = "unknown";

/**
 * Creates a pot factory for defining data containers
 *
 * @param name - Unique name for this pot type
 * @param defaults - Default values for the data
 * @param options - Optional configuration (ttl, etc.)
 * @returns A pot factory that can create instances
 *
 * @example
 * ```typescript
 * const Counter = pot("Counter", { value: 0 });
 * const instance = Counter.create({ value: 42 });
 *
 * // Use directly with task()
 * task(Counter).name("Task").do(...)
 * ```
 */
export function pot<T extends object>(
  name: string,
  defaults: T,
  options?: PotOptions,
): PotFactory<T> {
  const ttl = options?.ttl ?? 0;

  // Create a dynamic class extending Pot for full TaskBuilder compatibility
  // deno-lint-ignore no-explicit-any
  const DynamicPot = class extends Pot<T & { [key: string]: any }> {
    override type = PotType.Internal;
    override ttl = ttl;
    override data = { ...defaults } as T & { [key: string]: unknown };
  };
  // Set the class name to match pot name
  Object.defineProperty(DynamicPot, "name", { value: name });

  const factory: PotFactory<T> = {
    name,
    defaults,
    ttl,
    _class: DynamicPot as PotClass<T>,

    create(data?: Partial<T>): PotInstance<T> {
      return {
        uuid: crypto.randomUUID(),
        name,
        type: PotType.Internal,
        toc: Date.now(),
        ttl,
        data: { ...defaults, ...data },
        from: { task: UNKNOWN, workflow: UNKNOWN },
        to: { task: UNKNOWN, workflow: UNKNOWN },
      };
    },

    init(data: Partial<T>): PotInstance<T> {
      return this.create(data);
    },
  };

  return factory;
}

/**
 * Context pot factory creator for workflows
 *
 * @param name - Unique name for this context type
 * @param defaults - Default values for the context data
 * @returns A pot factory that creates context pots
 *
 * @example
 * ```typescript
 * const OrderContext = context("OrderContext", { orderId: "", items: [] });
 * workflow(OrderContext).name("ProcessOrder").do(...)
 * ```
 */
export function context<T extends object>(
  name: string,
  defaults: T,
): PotFactory<T> {
  const ttl = 0;

  // Create a dynamic class with PotType.Context
  // deno-lint-ignore no-explicit-any
  const DynamicContextPot = class extends Pot<T & { [key: string]: any }> {
    override type = PotType.Context;
    override ttl = ttl;
    override data = { ...defaults } as T & { [key: string]: unknown };
  };
  Object.defineProperty(DynamicContextPot, "name", { value: name });

  const factory: PotFactory<T> = {
    name,
    defaults,
    ttl,
    _class: DynamicContextPot as PotClass<T>,

    create(data?: Partial<T>): PotInstance<T> {
      return {
        uuid: crypto.randomUUID(),
        name,
        type: PotType.Context,
        toc: Date.now(),
        ttl,
        data: { ...defaults, ...data },
        from: { task: UNKNOWN, workflow: UNKNOWN },
        to: { task: UNKNOWN, workflow: UNKNOWN },
      };
    },

    init(data: Partial<T>): PotInstance<T> {
      return this.create(data);
    },
  };

  return factory;
}

/** CoreStart pot - signals that the core has started */
export const CoreStartPot = pot("CoreStartPot", {});

// ============================================================================
// Chain and Pipe Utilities
// ============================================================================

/**
 * Creates a declarative chain of tasks
 *
 * Tasks are executed in sequence, with each task's output
 * being passed to the next task as input.
 *
 * @param tasks - Task builders to chain together
 * @returns A chain configuration that can be registered with core
 *
 * @example
 * ```typescript
 * const pipeline = chain(
 *   task("Start", Counter).do(({ data, next }) => next([], { value: data.value + 1 })),
 *   task("Double", Counter).do(({ data, next }) => next([], { value: data.value * 2 })),
 *   task("Finish", Counter).do(({ data, log, finish }) => {
 *     log.inf(`Result: ${data.value}`);
 *     return finish();
 *   })
 * );
 * ```
 */
export function chain(...tasks: TTaskBuilder[]): ChainConfig {
  if (tasks.length < 2) {
    throw new Error("chain() requires at least 2 tasks");
  }

  return {
    tasks,
    name: `Chain[${tasks.map((t) => t.task.name).join(" -> ")}]`,
  };
}

/**
 * Creates a functional composition of data transformations
 *
 * Each function receives the output of the previous function.
 * Use this for pure data transformations within a task's do() handler.
 *
 * @param transforms - Transform functions to compose
 * @returns A composed function that applies all transforms in sequence
 *
 * @example
 * ```typescript
 * const transform = pipe(
 *   (d: { value: number }) => ({ value: d.value + 1 }),
 *   (d) => ({ value: d.value * 2 }),
 *   (d) => ({ value: d.value.toString() })
 * );
 *
 * // Usage in task
 * task("Piped", Counter)
 *   .do(({ data, finish }) => finish(transform(data)))
 * ```
 */
export function pipe<A, B>(f1: Transform<A, B>): Transform<A, B>;
export function pipe<A, B, C>(
  f1: Transform<A, B>,
  f2: Transform<B, C>,
): Transform<A, C>;
export function pipe<A, B, C, D>(
  f1: Transform<A, B>,
  f2: Transform<B, C>,
  f3: Transform<C, D>,
): Transform<A, D>;
export function pipe<A, B, C, D, E>(
  f1: Transform<A, B>,
  f2: Transform<B, C>,
  f3: Transform<C, D>,
  f4: Transform<D, E>,
): Transform<A, E>;
export function pipe<A, B, C, D, E, F>(
  f1: Transform<A, B>,
  f2: Transform<B, C>,
  f3: Transform<C, D>,
  f4: Transform<D, E>,
  f5: Transform<E, F>,
): Transform<A, F>;
// deno-lint-ignore no-explicit-any
export function pipe(...transforms: Transform<any, any>[]): Transform<any, any>;
// deno-lint-ignore no-explicit-any
export function pipe(
  ...transforms: Transform<any, any>[]
): Transform<any, any> {
  if (transforms.length === 0) {
    throw new Error("pipe() requires at least 1 transform function");
  }

  return (input) => transforms.reduce((acc, fn) => fn(acc), input);
}

// ============================================================================
// Task and Workflow Builders
// ============================================================================

/** Check if input is a PotFactory */
// deno-lint-ignore no-explicit-any
function isPotFactory(input: PotInput): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "_class" in input &&
    "create" in input;
}

/** Convert PotInput to Constructor */
// deno-lint-ignore no-explicit-any
function toConstructor(input: PotInput): Constructor<Pot<any>> {
  if (isPotFactory(input)) {
    return input._class;
  }
  return input;
}

/**
 * Creates a new task builder
 *
 * @example
 * // With pot() factory (v1.0 - recommended)
 * const Counter = pot("Counter", { value: 0 });
 * task(Counter).name("Task").do(...)
 *
 * // With class (legacy)
 * task(MyPot).name("Task").do(...)
 */
export const task = <
  Sources extends PotInput[],
  CPot extends ContextPot<{}> | undefined = undefined,
>(
  ...sources: Sources
): TaskBuilder<{}, ToPots<Sources>, CPot> => {
  const constructors = sources.map(toConstructor);
  // deno-lint-ignore no-explicit-any
  return new TaskBuilder<{}, ToPots<Sources>, CPot>(...constructors as any);
};

/**
 * Creates a new workflow builder
 *
 * @example
 * // With context() factory (v1.0 - recommended)
 * const OrderCtx = context("OrderCtx", { orderId: "" });
 * workflow(OrderCtx).name("ProcessOrder").do(...)
 *
 * // Without context (auto-generated)
 * workflow().name("SimpleWorkflow").do(...)
 */
// Overloads for proper type inference
export function workflow<CP extends ContextPot<{}>>(
  contextPotConstructor: Constructor<CP>,
): WorkflowBuilder<TSpicy, CP>;
export function workflow<D extends object>(
  contextPotFactory: PotFactory<D>,
): WorkflowBuilder<TSpicy, PotWithData<D>>;
export function workflow(): WorkflowBuilder<TSpicy, ContextPot<{}>>;
// Implementation
export function workflow(
  contextPotSource?: Constructor<ContextPot<{}>> | PotFactory<object>,
): WorkflowBuilder<TSpicy, Pot> {
  return new WorkflowBuilder<TSpicy, Pot>(
    contextPotSource || createRandomContext(ContextPot),
  );
}

// ============================================================================
// Core Creation
// ============================================================================

/**
 * Creates and returns a new instance of ShibuiCore.
 * @param {TCoreOptions} [config={ }] - Configuration for ShibuiCore.
 * @returns {Core} - A new instance of ShibuiCore.
 */
export const core = <S extends TSpicy = {}>(
  config: TCoreOptions<S> = {},
): Core<S> => {
  return new Core<S>(config);
};

/** Alias: shibui = core */
export const shibui = core;

// ============================================================================
// Execution Utilities
// ============================================================================

/** Check if input is a PotFactory */
// deno-lint-ignore no-explicit-any
function isPotFactoryInput(input: PotLike): input is PotFactory<any> {
  return typeof input === "object" && input !== null && "create" in input &&
    "_class" in input;
}

/** Convert PotLike to TPot */
function toPot(input: PotLike): TPot {
  if (isPotFactoryInput(input)) {
    return input.create() as unknown as TPot;
  }
  return input as TPot;
}

/**
 * Executes a task or workflow using the provided builder.
 * @param {TTaskBuilder | TWorkflowBuilder} builder - The task or workflow builder.
 * @param {Array<PotLike>} [pots] - Pot factories, instances, or raw pots.
 * @param {TCoreOptions<S>} [_options] - Core options.
 * @returns {Promise<boolean>} - Returns true if execution is successful, otherwise false.
 *
 * @example
 * const Counter = pot("Counter", { value: 0 });
 * // All these work:
 * await execute(myTask, [Counter]);                    // Factory - auto-creates
 * await execute(myTask, [Counter.create({ value: 5 })]);  // Instance
 */
export const execute = async <S extends TSpicy>(
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<PotLike>,
  options?: TCoreOptions<S>,
): Promise<boolean> => {
  let isComplete = false;
  let isOk = true;

  const tmpCore = new Core(options || {});
  tmpCore.register(builder);

  const finish = () => {
    isComplete = true;
  };

  const fail = () => {
    isComplete = true;
    isOk = false;
  };

  if (builder instanceof TaskBuilder) {
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      TaskFinishedEvent,
      finish,
    );
    tmpCore.emitters.coreEventEmitter.addListenerByName(TaskFailedEvent, fail);
  } else {
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      WorkflowFinishedEvent,
      finish,
    );
    tmpCore.emitters.coreEventEmitter.addListenerByName(
      WorkflowFailedEvent,
      fail,
    );
  }

  await tmpCore.start();
  if (pots) pots.forEach((pot) => tmpCore.send(toPot(pot)));
  while (!isComplete) await delay(0);
  tmpCore.close();
  return isOk;
};

/**
 * Runs a task or workflow in CI mode with simplified logging.
 * Exits with code 0 on success, 1 on failure.
 *
 * @param builder - The task or workflow builder
 * @param pots - Initial pots to send
 */
export const runCI = <S extends TSpicy>(
  builder: TTaskBuilder | TWorkflowBuilder,
  pots?: Array<TPot>,
): void => {
  emitters.logEventEmitter.addListener((event) => {
    if (event.level > 3) {
      if (event.sourceType === "TASK") {
        console.log(
          `${levelName[event.level]} (${event.sourceName}): ${event.msg}`,
        );
      } else if (event.sourceType === "CORE") {
        console.log(`${levelName[event.level]} (SYSTEM): ${event.msg}`);
      }
    }
  });

  execute(builder, pots, {
    storage: "memory",
    logging: false,
  }).then((value) => {
    exit(value ? 0 : 1);
  });
};
