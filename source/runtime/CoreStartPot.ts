/**
 * CoreStartPot - a special pot that signals the core has started.
 * Defined separately to avoid circular dependencies with api.ts.
 */

import { Pot } from "./Pot.ts";
import { PotType } from "$shibui/types";

const UNKNOWN = "unknown";

export class CoreStartPot extends Pot<{}> {
  override type = PotType.Internal;
  override ttl = 0;
  override data = {};

  static create(): CoreStartPot {
    const pot = new CoreStartPot();
    pot.uuid = crypto.randomUUID();
    pot.name = "CoreStartPot";
    pot.toc = Date.now();
    pot.from = { task: UNKNOWN, workflow: UNKNOWN };
    pot.to = { task: UNKNOWN, workflow: UNKNOWN };
    return pot;
  }
}
