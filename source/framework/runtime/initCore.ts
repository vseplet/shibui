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

import { SourceType } from "../../core/types.ts";
import { IManifest } from "../entities/Manifest.ts";
import { IPlugin } from "../entities/Plugin.ts";
import framework from "../mod.ts";

export const initCore = async (
  manifest: IManifest,
  plugins: Array<IPlugin> = [],
) => {
  const log = framework.core.api.createLogger({
    sourceName: "init",
    sourceType: SourceType.FRAMEWORK,
  });

  framework.core.api.settings.DEFAULT_LOGGING_ENABLED = false;
  log.inf(`init plugins...`);

  for (const path in manifest.plugins) {
    const plugin = manifest.plugins[path];

    log.inf(`init ${plugin.name}`);
    plugin.init({
      api: framework.core.api,
      log: framework.core.api.createLogger({
        sourceName: plugin.name,
        sourceType: SourceType.PLUGIN,
      }),
    });
  }

  plugins.forEach((plugin) => {
    log.inf(`init ${plugin.name}`);

    plugin.init({
      api: framework.core.api,
      log: framework.core.api.createLogger({
        sourceName: plugin.name,
        sourceType: SourceType.PLUGIN,
      }),
    });
  });

  log.inf(`register tasks...`);
  for (const path in manifest.tasks) {
    framework.core.api.register(manifest.tasks[path]);
  }

  log.inf(`register workflows...`);
  for (const path in manifest.workflows) {
    framework.core.api.register(manifest.workflows[path]);
  }

  await framework.core.api.start();
};
