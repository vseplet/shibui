import { EventEmitter } from "$shibui/components";
import type { CoreEvent, LogEvent } from "$shibui/events";

export const emitters = {
  logEventEmitter: new EventEmitter<LogEvent<unknown>>("log"),
  coreEventEmitter: new EventEmitter<CoreEvent>("core"),
};
