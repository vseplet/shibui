/*
 * Copyright 2023 Vsevolod Plentev
 *
 * This program is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0).
 * You may obtain a copy of the license at https://creativecommons.org/licenses/by-nc/3.0/legalcode.
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import type { IEventDTEventDrivenLogger } from "$core/types";

export type TPlugin = (core: TCore) => void;

export type TPluginInit = (
  args: { core: TCore; log: TEventDrivenLogger },
) => void;

export interface IPlugin {
  name: string;
  init: TPluginInit;
}

export const plugin = (
  name: string,
  init: TPluginInit,
): IPlugin => ({
  name,
  init,
});
