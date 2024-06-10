Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log(url);
  const filepath = "/" +
    decodeURIComponent(url.pathname).split("/").slice(2).join(
      "/",
    );
  console.log(decodeURIComponent(url.pathname));
  console.log(filepath);
  let file;
  try {
    file = await Deno.open("." + filepath, { read: true });
  } catch {
    const notFoundResponse = new Response("404 Not Found", {
      status: 404,
    });
    return notFoundResponse;
  }

  const readableStream = file.readable;
  return new Response(readableStream);
});
