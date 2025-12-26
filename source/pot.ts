/*
 * Copyright 2024 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 */

import { Pot } from "./entities/Pot.ts";
import { PotType } from "./types.ts";

/**
 * Pot Factory - simplified way to create data containers (v1.0 API)
 *
 * @example
 * ```typescript
 * const Counter = pot("Counter", { value: 0 });
 * const Message = pot("Message", { text: "", from: "" }, { ttl: 100 });
 *
 * // Create instance
 * const counter = Counter.create({ value: 42 });
 *
 * // Use directly with task() - no ._class needed!
 * task(Counter).name("Task").do(...)
 * ```
 */

/** Options for pot creation */
export interface PotOptions {
  /** Time-to-live for the pot (number of processing attempts) */
  ttl?: number;
}

/** Runtime pot instance - compatible with TPot */
export interface PotInstance<T> {
  /** Unique identifier */
  uuid: `${string}-${string}-${string}-${string}-${string}`;
  /** Pot name */
  name: string;
  /** Pot type */
  type: PotType;
  /** Time of creation */
  toc: number;
  /** Time-to-live */
  ttl: number;
  /** Actual data */
  data: T;
  /** Routing: where this pot came from */
  from: {
    task: string;
    workflow: string;
  };
  /** Routing: where this pot should go */
  to: {
    task: string;
    workflow: string;
  };
}

/** Pot factory returned by pot() function */
export interface PotFactory<T extends object> {
  /** Type name for identification */
  readonly name: string;
  /** Default values */
  readonly defaults: T;
  /** TTL setting */
  readonly ttl: number;
  /** Create a new pot instance with optional data override */
  create(data?: Partial<T>): PotInstance<T>;
  /** Initialize existing data (for compatibility) */
  init(data: Partial<T>): PotInstance<T>;
  /** Internal: class constructor for TaskBuilder compatibility */
  readonly _class: PotClass<T>;
}

/** Internal Pot class type for TaskBuilder compatibility */
// deno-lint-ignore no-explicit-any
export type PotClass<T extends object> = new () => Pot<T & { [key: string]: any }>;

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

/** Type helper to extract data type from a pot factory */
export type PotData<F> = F extends PotFactory<infer T> ? T : never;

/** Type helper to extract pot instance type from a pot factory */
export type PotOf<F> = F extends PotFactory<infer T> ? PotInstance<T> : never;

// Built-in system pots

/** CoreStart pot - signals that the core has started */
export const CoreStartPot = pot("CoreStartPot", {});

/** Context pot factory creator for workflows */
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
  // Note: No "Context:" prefix - cleaner API

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
        from: { task: "unknown", workflow: "unknown" },
        to: { task: "unknown", workflow: "unknown" },
      };
    },

    init(data: Partial<T>): PotInstance<T> {
      return this.create(data);
    },
  };

  return factory;
}
