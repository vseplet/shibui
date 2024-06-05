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

import { workflow } from "../entities/WorkflowBuilder.ts";
import { task } from "../entities/TaskBuilder.ts";
import { ShibuiApi } from "./ShibuiApi.ts";
import { emitters } from "../emitters.ts";

export class ShibuiCore {
  workflow = workflow;
  task = task;
  api = new ShibuiApi();
  emitters = emitters;
}
