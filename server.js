import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const distRoot = resolve(projectRoot, "dist");
const isProduction = process.argv.includes("--production");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const sessionLifetime = 8 * 60 * 60 * 1000;
const sessionCookie = "ltc_session";
const sessions = new Map();
const loginAttempts = new Map();
const protectedPages = new Set([
  "/",
  "/index.html",
  "/trainee.html",
  "/program.html",
  "/sessions.html",
  "/payments.html",
]);
const allowedReturnPaths = new Set(protectedPages);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const adminPassword = process.env.LTC_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 12) {
  console.error("Set LTC_ADMIN_PASSWORD to a strong passphrase of at least 12 characters.");
  process.exit(1);
}

const adminPasswordDigest = createHash("sha256").update(adminPassword).digest();

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function getSessionToken(request) {
  const cookies = request.headers.cookie || "";
  const cookie = cookies.split(";").map(value => value.trim())
    .find(value => value.startsWith(`${sessionCookie}=`));
  return cookie ? cookie.slice(sessionCookie.length + 1) : "";
}

function isAuthenticated(request) {
  const token = getSessionToken(request);
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin || !request.headers.host) return false;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function getClientKey(request) {
  return request.socket.remoteAddress || "unknown";
}

function isRateLimited(clientKey) {
  const attempt = loginAttempts.get(clientKey);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    loginAttempts.delete(clientKey);
    return false;
  }
  return attempt.count >= 5;
}

function recordFailedLogin(clientKey) {
  const now = Date.now();
  const attempt = loginAttempts.get(clientKey);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(clientKey, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  attempt.count += 1;
}

function readJsonBody(request, maximumBytes = 4096) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    let oversized = false;
    const chunks = [];

    request.on("data", chunk => {
      size += chunk.length;
      if (size > maximumBytes) {
        oversized = true;
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (oversized) {
        rejectBody(Object.assign(new Error("Request body is too large."), { status: 413 }));
        return;
      }
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        rejectBody(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
      }
    });
    request.on("error", rejectBody);
  });
}

function setSessionCookie(response, token) {
  const secure = isProduction ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${sessionLifetime / 1000}${secure}`
  );
}

function clearSessionCookie(response) {
  const secure = isProduction ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

function redirect(response, location) {
  response.writeHead(303, {
    "Cache-Control": "no-store",
    Location: location,
    "X-Content-Type-Options": "nosniff",
  });
  response.end();
}

async function serveProductionFile(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(distRoot, `.${requestedPath}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const contents = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600",
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    throw error;
  }
}

async function start() {
  const server = createHttpServer((request, response) => {
    void handleRequest(request, response).catch(error => {
      console.error("Request failed:", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "Internal server error." });
      } else {
        response.destroy();
      }
    });
  });

  let vite;
  if (!isProduction) {
    vite = await createViteServer({
      configFile: resolve(projectRoot, "vite.config.js"),
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
  }

  async function handleRequest(request, response) {
    const url = new URL(request.url || "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/session" && request.method === "GET") {
      sendJson(response, 200, { authenticated: isAuthenticated(request) });
      return;
    }

    if (pathname === "/api/login" && request.method === "POST") {
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { error: "Sign-in request origin was rejected." });
        return;
      }

      const clientKey = getClientKey(request);
      if (isRateLimited(clientKey)) {
        sendJson(response, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." }, {
          "Retry-After": "900",
        });
        return;
      }

      if (!request.headers["content-type"]?.startsWith("application/json")) {
        sendJson(response, 415, { error: "Sign-in requires a JSON request." });
        return;
      }

      const body = await readJsonBody(request);
      if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.password !== "string" || body.password.length === 0 || body.password.length > 256) {
        sendJson(response, 400, { error: "Enter a valid password." });
        return;
      }

      const submittedDigest = createHash("sha256").update(body.password).digest();
      if (!timingSafeEqual(submittedDigest, adminPasswordDigest)) {
        recordFailedLogin(clientKey);
        sendJson(response, 401, { error: "The password is incorrect." });
        return;
      }

      loginAttempts.delete(clientKey);
      const token = randomBytes(32).toString("base64url");
      sessions.set(token, Date.now() + sessionLifetime);
      setSessionCookie(response, token);

      const redirectTo = allowedReturnPaths.has(body.returnTo) ? body.returnTo : "/index.html";
      sendJson(response, 200, { redirectTo });
      return;
    }

    if (pathname === "/api/logout" && request.method === "POST") {
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { error: "Sign-out request origin was rejected." });
        return;
      }
      sessions.delete(getSessionToken(request));
      clearSessionCookie(response);
      if (request.headers.accept?.includes("text/html")) {
        redirect(response, "/login.html");
        return;
      }
      sendJson(response, 200, { redirectTo: "/login.html" });
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "API route not found." });
      return;
    }

    const authenticated = isAuthenticated(request);
    if (protectedPages.has(pathname) && !authenticated) {
      redirect(response, `/login.html?return=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pathname === "/login.html" && authenticated) {
      redirect(response, "/index.html");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    if (isProduction) {
      await serveProductionFile(pathname, response);
      return;
    }

    vite.middlewares(request, response, error => {
      if (error) {
        console.error("Vite request failed:", error);
        if (!response.headersSent) sendJson(response, 500, { error: "Development server error." });
      } else if (!response.writableEnded) {
        response.writeHead(404);
        response.end("Not found");
      }
    });
  }

  server.listen(port, host, () => {
    process.stdout.write(`Lead Training Center server listening on http://${host}:${port}\n`);
  });
}

start().catch(error => {
  console.error("Unable to start server:", error);
  process.exit(1);
});
