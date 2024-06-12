import core from "$core";
import { middleware } from "../entities/Middleware.ts";
import { plugin } from "../entities/Plugin.ts";

export class ShibuiFramework {
  core = core({});
  emitters = this.core.emitters;
  workflow = this.core.workflow;
  task = this.core.task;
  middleware = middleware;
  plugin = plugin;
}
