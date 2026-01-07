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
    });
  }

  #renderTaskItem(task: { taskName: string; triggers: string[]; belongsToWorkflow?: string }): string {
    return `<div class="task-item">
      <div class="task-name">${task.taskName}</div>
      <div class="task-detail">
        Triggers: ${task.triggers.join(', ') || 'none'}
        ${task.belongsToWorkflow ? ' | Workflow: ' + task.belongsToWorkflow : ''}
      </div>
    </div>`;
  }

  #renderWorkflowItem(wf: { workflowName: string; tasksCount: number; firstTaskName: string }): string {
    return `<div class="workflow-item">
      <div class="workflow-name">${wf.workflowName}</div>
      <div class="workflow-detail">
        Tasks: ${wf.tasksCount} | First: ${wf.firstTaskName}
      </div>
    </div>`;
  }

  #renderTasksList(): string {
    if (this.#tasks.size === 0) {
      return '<div class="empty-state">Waiting for tasks...</div>';
    }
    return Array.from(this.#tasks.values()).map(t => this.#renderTaskItem(t)).join('');
  }

  #renderWorkflowsList(): string {
    if (this.#workflows.size === 0) {
      return '<div class="empty-state">Waiting for workflows...</div>';
    }
    return Array.from(this.#workflows.values()).map(w => this.#renderWorkflowItem(w)).join('');
  }

  #renderLogEntry(data: { time: string; level: string; sourceType: string; sourceName: string; msg: string }): string {
    return `<div class="log-entry">
      <span class="log-time">${data.time}</span>
      <span class="log-level ${data.level.toLowerCase()}">${data.level}</span>
      <span class="log-source">[${data.sourceType}] ${data.sourceName}</span>
      <span class="log-message">${data.msg}</span>
    </div>`;
  }

  #renderPotEvent(type: string, potName: string, extra?: string): string {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let icon = '';
    if (type === 'enqueued') icon = '📥';
    else if (type === 'dequeued') icon = '📤';
    else if (type === 'dropped') icon = '✅';

    return `<div class="pot-event pot-event-${type}">
      <span class="pot-event-time">${time}</span>
      <span class="pot-event-icon">${icon}</span>
      <span class="pot-event-name">${potName}</span>
      <span class="pot-event-type">${type}${extra ? ' (' + extra + ')' : ''}</span>
    </div>`;
  }

  start() {
    // Dashboard page component with HTMX SSE
    const dashboardPage = component(() =>
      html`
        <div class="dashboard" hx-ext="sse" sse-connect="/events">
          <div class="header">
            <h1>Shibui Dashboard</h1>
            <span class="status connected">Connected</span>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h2>Tasks</h2>
              <div id="tasks-content" sse-swap="tasks" hx-swap="innerHTML">
                <div class="empty-state">Waiting for tasks...</div>
              </div>
            </div>

            <div class="info-section">
              <h2>Workflows</h2>
              <div id="workflows-content" sse-swap="workflows" hx-swap="innerHTML">
                <div class="empty-state">Waiting for workflows...</div>
              </div>
            </div>

            <div class="info-section">
              <h2>Pot Events</h2>
              <div class="pot-events-container" id="pot-events-content" sse-swap="pot_event" hx-swap="afterbegin"></div>
            </div>
          </div>

          <div class="logs-section">
            <h2>Logs</h2>
            <div class="logs-container" id="logs-content" sse-swap="log" hx-swap="afterbegin"></div>
          </div>
        </div>

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

    // Create morph website with SSE support
    const website = morph
      .layout(
        basic({
          title: "Shibui Dashboard",
          htmx: true,
          sse: true,
        }),
      )
      .page("/", dashboardPage);

    // Create Hono app
    const app = new Hono();

    // SSE endpoint - sends HTML for HTMX
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

          const html = this.#renderLogEntry({
            time,
            level: this.#getLevelName(event.level),
            sourceType: this.#getSourceTypeName(Number(event.sourceType)),
            sourceName: event.sourceName,
            msg: event.msg,
          });

          stream.writeSSE({ event: "log", data: html });
        };

        // Core event listener
        const coreListener = (event: CoreEvent) => {
          const e = event as CoreEvent & Record<string, unknown>;
          if (e.name === "TaskRegisteredEvent") {
            // Send full tasks list
            stream.writeSSE({ event: "tasks", data: this.#renderTasksList() });
          } else if (e.name === "WorkflowRegisteredEvent") {
            // Send full workflows list
            stream.writeSSE({ event: "workflows", data: this.#renderWorkflowsList() });
          } else if (e.name === "PotEnqueuedEvent") {
            const html = this.#renderPotEvent('enqueued', e.potName as string, e.potType as string);
            stream.writeSSE({ event: "pot_event", data: html });
          } else if (e.name === "PotDequeuedEvent") {
            const html = this.#renderPotEvent('dequeued', e.potName as string);
            stream.writeSSE({ event: "pot_event", data: html });
          } else if (e.name === "PotDroppedEvent") {
            const html = this.#renderPotEvent('dropped', e.potName as string, e.reason as string);
            stream.writeSSE({ event: "pot_event", data: html });
          }
        };

        emitters.logEventEmitter.addListener(logListener);
        emitters.coreEventEmitter.addListener(coreListener);

        // Send initial state
        await stream.writeSSE({ event: "tasks", data: this.#renderTasksList() });
        await stream.writeSSE({ event: "workflows", data: this.#renderWorkflowsList() });

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
