import { matey } from "../../deps.ts";

const commandExec = new matey.CliCommandBuilder()
  .setName("exec")
  .setDescription("cmdA description")
  .addArgument({
    name: "path_to_file",
    description: "description",
    type: matey.ArgumentType.OPTION,
    required: true,
  })
  .setHandler(() => {
    console.log("test!");
  })
  .build();

export default commandExec;
