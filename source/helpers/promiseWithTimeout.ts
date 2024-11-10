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

/**
 * Executes a promise with a timeout and returns the result
 * @param {Promise<T>} promise
 * @param {number} timeout
 * @returns {Promise<T | null>} result or null if timeout
 */
export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T | null> {
  let timeoutId: number | undefined = undefined;

  try {
    const timeoutPromise = new Promise<T | null>(
      (resolve) => {
        timeoutId = setTimeout(() => {
          resolve(null);
        }, timeout);
      },
    );

    const result = await Promise.race([
      promise,
      timeoutPromise,
    ]);

    clearTimeout(timeoutId);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
