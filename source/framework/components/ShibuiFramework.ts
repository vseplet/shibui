import { middleware } from "../entities/Middleware.ts";
import { plugin } from "../entities/Plugin.ts";
import { ShibuiCore } from "$core/components";

export class ShibuiFramework {
  core = new ShibuiCore();
  plugin = plugin;
  middleware = middleware;
  emitters = this.core.emitters;
  workflow = this.core.workflow;
  task = this.core.task;
}
