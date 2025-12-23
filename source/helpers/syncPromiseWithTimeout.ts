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

export function syncPromiseWithTimeout<T>(
  asyncFunc: () => Promise<T>,
  timeoutMs = 10000,
): T {
  let result: T | undefined;
  let error: Error | undefined;
  let finished = false;

  (async () => {
    try {
      result = await asyncFunc();
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      finished = true;
    }
  })();

  const startTime = Date.now();
  while (!finished && Date.now() - startTime < timeoutMs) {}

  if (!finished) {
    throw new Error("Timeout!");
  }

  if (error !== undefined) {
    throw error;
  }

  return result!;
}
