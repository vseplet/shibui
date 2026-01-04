import type { TSEvent } from "$shibui/types";
import { EventType } from "$shibui/types";

export class SEvent implements TSEvent {
  type = EventType.Unknown;
  name = this.constructor.name;
  timestamp: number = new Date().getTime();
}
