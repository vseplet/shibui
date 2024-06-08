import { EventEmitter } from "./components/mod.ts";
import type { CoreEvent, LogEvent } from "./events/mod.ts";

export const emitters = {
  logEventEmitter: new EventEmitter<LogEvent<unknown>>("log"),
  coreEventEmitter: new EventEmitter<CoreEvent>("core"),
};
