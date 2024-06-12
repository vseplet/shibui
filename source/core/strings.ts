import type { ITask, type } from "$core/types";

export const rwn = (workflow: type) => `registered workflow '${workflow.name}'`;

export const rtn$own = (task: ITask) => {
  return `registered task '${task.name}'${
    task.belongsToWorkflow ? ` of workflow '${task.belongsToWorkflow}'` : ""
  }`;
};

const STRS = {
  rwn,
  rtn$own,
};

export default STRS;
