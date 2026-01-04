import type { TPot } from "$shibui/types";
import { PotType, UNKNOWN_TARGET } from "$shibui/types";

export class Pot<
  D extends { [key: string]: unknown } = { [key: string]: unknown },
> implements TPot {
  toc: number = new Date().getTime();
  uuid: `${string}-${string}-${string}-${string}-${string}` = crypto
    .randomUUID();
  name = this.constructor.name;

  type = PotType.Unknown;
  from: { workflow: string; task: string } = {
    workflow: UNKNOWN_TARGET,
    task: UNKNOWN_TARGET,
  };
  to: { workflow: string; task: string } = {
    workflow: UNKNOWN_TARGET,
    task: UNKNOWN_TARGET,
  };
  ttl = 0;
  data: D = {} as D; // late init

  constructor(
    _setupArgs?: Partial<
      Omit<
        TPot,
        "timeOfCreation" | "type" | "name" | "uuid" | "from" | "to" | "ttl"
      >
    >,
  ) {
  }

  setup(
    _initArgs: Partial<
      Omit<
        TPot,
        "timeOfCreation" | "type" | "name" | "uuid" | "from" | "to" | "ttl"
      >
    >,
  ): this {
    return this;
  }

  deserialize(jsonObj: TPot): Pot<D> {
    this.toc = jsonObj.toc;
    this.uuid = jsonObj.uuid;
    this.name = jsonObj.name;
    this.type = jsonObj.type;

    this.from = jsonObj.from;
    this.to = jsonObj.to;
    this.ttl = jsonObj.ttl;

    this.data = jsonObj.data as D;

    return this;
  }

  copy(partialData?: Partial<D>): Pot<D> {
    // @ts-ignore: constructor type is correct at runtime but TS can't infer it
    const copy = new this.constructor();
    copy.name = this.name;
    copy.type = this.type;
    copy.init(self.structuredClone(this.data));
    // TODO: optimize this workaround
    if (partialData) {
      copy.init(self.structuredClone(partialData));
    }
    return copy;
  }

  init(partialData: Partial<D>): this {
    Object.keys(partialData).forEach((key) => {
      const typedKey = key as keyof D;
      if (partialData[typedKey] !== undefined) {
        this.data[typedKey] = partialData[typedKey] as D[keyof D];
      }
    });

    return this;
  }
}

export class ContextPot<T extends { [key: string]: unknown }> extends Pot<T> {
  override type = PotType.Context;
}
