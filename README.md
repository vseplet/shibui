# SHIBUI - universal workflow automation

```bash
deno run --allow-all jsr:@vseplet/shibui@0.3.16/framework/scripts/init.ts

cd shibui-project
deno task dev
```

```ts
const demoTask = shibui.task(TelegramMessage)
  .name("My first demo task")
  .do(async ({ finish, ctx }) => {
    return finish();
  });

const demoTask = shibui.task(TelegramMessage)
  .name("My first demo task")
  .test(({ allow, deny }) => {
    return allow();
  })
  .do(async ({ finish, ctx }) => {
    return finish();
  });
```
