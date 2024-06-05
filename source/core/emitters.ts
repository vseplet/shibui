import { EventEmitter } from "./components/mod.ts";
import { CoreEvent, LogEvent } from "./events/mod.ts";

export const emitters = {
  logEventEmitter: new EventEmitter<LogEvent<unknown>>("log"),
  coreEventEmitter: new EventEmitter<CoreEvent>("core"),
};
