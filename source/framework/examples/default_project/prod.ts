// prod file ...
import prod from "shibui/framework/runtime/prod";
import manifest from "./shibui.manifest.ts";
import logger from "shibui/framework/plugins/luminous";

await prod(manifest, [logger]);
