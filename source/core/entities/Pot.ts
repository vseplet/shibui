/*
 * Copyright 2024 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { IPot, PotType } from "../types.ts";

export class Pot<
  D extends { [key: string]: unknown },
> implements IPot {
  toc = new Date().getTime();
  uuid = crypto.randomUUID();
  name = this.constructor.name;

  type: PotType = PotType.UNKNOWN;
  from = {
    workflow: "unknown",
    task: "unknown",
  };
  to = {
    workflow: "unknown",
    task: "unknown",
  };
  ttl = 0;
  data: D = {} as D; // late init

  constructor(
    setupArgs?: Partial<
      Omit<
        IPot,
        "timeOfCreation" | "type" | "name" | "uuid" | "from" | "to" | "ttl"
      >
    >,
  ) {
  }

  setup(
    initArgs: Partial<
      Omit<
        IPot,
        "timeOfCreation" | "type" | "name" | "uuid" | "from" | "to" | "ttl"
      >
    >,
  ) {
    return this;
  }

  deserialize(jsonObj: IPot): Pot<D> {
    this.toc = jsonObj.toc;
    this.uuid = jsonObj.uuid;
    this.name = jsonObj.name;
    this.type = jsonObj.type;

    this.from = jsonObj.from;
    this.to = jsonObj.to;
    this.ttl = jsonObj.ttl;

    this.data = jsonObj.data as D;

    return this;
  }

  copy(partialData?: Partial<D>) {
    // @ts-ignore
    const copy = new this.constructor();
    copy.name = this.name;
    copy.type = this.type;
    copy.init(self.structuredClone(this.data));
    // TDOD: подумать над тем, как оптимизировать этот костыль
    if (partialData) {
      // copy.init(JSON.parse(JSON.stringify(partialData)));
      copy.init(self.structuredClone(partialData));
    }
    return copy;
  }

  init(partialData: Partial<D>) {
    Object.keys(partialData).forEach((key) => {
      const typedKey = key as keyof D;
      if (partialData[typedKey] !== undefined) {
        this.data[typedKey] = partialData[typedKey] as D[keyof D];
      }
    });

    return this;
  }
}
