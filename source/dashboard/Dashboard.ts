import { Hono } from "@hono/hono";
import { basic, component, html, morph } from "@vseplet/morph";
import { emitters } from "$shibui/emitters";
import type { LogEvent } from "$shibui/events";

export class Dashboard {
  #port: number;
  #server: AbortController | null = null;
  #clients: Set<ReadableStreamDefaultController> = new Set();

  constructor(port = 3000) {
    this.#port = port;
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

          <div class="logs-container">
            <div id="logs" hx-ext="sse" sse-connect="/logs/stream">
              <div sse-swap="log-event" hx-swap="beforeend scroll:bottom"></div>
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
        .status {
          padding: 4px 12px;
          background: #238636;
          color: white;
          border-radius: 12px;
          font-size: 12px;
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
    const website = morph.page("/", dashboardPage).layout(
      basic({
        title: "Shibui Dashboard",
        libraries: {
          htmx: "2.0.4",
          htmxSSE: true,
        },
      }),
    );

    // Create Hono app
    const app = new Hono();

    // SSE stream endpoint
    app.get("/logs/stream", (c) => {
      const stream = new ReadableStream({
        start: (controller) => {
          this.#clients.add(controller);

          // Listen to log events
          const listener = (event: LogEvent<unknown>) => {
            try {
              const time = new Date().toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              const level = this.#getLevelName(event.level).toLowerCase();

              const logHTML = `
                <div class="log-entry">
                  <span class="log-time">${time}</span>
                  <span class="log-level ${level}">${
                this.#getLevelName(
                  event.level,
                )
              }</span>
                  <span class="log-source">[${
                this.#getSourceTypeName(Number(event.sourceType))
              }] ${event.sourceName}</span>
                  <span class="log-message">${event.msg}</span>
                </div>
              `;

              controller.enqueue(
                `event: log-event\ndata: ${logHTML}\n\n`,
              );
            } catch (err) {
              console.error("Error sending log event:", err);
            }
          };

          emitters.logEventEmitter.addListener(listener);

          // Cleanup on disconnect
          c.req.raw.signal.addEventListener("abort", () => {
            this.#clients.delete(controller);
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
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
    // Close all SSE connections
    for (const controller of this.#clients) {
      try {
        controller.close();
      } catch {
        // Ignore errors on close
      }
    }
    this.#clients.clear();

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
