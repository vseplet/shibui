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

import { SEvent } from "$core/entities";
import { EVENT_TYPE_CORE } from "$core/constants";

export class CoreEvent extends SEvent {
  override type = EVENT_TYPE_CORE;

  constructor() {
    super();
  }
}

export class TaskFailedEvent extends CoreEvent {}

export class TaskFinishedEvent extends CoreEvent {}

export class WorkflowFailedEvent extends CoreEvent {}

export class WorkflowFinishedEvent extends CoreEvent {}

export class WorkflowStartedEvent extends CoreEvent {}
