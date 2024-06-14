import type { TTask, TWorkflow } from "$core/types";

export const rwn = (workflow: TWorkflow) =>
  `registered workflow '${workflow.name}'`;

export const rtn$own = (task: TTask) => {
  return `registered task '${task.name}'${
    task.belongsToWorkflow ? ` of workflow '${task.belongsToWorkflow}'` : ""
  }`;
};

const STRS = {
  rwn,
  rtn$own,
};

export default STRS;
