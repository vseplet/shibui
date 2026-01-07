import { Hono } from "@hono/hono";
import { streamSSE } from "@hono/hono/streaming";
import { basic, component, html, morph } from "@vseplet/morph";
import { emitters } from "$shibui/emitters";
import type { CoreEvent, LogEvent } from "$shibui/events";

export class Dashboard {
  #port: number;
  #server: AbortController | null = null;

  // State storage for sending to new SSE clients
  #tasks: Map<string, { taskName: string; triggers: string[]; belongsToWorkflow?: string }> = new Map();
  #workflows: Map<string, { workflowName: string; tasksCount: number; firstTaskName: string }> = new Map();

  constructor(port = 3000) {
    this.#port = port;
    this.#setupStateListeners();
  }

  #setupStateListeners() {
    // Listen to core events to maintain state
    // Note: BroadcastChannel serializes events, so instanceof checks don't work
    // We use event.name instead
    emitters.coreEventEmitter.addListener((event: CoreEvent) => {
      const e = event as CoreEvent & Record<string, unknown>;
      if (e.name === "TaskRegisteredEvent") {
        this.#tasks.set(e.taskName as string, {
          taskName: e.taskName as string,
          triggers: e.triggers as string[],
          belongsToWorkflow: e.belongsToWorkflow as string | undefined,
        });
      } else if (e.name === "WorkflowRegisteredEvent") {
        this.#workflows.set(e.workflowName as string, {
          workflowName: e.workflowName as string,
          tasksCount: e.tasksCount as number,
          firstTaskName: e.firstTaskName as string,
        });
      }
      // Pot events are handled in SSE stream directly, no need to store state
    });
  }

  start() {
    // Dashboard page component
    const dashboardPage = component(() =>
      html`
        <div class="dashboard">
          <div class="header">
            <h1>Shibui Dashboard</h1>
            <span class="status" id="connection-status">Connecting...</span>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h2>Tasks</h2>
              <div id="tasks-content">
                <div class="empty-state">Waiting for tasks...</div>
              </div>
            </div>

            <div class="info-section">
              <h2>Workflows</h2>
              <div id="workflows-content">
                <div class="empty-state">Waiting for workflows...</div>
              </div>
            </div>

            <div class="info-section">
              <h2>Pot Events</h2>
              <div class="pot-events-container" id="pot-events-content"></div>
            </div>
          </div>

          <div class="logs-section">
            <h2>Logs</h2>
            <div class="logs-container" id="logs-content"></div>
          </div>
        </div>

        <script>
          // State
          const state = {
            tasks: new Map(),
            workflows: new Map(),
          };

          // SSE connection
          const evtSource = new EventSource('/events');

          evtSource.onopen = () => {
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').classList.add('connected');
          };

          evtSource.onerror = () => {
            document.getElementById('connection-status').textContent = 'Disconnected';
            document.getElementById('connection-status').classList.remove('connected');
          };

          evtSource.addEventListener('log', (e) => {
            const data = JSON.parse(e.data);
            const logsEl = document.getElementById('logs-content');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = \`<span class="log-time">\${data.time}</span><span class="log-level \${data.level.toLowerCase()}">\${data.level}</span><span class="log-source">[\${data.sourceType}] \${data.sourceName}</span><span class="log-message">\${data.msg}</span>\`;
            logsEl.insertBefore(logEntry, logsEl.firstChild);

            // Keep only last 100 logs
            while (logsEl.children.length > 100) {
              logsEl.removeChild(logsEl.lastChild);
            }
          });

          evtSource.addEventListener('task_registered', (e) => {
            const data = JSON.parse(e.data);
            state.tasks.set(data.taskName, data);
            renderTasks();
          });

          evtSource.addEventListener('workflow_registered', (e) => {
            const data = JSON.parse(e.data);
            state.workflows.set(data.workflowName, data);
            renderWorkflows();
          });

          evtSource.addEventListener('pot_enqueued', (e) => {
            const data = JSON.parse(e.data);
            addPotEvent('enqueued', data.potName, data.potUuid, data.potType);
          });

          evtSource.addEventListener('pot_dequeued', (e) => {
            const data = JSON.parse(e.data);
            addPotEvent('dequeued', data.potName, data.potUuid);
          });

          evtSource.addEventListener('pot_dropped', (e) => {
            const data = JSON.parse(e.data);
            addPotEvent('dropped', data.potName, data.potUuid, data.reason);
          });

          function addPotEvent(type, potName, potUuid, extra) {
            const el = document.getElementById('pot-events-content');
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const entry = document.createElement('div');
            entry.className = 'pot-event pot-event-' + type;

            let icon = '';
            if (type === 'enqueued') icon = '📥';
            else if (type === 'dequeued') icon = '📤';
            else if (type === 'dropped') icon = '✅';

            entry.innerHTML = \`<span class="pot-event-time">\${time}</span><span class="pot-event-icon">\${icon}</span><span class="pot-event-name">\${potName}</span><span class="pot-event-type">\${type}\${extra ? ' (' + extra + ')' : ''}</span>\`;
            el.insertBefore(entry, el.firstChild);

            // Keep only last 50 events
            while (el.children.length > 50) {
              el.removeChild(el.lastChild);
            }
          }

          function renderTasks() {
            const el = document.getElementById('tasks-content');
            if (state.tasks.size === 0) {
              el.innerHTML = '<div class="empty-state">Waiting for tasks...</div>';
              return;
            }
            el.innerHTML = Array.from(state.tasks.values()).map(task => \`
              <div class="task-item">
                <div class="task-name">\${task.taskName}</div>
                <div class="task-detail">
                  Triggers: \${task.triggers.join(', ') || 'none'}
                  \${task.belongsToWorkflow ? ' | Workflow: ' + task.belongsToWorkflow : ''}
                </div>
              </div>
            \`).join('');
          }

          function renderWorkflows() {
            const el = document.getElementById('workflows-content');
            if (state.workflows.size === 0) {
              el.innerHTML = '<div class="empty-state">Waiting for workflows...</div>';
              return;
            }
            el.innerHTML = Array.from(state.workflows.values()).map(wf => \`
              <div class="workflow-item">
                <div class="workflow-name">\${wf.workflowName}</div>
                <div class="workflow-detail">
                  Tasks: \${wf.tasksCount} | First: \${wf.firstTaskName}
                </div>
              </div>
            \`).join('');
          }
        </script>

        <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
          background: #d29922;
          color: white;
          border-radius: 12px;
          font-size: 12px;
        }
        .status.connected {
          background: #238636;
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
        .empty-state {
          color: #8b949e;
          font-style: italic;
          font-size: 13px;
        }
        .task-item, .workflow-item {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
        }
        .task-item:last-child, .workflow-item:last-child {
          margin-bottom: 0;
        }
        .task-name, .workflow-name {
          font-weight: 600;
          color: #58a6ff;
          margin-bottom: 4px;
        }
        .task-detail, .workflow-detail {
          font-size: 12px;
          color: #8b949e;
        }
        .pot-events-container {
          max-height: 300px;
          overflow-y: auto;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 12px;
        }
        .pot-event {
          padding: 6px 8px;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pot-event:last-child {
          border-bottom: none;
        }
        .pot-event-time {
          color: #8b949e;
        }
        .pot-event-icon {
          font-size: 14px;
        }
        .pot-event-name {
          color: #58a6ff;
          font-weight: 600;
        }
        .pot-event-type {
          color: #8b949e;
        }
        .pot-event-enqueued { background: rgba(56, 139, 253, 0.1); }
        .pot-event-dequeued { background: rgba(210, 153, 34, 0.1); }
        .pot-event-dropped { background: rgba(35, 134, 54, 0.1); }
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
          max-height: 50vh;
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
        .log-level.trace { background: #6e7681; color: #fff; }
        .log-level.debug { background: #388bfd; color: #fff; }
        .log-level.verbose { background: #58a6ff; color: #fff; }
        .log-level.info { background: #238636; color: #fff; }
        .log-level.warn { background: #d29922; color: #000; }
        .log-level.error { background: #da3633; color: #fff; }
        .log-level.fatal { background: #f85149; color: #fff; }
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
        }),
      )
      .page("/", dashboardPage);

    // Create Hono app
    const app = new Hono();

    // SSE endpoint
    app.get("/events", (c) => {
      return streamSSE(c, async (stream) => {
        // Log event listener
        const logListener = (event: LogEvent<unknown>) => {
          const time = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const data = {
            time,
            level: this.#getLevelName(event.level),
            sourceType: this.#getSourceTypeName(Number(event.sourceType)),
            sourceName: event.sourceName,
            msg: event.msg,
          };

          stream.writeSSE({
            event: "log",
            data: JSON.stringify(data),
          });
        };

        // Core event listener
        // Note: BroadcastChannel serializes events, so instanceof checks don't work
        const coreListener = (event: CoreEvent) => {
          const e = event as CoreEvent & Record<string, unknown>;
          if (e.name === "TaskRegisteredEvent") {
            stream.writeSSE({
              event: "task_registered",
              data: JSON.stringify({
                taskName: e.taskName,
                triggers: e.triggers,
                belongsToWorkflow: e.belongsToWorkflow,
              }),
            });
          } else if (e.name === "WorkflowRegisteredEvent") {
            stream.writeSSE({
              event: "workflow_registered",
              data: JSON.stringify({
                workflowName: e.workflowName,
                tasksCount: e.tasksCount,
                firstTaskName: e.firstTaskName,
              }),
            });
          } else if (e.name === "PotEnqueuedEvent") {
            stream.writeSSE({
              event: "pot_enqueued",
              data: JSON.stringify({
                potName: e.potName,
                potUuid: e.potUuid,
                potType: e.potType,
              }),
            });
          } else if (e.name === "PotDequeuedEvent") {
            stream.writeSSE({
              event: "pot_dequeued",
              data: JSON.stringify({
                potName: e.potName,
                potUuid: e.potUuid,
              }),
            });
          } else if (e.name === "PotDroppedEvent") {
            stream.writeSSE({
              event: "pot_dropped",
              data: JSON.stringify({
                potName: e.potName,
                potUuid: e.potUuid,
                reason: e.reason,
              }),
            });
          }
        };

        emitters.logEventEmitter.addListener(logListener);
        emitters.coreEventEmitter.addListener(coreListener);

        // Send initial connected event
        await stream.writeSSE({
          event: "connected",
          data: JSON.stringify({ status: "connected" }),
        });

        // Send current state to new client
        for (const task of this.#tasks.values()) {
          await stream.writeSSE({
            event: "task_registered",
            data: JSON.stringify(task),
          });
        }

        for (const workflow of this.#workflows.values()) {
          await stream.writeSSE({
            event: "workflow_registered",
            data: JSON.stringify(workflow),
          });
        }

        // Pot events are real-time only, no initial state needed

        // Keep connection alive
        while (true) {
          await stream.sleep(30000);
          await stream.writeSSE({ event: "ping", data: "" });
        }
      });
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
