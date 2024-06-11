import { EventEmitter } from "$core/components";
import type { CoreEvent, LogEvent } from "$core/events";

export const emitters = {
  logEventEmitter: new EventEmitter<LogEvent<unknown>>("log"),
  coreEventEmitter: new EventEmitter<CoreEvent>("core"),
};
