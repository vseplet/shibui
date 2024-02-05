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

// deno-lint-ignore-file

import { ShibuiEvent, ShibuiEventType } from "../core/entities/ShibuiEvent.ts";

export enum Level {
  UNKNOWN = 0,
  TRACE = 1,
  DEBUG = 2,
  VERBOSE = 3,
  INFO = 4,
  WARN = 5,
  ERROR = 6,
  FATAL = 7,
}

export enum SourceType {
  UNKNOWN = "UNKNOWN",
  CORE = "CORE",
  TASK = "TASK",
  TASK_TEST = "TASK.ON",
  TASK_DO = "TASK.DO",
  WORKFLOW = "WORKFLOW",
  WORKFLOW_TEST = "WORKFLOW.TEST",
  WORKFLOW_FAIL = "WORKFLOW.FAIL",
  FRAMEWORK = "FRAMEWORK",
  PLUGIN = "PLUGIN",
}

interface ILogEventArgs {
  sourceType: SourceType;
  sourceName: string;
}

export class LogEvent<T> extends ShibuiEvent {
  type = ShibuiEventType.LOG;
  level = Level.UNKNOWN;
  sourceName = "unknown";
  sourceType = SourceType.UNKNOWN;
  msg: string;
  metadata: T = {} as T; // late init

  constructor(args: ILogEventArgs, msg = "", metadata?: T) {
    super();
    this.sourceName = args.sourceName;
    this.sourceType = args.sourceType;
    this.msg = msg;
    if (metadata) this.metadata = metadata;
  }
}

interface ILogEventMetadata {
  name?: string;
}

export class DebugLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.DEBUG;
}

export class TraceLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.TRACE;
}

export class VerboseLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.TRACE;
}

export class InfoLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.INFO;
}

export class WarnLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.WARN;
}

export class ErrorLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.ERROR;
}

export class FatalLogEvent extends LogEvent<ILogEventMetadata> {
  level = Level.FATAL;
}

const LogEvents = {
  LogEvent,
  DebugLogEvent,
  ErrorLogEvent,
  TraceLogEvent,
  InfoLogEvent,
  WarnLogEvent,
  VerboseLogEvent,
  FatalLogEvent,
};

export default LogEvents;
