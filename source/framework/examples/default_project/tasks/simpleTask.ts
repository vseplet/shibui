import shibui from "shibui/framework";
import { CronJobPot } from "../pots/CronJobPot.ts";

const task = shibui.task(CronJobPot)
  .name("Simple Task")
  .on(CronJobPot)
  // deno-lint-ignore require-await
  .do(async ({ finish, log }) => {
    log.inf("Hello, Simple Task!");
    return finish();
  });

export default task;
