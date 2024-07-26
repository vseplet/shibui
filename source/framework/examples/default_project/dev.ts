// dev file ...
import dev from "shibui/framework/runtime/dev";
import logger from "shibui/framework/plugins/luminous";

await dev(import.meta.url, [logger]);
