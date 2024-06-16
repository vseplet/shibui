import type { Constructor } from "$helpers/types";
import type {
  TNewTaskBuilder,
  TNewWorkflow,
  TNewWorkflowBuilder,
  TSpicy,
} from "$core/types";
import type { Pot } from "$core/entities";
import type { TaskBuilder } from "./TaskBuilder.ts";

export class WorkflowBuilder<Spicy extends TSpicy, CPot extends Pot>
  implements TNewWorkflowBuilder {
  workflow: TNewWorkflow = {
    name: "unknown",
    firstTaskName: "",
    triggers: {},
    tasks: [],
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
      ) => TaskBuilder<Spicy, [CPot, ...Pots], CPot>;
    }) => TNewTaskBuilder,
  ) {
    this.workflow.firstTaskName = _cb({} as any).task.name;
    return this;
  }

  build() {
    return this.workflow;
  }
}
