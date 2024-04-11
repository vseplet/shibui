import { ExternalPot } from "../../../pots/ExternalPot.ts";

export class HttpRequestPot extends ExternalPot<
  {
    path: string;
    body: any;
  }
> {
}
