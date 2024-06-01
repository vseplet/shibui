# SHIBUI - universal workflow automation

```bash
deno run --allow-all https://deno.land/x/shibui@v5/framework/scripts/init.ts

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
