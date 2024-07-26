import shibui from "shibui/framework";
import { CoreStartPot, ContextPot } from "shibui/core/pots";

class SimpleWorkflowContext extends ContextPot<{ message: string }> {
  data = {
    message: "Hello, Simple Workflow!",
  };
}

const workflow = shibui.workflow(SimpleWorkflowContext)
  .name("Simple Workflow")
  .on(CoreStartPot)
  .sq(({ task }) => {
    const t1 = task()
      .name("First Task")
      // deno-lint-ignore require-await
      .do(async ({ ctx, finish, log }) => {
        log.inf(ctx.data.message);
        return finish();
      });

    return t1;
  });

export default workflow;

