import { Hono } from "@hono/hono";
import { basic, component, html, morph } from "@vseplet/morph";
import { emitters } from "$shibui/emitters";
import type { LogEvent } from "$shibui/events";

export class Dashboard {
  #port: number;
  #server: AbortController | null = null;
  #logs: string[] = [];
  #lastFetchedIndex = 0;
  #core: any; // Reference to Core instance

  constructor(port = 3000, core?: any) {
    this.#port = port;
    this.#core = core;
  }

  start() {
    // Dashboard page component
    const dashboardPage = component(() =>
      html`
        <div class="dashboard">
          <div class="header">
            <h1>🎯 Shibui Dashboard</h1>
            <span class="status">Connected</span>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h2>📋 Tasks</h2>
              <div
                id="tasks-content"
                hx-get="/state/tasks"
                hx-trigger="load, every 2s"
                hx-swap="innerHTML"
              >
                Loading...
              </div>
            </div>

            <div class="info-section">
              <h2>🔄 Workflows</h2>
              <div
                id="workflows-content"
                hx-get="/state/workflows"
                hx-trigger="load, every 2s"
                hx-swap="innerHTML"
              >
                Loading...
              </div>
            </div>

            <div class="info-section queue-section">
              <h2>📦 Queue</h2>
              <div
                id="queue-content"
                hx-get="/state/queue"
                hx-trigger="load, every 500ms"
                hx-swap="innerHTML"
              >
                Loading...
              </div>
            </div>
          </div>

          <div class="logs-section">
            <h2>📝 Logs</h2>
            <div class="logs-container">
              <div id="logs-wrapper">
                <div
                  id="logs-polling"
                  hx-get="/logs"
                  hx-trigger="load, every 500ms"
                  hx-swap="afterbegin"
                  hx-target="#logs-content"
                >
                </div>
                <div id="logs-content"></div>
              </div>
            </div>
          </div>
        </div>

        <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
            sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          padding: 20px;
        }
        .header {
          background: #161b22;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #30363d;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          color: #58a6ff;
        }
        h2 {
          font-size: 16px;
          font-weight: 600;
          color: #58a6ff;
          margin-bottom: 12px;
        }
        .status {
          padding: 4px 12px;
          background: #238636;
          color: white;
          border-radius: 12px;
          font-size: 12px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-section {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 16px;
        }
        .task-item, .workflow-item, .pot-item {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
        }
        .task-item:last-child, .workflow-item:last-child, .pot-item:last-child {
          margin-bottom: 0;
        }
        .task-name, .workflow-name, .pot-name {
          font-weight: 600;
          color: #58a6ff;
          margin-bottom: 4px;
        }
        .task-detail, .workflow-detail, .pot-detail {
          font-size: 12px;
          color: #8b949e;
        }
        .queue-count {
          font-size: 14px;
          color: #58a6ff;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .logs-section {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 16px;
        }
        .logs-container {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 16px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 13px;
          line-height: 1.6;
          max-height: 80vh;
          overflow-y: auto;
        }
        .log-entry {
          padding: 8px 0;
          border-bottom: 1px solid #21262d;
        }
        .log-entry:last-child {
          border-bottom: none;
        }
        .log-time {
          color: #8b949e;
          margin-right: 12px;
        }
        .log-level {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 8px;
        }
        .log-level.trace {
          background: #6e7681;
          color: #fff;
        }
        .log-level.debug {
          background: #388bfd;
          color: #fff;
        }
        .log-level.verbose {
          background: #58a6ff;
          color: #fff;
        }
        .log-level.info {
          background: #238636;
          color: #fff;
        }
        .log-level.warn {
          background: #d29922;
          color: #000;
        }
        .log-level.error {
          background: #da3633;
          color: #fff;
        }
        .log-level.fatal {
          background: #f85149;
          color: #fff;
        }
        .log-source {
          color: #58a6ff;
          margin-right: 8px;
        }
        .log-message {
          color: #c9d1d9;
        }
        </style>
      `
    );

    // Create morph website
    const website = morph
      .layout(
        basic({
          title: "Shibui Dashboard",
          htmx: true,
        }),
      )
      .page("/", dashboardPage);

    // Create Hono app
    const app = new Hono();

    // Setup log event listener
    const listener = (event: LogEvent<unknown>) => {
      try {
        const time = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const level = this.#getLevelName(event.level).toLowerCase();

        const logHTML =
          `<div class="log-entry"><span class="log-time">${time}</span><span class="log-level ${level}">${
            this.#getLevelName(event.level)
          }</span><span class="log-source">[${
            this.#getSourceTypeName(Number(event.sourceType))
          }] ${event.sourceName}</span><span class="log-message">${event.msg}</span></div>`;

        this.#logs.unshift(logHTML);

        // Keep only last 1000 logs
        if (this.#logs.length > 1000) {
          this.#logs.pop();
        }
      } catch (err) {
        console.error("Error processing log event:", err);
      }
    };

    emitters.logEventEmitter.addListener(listener);

    console.log("🎧 Event listener registered");

    // Add test log
    this.#logs.push(
      '<div class="log-entry"><span class="log-time">--:--:--</span><span class="log-level info">INFO</span><span class="log-source">[CORE] Dashboard</span><span class="log-message">Dashboard started successfully</span></div>',
    );

    // Endpoint to fetch new logs
    app.get("/logs", (c) => {
      const currentIndex = parseInt(c.req.query("index") || "0");

      // Only return logs that haven't been sent yet
      if (currentIndex >= this.#logs.length) {
        return c.text("");
      }

      const newLogs = this.#logs.slice(0, this.#logs.length - currentIndex);

      if (newLogs.length === 0) {
        return c.text("");
      }

      return c.html(newLogs.join(""));
    });

    // Endpoint to get tasks info
    app.get("/state/tasks", (c) => {
      if (!this.#core) {
        return c.html('<div class="task-detail">No tasks registered</div>');
      }

      const state = this.#core.getState();
      const tasks = state.tasks || [];

      if (tasks.length === 0) {
        return c.html('<div class="task-detail">No tasks registered</div>');
      }

      const html = tasks
        .map(
          (task: any) => `
        <div class="task-item">
          <div class="task-name">${task.name}</div>
          <div class="task-detail">
            Triggers: ${task.triggers.join(", ") || "none"}
            ${task.belongsToWorkflow ? ` | Workflow: ${task.belongsToWorkflow}` : ""}
          </div>
        </div>
      `,
        )
        .join("");

      return c.html(html);
    });

    // Endpoint to get workflows info
    app.get("/state/workflows", (c) => {
      if (!this.#core) {
        return c.html('<div class="workflow-detail">No workflows registered</div>');
      }

      const state = this.#core.getState();
      const workflows = state.workflows || [];

      if (workflows.length === 0) {
        return c.html('<div class="workflow-detail">No workflows registered</div>');
      }

      const html = workflows
        .map(
          (workflow: any) => `
        <div class="workflow-item">
          <div class="workflow-name">${workflow.name}</div>
          <div class="workflow-detail">
            Tasks: ${workflow.tasksCount} | First: ${workflow.firstTaskName}
          </div>
        </div>
      `,
        )
        .join("");

      return c.html(html);
    });

    // Endpoint to get queue info
    app.get("/state/queue", (c) => {
      if (!this.#core) {
        return c.html('<div class="pot-detail">Queue unavailable</div>');
      }

      const state = this.#core.getState();
      const queue = state.queue || { length: 0, pots: [] };

      let html = `<div class="queue-count">Pots in queue: ${queue.length}</div>`;

      if (queue.length === 0) {
        html += '<div class="pot-detail">Queue is empty</div>';
      } else {
        html += queue.pots
          .map(
            (pot: any) => `
          <div class="pot-item">
            <div class="pot-name">${pot.name}</div>
            <div class="pot-detail">
              Type: ${pot.type} | UUID: ${pot.uuid.substring(0, 8)}...
            </div>
          </div>
        `,
          )
          .join("");
      }

      return c.html(html);
    });

    // Serve morph pages (must be last)
    app.all("/*", (c) => website.fetch(c.req.raw));

    console.log(
      `\n🎯 Shibui Dashboard running at http://localhost:${this.#port}\n`,
    );

    // Start Deno HTTP server
    const controller = new AbortController();
    this.#server = controller;

    Deno.serve(
      {
        port: this.#port,
        signal: controller.signal,
        onListen: () => {},
      },
      app.fetch,
    );
  }

  stop() {
    // Stop HTTP server
    if (this.#server) {
      this.#server.abort();
      this.#server = null;
    }

    // Clear logs
    this.#logs = [];
  }

  #getLevelName(level: number): string {
    const levels: { [key: number]: string } = {
      0: "TRACE",
      1: "DEBUG",
      2: "VERBOSE",
      3: "INFO",
      4: "WARN",
      5: "ERROR",
      6: "FATAL",
    };
    return levels[level] || "UNKNOWN";
  }

  #getSourceTypeName(sourceType: number): string {
    const types: { [key: number]: string } = {
      0: "CORE",
      1: "TASK",
      2: "WORKFLOW",
    };
    return types[sourceType] || "UNKNOWN";
  }
}
