import type { Constructor } from "$helpers/types";
import type { TSpicy } from "$core/types";
import type { NewTaskBuilder, TNewTaskBuilder } from "./NewTaskBuilder.ts";
import type { Pot } from "$core/entities";

export type TNewWorkflow = {
  name: string;
  firstTaskName: string;
};

export type TNewWorkflowBuilder = {
  workflow: TNewWorkflow;
};

export class NewWorkflowBuilder<Spicy extends TSpicy, CPot extends Pot>
  implements TNewWorkflowBuilder {
  workflow: TNewWorkflow = {
    name: "unknown",
    firstTaskName: "",
  };

  constructor(
    public ctxPotConstructor: Constructor<CPot>,
  ) {
  }

  name(name: string | TemplateStringsArray) {
    if (name instanceof Array) {
      this.workflow.name = name[0];
    } else {
      this.workflow.name = name;
    }

    return this;
  }

  // triggers(
  //   ...constructorList: Array<
  //     Constructor<TPot>
  //   >
  // ) {
  //   for (const constructor of constructorList) {
  //     this.workflow.triggers[constructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor: constructor,
  //       handler: () => {
  //         return new this.contextPotConstructor();
  //       },
  //     };
  //   }

  //   return this;
  // }

  // on<T extends TPot>(
  //   potConstructor: Constructor<T>,
  //   handler?: TWorkflowTriggerHandler<ContextPot, T, S>,
  // ) {
  //   if (handler) {
  //     this.workflow.triggers[potConstructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor,
  //       handler,
  //     };
  //   } else {
  //     this.workflow.triggers[potConstructor.name] = {
  //       workflowName: this.workflow.name,
  //       potConstructor,
  //       handler: () => {
  //         return new this.contextPotConstructor();
  //       },
  //     };
  //   }

  //   return this;
  // }

  sq(
    _cb: (args: {
      task: <Pots extends Pot[]>(
        ...potConstructors: { [K in keyof Pots]: Constructor<Pots[K]> }
      ) => NewTaskBuilder<Spicy, [CPot, ...Pots], CPot>;
    }) => TNewTaskBuilder,
  ) {
    this.workflow.firstTaskName = _cb({} as any).task.name;
    return this;
  }
}
