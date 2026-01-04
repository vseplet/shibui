import { EventEmitter } from "$shibui/runtime";
import type { CoreEvent, LogEvent } from "$shibui/events";

export const emitters: {
  logEventEmitter: EventEmitter<LogEvent<unknown>>;
  coreEventEmitter: EventEmitter<CoreEvent>;
} = {
  logEventEmitter: new EventEmitter<LogEvent<unknown>>("log"),
  coreEventEmitter: new EventEmitter<CoreEvent>("core"),
};
