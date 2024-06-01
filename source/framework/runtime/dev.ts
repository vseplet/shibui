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

import * as colors from "https://deno.land/std@0.198.0/fmt/colors.ts";
import { dirname, fromFileUrl, resolve } from "../../deps.ts";
import { IManifest } from "../entities/Manifest.ts";
import { INTRO_TEXT } from "../scripts/_strings.ts";
import { generateManifest } from "./generateManifest.ts";
import { initCore } from "./initCore.ts";
import core from "../../core/mod.ts";
import { IPlugin } from "../entities/Plugin.ts";

const dev = async (path: string, plugins: Array<IPlugin> = []) => {
  console.log(colors.yellow(INTRO_TEXT));
  const dir = dirname(fromFileUrl(path));
  core.api.settings.DEFAULT_LOGGING_ENABLED = false;
  await generateManifest(dir);
  const manifest =
    (await import(`file:///${resolve(dir, "shibui.manifest.ts")}`))
      .default as IManifest;
  await initCore(manifest, plugins);
};

export default dev;
