import { SError } from "$core/entities";

export class TaskNameMissingError extends SError {
  constructor() {
    super("Task name is required for task building!");
  }
}
