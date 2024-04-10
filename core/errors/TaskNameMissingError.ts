import { ShibuiError } from "../entities/ShibuiError.ts";

export class TaskNameMissingError extends ShibuiError {
  constructor() {
    super("Task name is required for task building!");
  }
}
