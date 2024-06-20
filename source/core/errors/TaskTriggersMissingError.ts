import { SError } from "$core/entities";

export class TaskTriggersMissingError extends SError {
  constructor() {
    super("Task triggers are missing!");
  }
}
