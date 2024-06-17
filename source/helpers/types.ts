// deno-lint-ignore-file no-explicit-any
export type Constructor<C> = new () => C;
export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest
  : never;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false;
