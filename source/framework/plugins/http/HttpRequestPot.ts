import { ExternalPot } from "../../../core/pots/ExternalPot.ts";

export class HttpRequestPot extends ExternalPot<
  {
    path: string;
    body: any;
  }
> {
}
