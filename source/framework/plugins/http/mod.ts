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

import { HttpRequestPot } from "./HttpRequestPot.ts";
import shibui from "../../mod.ts";

export default shibui.plugin("http", ({ core }) => {
  const handler = async (request: Request): Promise<Response> => {
    const body = await request.json();
    const url = new URL(request.url);
    core.send(new HttpRequestPot().init({
      path: url.pathname,
      body,
    }));
    return new Response("ok");
  };

  Deno.serve({ port: 8000, hostname: "0.0.0.0", handler });
});
