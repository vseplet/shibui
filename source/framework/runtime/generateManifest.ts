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

import { join, relative, resolve } from "../../deps.ts";
import { readDirRecursive } from "../../helpers/_readDirRecursive.ts";

export const generateManifest = async (dir: string) => {
  const moduleExports: { [subDir: string]: { [path: string]: string } } = {
    // middlewares: {},
    // pots: {},
    plugins: {},
    tasks: {},
    workflows: {},
  };

  let IMPORT_STRINGS = "";
  let EXPORT_STRINGS = "export default {\n";

  let counter = 0;

  for (const subDir in moduleExports) {
    IMPORT_STRINGS += `// ${subDir}\n`;
    EXPORT_STRINGS += `  ${subDir}: {\n`;

    for await (const entry of readDirRecursive(resolve(dir, subDir))) {
      const relativeImportPath = "./" + relative(dir, entry);
      if (relativeImportPath.includes("_")) continue; // TODO: еще один сомнительный способ
      counter++;
      const moduleName = `$${counter}`;
      IMPORT_STRINGS += `import ${moduleName} from "${
        relativeImportPath.replaceAll("\\", "/")
      }";\n`;
      EXPORT_STRINGS += `    "${relativeImportPath}": ${moduleName},\n`;
    }

    EXPORT_STRINGS += "  },\n";
  }

  EXPORT_STRINGS += "  baseUrl: import.meta.url,\n";
  EXPORT_STRINGS += "}\n";

  await Deno.writeTextFile(
    join(dir, "shibui.manifest.ts"),
    `${IMPORT_STRINGS}\n\n${EXPORT_STRINGS}`,
  );
};
