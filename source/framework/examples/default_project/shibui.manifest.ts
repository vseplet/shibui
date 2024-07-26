// plugins
import $1 from "./plugins/cron.ts";
// tasks
import $2 from "./tasks/simpleTask.ts";
// workflows
import $3 from "./workflows/simpleWorkflow.ts";


export default {
  plugins: {
    "./plugins/cron.ts": $1,
  },
  tasks: {
    "./tasks/simpleTask.ts": $2,
  },
  workflows: {
    "./workflows/simpleWorkflow.ts": $3,
  },
  baseUrl: import.meta.url,
}
