/**
 * Multi-API Aggregator Example
 *
 * Demonstrates:
 * - Workflow with typed context
 * - Sequential data fetching from multiple APIs
 * - Error handling with fallbacks
 * - Telegram notification
 *
 * APIs used:
 * - wttr.in - weather data
 * - open.er-api.com - currency rates
 * - uselessfacts.jsph.pl - random facts
 *
 * How to run:
 *
 * 1. Get your Telegram chat_id:
 *    - Message @userinfobot in Telegram
 *    - Or use: curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
 *
 * 2. Run with environment variables:
 *    TELEGRAM_BOT_TOKEN="your_bot_token" \
 *    TELEGRAM_CHAT_ID="your_chat_id" \
 *    deno task example:aggregator
 *
 * 3. Without Telegram (prints to console):
 *    deno task example:aggregator
 *
 * Example output in Telegram:
 *
 *    📊 Daily Digest
 *
 *    🌤 Weather in Tallinn
 *    -10°C — Partly cloudy
 *
 *    💰 Currency Rates (USD)
 *    EUR: 0.8516
 *    GBP: 0.7429
 *    JPY: 156.70
 *
 *    💡 Random Fact
 *    The giant squid has the largest eyes in the world.
 *
 *    ⏱ 23:35:06
 */

import { ConsoleLogger, context, execute, workflow } from "$shibui";

// Configuration
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

// Workflow context with all collected data
const AggregatorContext = context("AggregatorContext", {
  weather: { city: "", temp: "", condition: "" },
  currency: { base: "USD", rates: {} as Record<string, number> },
  fact: "",
  errors: [] as string[],
});

// Helper to send Telegram
async function sendTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("\n📱 Report:\n" + text);
    return true;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "Markdown",
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Create the workflow
const aggregatorWorkflow = workflow(AggregatorContext)
  .name("Multi-API Aggregator")
  .sq(({ task }) => {
    // Step 4: Send report to Telegram
    const sendReport = task()
      .name("Send Report")
      .do(async ({ ctx, log, finish }) => {
        log.inf("Building and sending report...");

        const { weather, currency, fact, errors } = ctx.data;

        let report = `📊 *Daily Digest*\n\n`;
        report += `🌤 *Weather in ${weather.city}*\n`;
        report += `${weather.temp} — ${weather.condition}\n\n`;
        report += `💰 *Currency Rates (${currency.base})*\n`;
        report += `EUR: ${currency.rates.EUR?.toFixed(4) || "N/A"}\n`;
        report += `GBP: ${currency.rates.GBP?.toFixed(4) || "N/A"}\n`;
        report += `JPY: ${currency.rates.JPY?.toFixed(2) || "N/A"}\n\n`;
        report += `💡 *Random Fact*\n${fact}\n\n`;

        if (errors.length > 0) {
          report += `⚠️ _Errors: ${errors.join(", ")}_\n\n`;
        }

        report += `⏱ _${new Date().toLocaleTimeString()}_`;

        const sent = await sendTelegram(report);
        log.inf(sent ? "Report sent!" : "Failed to send");

        return finish();
      });

    // Step 3: Fetch random fact
    const fetchFact = task()
      .name("Fetch Fact")
      .do(async ({ ctx, log, next }) => {
        log.inf("Fetching random fact...");

        try {
          const res = await fetch(
            "https://uselessfacts.jsph.pl/api/v2/facts/random",
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          ctx.data.fact = data.text;
          log.inf("Fact received");
        } catch (e) {
          ctx.data.fact = "Honey never spoils.";
          ctx.data.errors.push("fact");
          log.wrn(`Fact failed: ${e}`);
        }

        return next(sendReport);
      });

    // Step 2: Fetch currency rates
    const fetchCurrency = task()
      .name("Fetch Currency")
      .do(async ({ ctx, log, next }) => {
        log.inf("Fetching currency rates...");

        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          ctx.data.currency = {
            base: "USD",
            rates: {
              EUR: data.rates.EUR,
              GBP: data.rates.GBP,
              JPY: data.rates.JPY,
            },
          };
          log.inf(`Rates: EUR=${data.rates.EUR.toFixed(2)}`);
        } catch (e) {
          ctx.data.currency = {
            base: "USD",
            rates: { EUR: 0.92, GBP: 0.79, JPY: 149 },
          };
          ctx.data.errors.push("currency");
          log.wrn(`Currency failed: ${e}`);
        }

        return next(fetchFact);
      });

    // Step 1: Fetch weather
    const fetchWeather = task()
      .name("Fetch Weather")
      .do(async ({ ctx, log, next }) => {
        log.inf("Fetching weather...");

        try {
          const res = await fetch("https://wttr.in/Tallinn?format=j1");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const c = data.current_condition[0];
          ctx.data.weather = {
            city: "Tallinn",
            temp: `${c.temp_C}°C`,
            condition: c.weatherDesc[0].value,
          };
          log.inf(`Weather: ${ctx.data.weather.temp}`);
        } catch (e) {
          ctx.data.weather = {
            city: "Tallinn",
            temp: "N/A",
            condition: "Error",
          };
          ctx.data.errors.push("weather");
          log.wrn(`Weather failed: ${e}`);
        }

        return next(fetchCurrency);
      });

    return fetchWeather;
  });

// Run
console.log("🚀 Multi-API Aggregator Workflow\n");

const success = await execute(aggregatorWorkflow, undefined, {
  logger: new ConsoleLogger({ level: "info" }),
});

console.log(success ? "\n✅ Done!" : "\n❌ Failed!");
