import { SError } from "$shibui/entities";

export class TaskNameMissingError extends SError {
  constructor() {
    super("Task name is required for task building!");
  }
}
