import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const path = resolve(
      root,
      "." + (pathname === "/" ? "/examples/index.html" : pathname),
    );
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep))
      throw new Error("Invalid path");
    const body = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () => {
  console.log(
    `Particle Breath demo: http://localhost:${server.address().port}`,
  );
});
