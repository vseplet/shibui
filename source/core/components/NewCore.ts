import {
  SourceType,
  TCoreOptions,
  TPot,
  type TSpicy,
  TWorkflowBuilder,
} from "$core/types";
import type { Constructor } from "$helpers/types";
import { NewTaskBuilder, TNewTaskBuilder } from "../entities/NewTaskBuilder.ts";
import {
  NewWorkflowBuilder,
  TNewWorkflowBuilder,
} from "../entities/NewWorkflowBuilder.ts";
import type { Pot } from "../entities/Pot.ts";
import type { ContextPot } from "$core/pots";
import { emitters } from "$core/emitters";
import { Distributor } from "$core/components";

export class NewCore<Spicy extends TSpicy> {
  emitters = emitters;

  // #globalPotDistributor: Distributor<Spicy>;
  // settings = {
  //   DEFAULT_LOGGING_ENABLED: true,
  //   DEFAULT_LOGGING_LEVEL: 0,
  //   ALLOWED_LOGGING_SOURCE_TYPES: [
  //     SourceType.CORE,
  //     SourceType.TASK,
  //     SourceType.WORKFLOW,
  //     SourceType.FRAMEWORK,
  //     SourceType.UNKNOWN,
  //     SourceType.PLUGIN,
  //   ],
  // };

  // constructor(config: TCoreOptions<Spicy>) {
  //   this.#globalPotDistributor = new Distributor<S>(this);
  // }

  // constructor(
  //   public options: {
  //     useKV?: boolean;
  //     spicy: Spicy;
  //   },
  // ) {}

  public task<Pots extends Pot[]>(
    ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
  ) {
    return new NewTaskBuilder<Spicy, Pots>(...potConstructors);
  }

  public workflow<CTX extends ContextPot<{}>>(
    ctxPotConstructor: Constructor<CTX>,
  ) {
    return new NewWorkflowBuilder<Spicy, CTX>(ctxPotConstructor);
  }

  // async start() {
  //   await this.#globalPotDistributor.start();
  // }

  register(builder: TNewTaskBuilder | TNewWorkflowBuilder) {
    // this.#globalPotDistributor.register(builder);
  }

  disable(builder: TNewTaskBuilder | TWorkflowBuilder) {
    // this.#globalPotDistributor.disable(builder);
  }

  enable(builder: TNewTaskBuilder | TWorkflowBuilder) {
    // this.#globalPotDistributor.enable(builder);
  }

  send(pot: TPot, builder?: TNewTaskBuilder) {
    if (builder) pot.to.task = builder.task.name;
    // this.#globalPotDistributor.send(pot);
  }
}
