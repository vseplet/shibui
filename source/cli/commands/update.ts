// import shibui from "core";
// import { matey } from "deps";

// class ContextPot extends shibui.Pot<{}> {
// }

// const workflow = shibui.workflow(ContextPot)
//   .init(({ task }) => {
//     const checkLatestVersion = task()
//       .name`Check Latest Version`;

//     const update = task()
//       .name`Update`;

//     return checkLatestVersion;
//   });

// const commandUpdate = new matey.CliCommandBuilder()
//   .setName("update")
//   .setDescription("update description")
//   .setHandler(() => {
//     console.log("test!");
//     shibui.api.executeSync(workflow, [new ContextPot()]);
//   })
//   .build();

// export default commandUpdate;
