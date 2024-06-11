import { join } from "$deps";

export async function* readDirRecursive(
  path: string,
): AsyncGenerator<string, void> {
  for await (const dirEntry of Deno.readDir(path)) {
    if (dirEntry.isDirectory) {
      yield* readDirRecursive(join(path, dirEntry.name));
    } else if (dirEntry.isFile) {
      yield join(path, dirEntry.name);
    }
  }
}
