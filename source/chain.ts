/*
 * Copyright 2024 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 */

/**
 * Chain and Pipe utilities for v1.0 API
 *
 * @example
 * ```typescript
 * // chain() - declarative task chains
 * const pipeline = chain(
 *   task("Start", Counter).do(({ data }) => ({ value: data.value + 1 })),
 *   task("Double", Counter).do(({ data }) => ({ value: data.value * 2 })),
 *   task("Log", Counter).do(({ data, log, finish }) => {
 *     log.inf(`Result: ${data.value}`);
 *     return finish();
 *   })
 * );
 *
 * // pipe() - functional composition
 * const transform = pipe(
 *   (d) => ({ value: d.value + 1 }),
 *   (d) => ({ value: d.value * 2 })
 * );
 * ```
 */

import type { TTaskBuilder } from "$shibui/types";

/**
 * Chain configuration returned by chain()
 */
export interface ChainConfig {
  /** List of task builders in order */
  readonly tasks: TTaskBuilder[];
  /** Name of the chain */
  readonly name: string;
}

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
 * Transform function type for pipe()
 */
export type Transform<In, Out> = (input: In) => Out;

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
