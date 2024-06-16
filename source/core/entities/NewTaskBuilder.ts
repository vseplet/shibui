// deno-lint-ignore-file require-await no-explicit-any
import { Pot } from "$core/entities";
import type { Constructor, Equal, Tail } from "$helpers/types";
import type { TPot, TSpicy, TTaskBuilder, TTriggerOp } from "$core/types";
import type { TNewWorkflowBuilder } from "./NewWorkflowBuilder.ts";
import { TaskNameMissingError } from "$core/errors";
import type { EventDrivenLogger } from "$core/components";

type TNewOnHandlerResult = {
  op: "ALLOW";
  potIndex?: number;
} | {
  op: "DENY";
};

type TNewOnHandlerContext<Spicy, CtxPot, TriggerPot> =
  & Spicy
  & (CtxPot extends undefined ? { pot: TriggerPot }
    : Equal<TriggerPot, CtxPot> extends true ? { ctx: CtxPot }
    : { ctx: CtxPot; pot: TriggerPot })
  & {
    log: EventDrivenLogger;
    allow: (index?: number) => {
      op: "ALLOW";
      potIndex?: number;
    };
    deny: () => {
      op: "DENY";
    };
  };

type TNewTaskTriggerHandler<Spicy, CtxPot, TriggerPot> = (
  args: TNewOnHandlerContext<Spicy, CtxPot, TriggerPot>,
) => TNewOnHandlerResult;

type TNewTaskTrigger<Spicy, CTX, TP> = {
  taskName: string;
  potConstructor: Constructor<Pot>;
  slot: number;
  handler: TNewTaskTriggerHandler<Spicy, CTX, TP>;
  belongsToWorkflow: string | undefined;
};

type TNewAnyTaskTrigger = TNewTaskTrigger<any, any, any>;

type TNewDoHandlerResult =
  | {
    op: "NEXT";
    taskBuilders: Array<TTaskBuilder>;
    data?: Partial<TPot["data"]>;
  }
  | {
    op: "FAIL";
    reason: string;
  }
  | {
    op: "FINISH";
  }
  | {
    op: "REPEAT";
    data?: Partial<TPot["data"]>;
  };

type TNewDoHandlerContext<Spicy, CtxPot, Pots extends Pot[]> =
  & Spicy
  & (CtxPot extends undefined ? { pots: Pots }
    : { ctx: CtxPot; pots: Tail<Pots> })
  & {
    log: EventDrivenLogger;
    next: () => {
      op: "NEXT";
    };
    finish: () => {
      op: "FINISH";
    };
    fail: () => {
      op: "FAIL";
    };
    repeat: () => {
      op: "REPEAT";
    };
  };

type TNewTaskDoHandler<Spicy, CtxPot, Pots extends Pot[]> = (
  args: TNewDoHandlerContext<Spicy, CtxPot, Pots>,
) => Promise<TNewDoHandlerResult>;

type TNewAnyTaskDoHandler = TNewTaskDoHandler<any, any, any>;

type TNewTask = {
  name: string;
  attempts: number;
  timeout: number;
  slotsCount: number;
  belongsToWorkflow: string | undefined;
  triggers: { [key: string]: Array<TNewAnyTaskTrigger> };
  do: TNewAnyTaskDoHandler;
};

export type TNewTaskBuilder = {
  task: TNewTask;
  build(): TNewTask;
};

export class NewTaskBuilder<
  Spicy extends TSpicy,
  Pots extends Pot[],
  CTX extends Pot | undefined = undefined,
> {
  task: TNewTask = {
    name: "unknown",
    attempts: 1,
    timeout: 0,
    slotsCount: 0,
    belongsToWorkflow: undefined,
    triggers: {},
    do: async () => {
      throw new Error("not implemented");
    },
  };

  constructor(
    ..._constructors: { [K in keyof Pots]: Constructor<Pots[K]> }
  ) {
    if (arguments.length > 5) throw new Error("over 5 pots!");
    this.task.slotsCount =
      Array.from(arguments).filter((arg) => arg !== undefined).length;
  }

  belongsToWorkflow(builder: TNewWorkflowBuilder) {
    this.task.belongsToWorkflow = builder.workflow.name;
    return this;
  }

  name(name: string | TemplateStringsArray) {
    const workflowPrefix = this.task.belongsToWorkflow
      ? `[${this.task.belongsToWorkflow}] `
      : "";
    if (name instanceof Array) {
      this.task.name = workflowPrefix + name[0];
    } else {
      this.task.name = workflowPrefix + name;
    }

    for (const potName in this.task.triggers) {
      this.task.triggers[potName].forEach((trigger) =>
        trigger.taskName = this.task.name
      );
    }

    return this;
  }

  attempts(count: number) {
    this.task.attempts = count;
    return this;
  }

  timeout(ms: number) {
    this.task.timeout = ms;
    return this;
  }

  triggers(
    ..._constructors: Pots
  ) {
    for (const constructor of arguments) {
      if (
        !this.task
          .triggers[constructor.name]
      ) {
        this.task
          .triggers[constructor.name] = [];
      }

      this.task.triggers[constructor.name].push({
        taskName: this.task.name,
        potConstructor: constructor,
        slot: Object.keys(this.task.triggers).length - 1,
        handler: ({ allow }) => allow(),
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  on<TP extends Pots[number]>(
    pot: Constructor<TP>,
    handler?: TNewTaskTriggerHandler<Spicy, CTX, TP>,
    slot?: number,
  ) {
    if (
      !this.task
        .triggers[pot.name]
    ) {
      this.task
        .triggers[pot.name] = [];
    }

    if (handler) {
      this.task.triggers[pot.name].push({
        taskName: this.task.name,
        potConstructor: pot,
        slot: Object.keys(this.task.triggers).length - 1,
        handler,
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    } else {
      this.task.triggers[pot.name].push({
        taskName: this.task.name,
        potConstructor: pot,
        slot: slot || Object.keys(this.task.triggers).length - 1,
        handler: ({ allow }) => allow(),
        belongsToWorkflow: this.task.belongsToWorkflow,
      });
    }

    return this;
  }

  onRule<TP extends Pots[number]>(
    rule: "ForThisTask" | "ForAnyTask" | "ForUnknown",
    potConstructor: Constructor<TP>,
    slot?: number,
  ) {
    let handler;

    if (
      !this.task
        .triggers[potConstructor.name]
    ) {
      this.task
        .triggers[potConstructor.name] = [];
    }

    if (rule === "ForThisTask") {
      handler = (
        { allow, deny, pot }: TNewOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        return pot.to.task === this.task.name ? allow() : deny();
      };
    } else if (rule == "ForAnyTask") {
      handler = (
        { allow, deny, pot }: TNewOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        return pot.to.task !== this.task.name &&
            pot.to.task !== "unknown"
          ? allow()
          : deny();
      };
    } else if (rule == "ForUnknown") {
      handler = (
        { allow, deny, pot }: TNewOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        return pot.to.task === "unknown" ? allow() : deny();
      };
    } else {
      handler = (
        { deny }: TNewOnHandlerContext<Spicy, CTX, TP>,
      ) => {
        return deny();
      };
    }

    this.task.triggers[potConstructor.name].push({
      taskName: this.task.name,
      potConstructor,
      slot: slot || this.task.triggers[potConstructor.name].length,
      handler,
      belongsToWorkflow: this.task.belongsToWorkflow,
    });

    return this;
  }

  do(
    handler: TNewTaskDoHandler<Spicy, CTX, Pots>,
  ) {
    this.task.do = handler;
    return this;
  }

  strategy() {
    return this;
  }

  onFail(_handler: (error: Error) => void) {
    return this;
  }

  build(): TNewTask {
    if (this.task.name == "unknown") {
      throw new TaskNameMissingError();
    }

    if (Object.keys(this.task.triggers).length == 0) {
      throw new Error();
    }

    return this.task;
  }
}

class P1 extends Pot {
  a = 10;
}

class P2 extends Pot {
  b = 20;
}

class P3 extends Pot {
  c = 20;
}

class P4 extends Pot {
  f = 20;
}

const task = new NewTaskBuilder(P1, P2, P3)
  .name("its facking hell")
  .do(async ({ pots, finish, log }) => {
    const [p1, p2, p3] = pots;
    log.dbg(`${p1.a} ${p2.b} ${p3.c}`);
    return finish();
  })
  .build();

console.log(task);
