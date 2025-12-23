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

import { SEvent } from "$shibui/entities";
import {
  LogLevel,
  SourceType,
  TLogEventArgs,
  TLogEventMetadata,
  UNKNOWN_TARGET,
} from "$shibui/types";
import { EventType } from "$shibui/constants";

export class LogEvent<T> extends SEvent {
  override type = EventType.Log;
  level = LogLevel.Unknown;
  sourceName: string = UNKNOWN_TARGET;
  sourceType = SourceType.Unknown;
  msg: string;
  metadata: T = {} as T; // late init

  constructor(args: TLogEventArgs, msg = "", metadata?: T) {
    super();
    this.sourceName = args.sourceName;
    this.sourceType = args.sourceType;
    this.msg = msg;
    if (metadata) this.metadata = metadata;
  }
}

export class DebugLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Debug;
}

export class TraceLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Trace;
}

export class VerboseLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Verbose;
}

export class InfoLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Info;
}

export class WarnLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Warn;
}

export class ErrorLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Error;
}

export class FatalLogEvent extends LogEvent<TLogEventMetadata> {
  override level = LogLevel.Fatal;
}
