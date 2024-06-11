import { ShibuiError } from "$core/entities";

export class TaskNameMissingError extends ShibuiError {
  constructor() {
    super("Task name is required for task building!");
  }
}
