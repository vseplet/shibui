import shibui from "shibui/framework";
import { Cron } from "https://deno.land/x/croner@6.0.3/dist/croner.js";
import { CronJobPot } from "../pots/CronJobPot.ts";

export default shibui.plugin("cron", ({ core, log }) => {
  log.inf("Hello, Cron!");

  const pattern = "* * * * *";
  const job = new Cron(pattern, { timezone: "Europe/Moscow" }, () => {
    core.send(new CronJobPot().init({
      pattern,
      target: "SimpleTask",
    }));
  });
});
