import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(rootDir, 'backend');
const webDir = path.join(rootDir, 'web');

let backendProc = null;
let webProc = null;
let bootstrapServer = null;
let shuttingDown = false;

function resolveBin(binName, workspaceDir) {
  const candidates = [
    path.join(workspaceDir, 'node_modules', '.bin', binName),
    path.join(rootDir, 'node_modules', '.bin', binName),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function hasWorkspaceDependencies() {
  return Boolean(
    resolveBin('vite', webDir) &&
      (resolveBin('tsx', backendDir) || resolveBin('ts-node-dev', backendDir))
  );
}

function cleanup(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    bootstrapServer?.close();
  } catch {
    // ignore
  }
  try {
    backendProc?.kill('SIGTERM');
  } catch {
    // ignore
  }
  try {
    webProc?.kill('SIGTERM');
  } catch {
    // ignore
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

function freePortsIfNeeded() {
  try {
    execSync('fuser -k 4000/tcp 3000/tcp 2>/dev/null || true', { stdio: 'ignore' });
  } catch {
    // Ignore if fuser is unavailable
  }
}

function hasPrismaClient() {
  const candidates = [
    path.join(rootDir, 'node_modules', '.prisma', 'client', 'index.js'),
    path.join(backendDir, 'node_modules', '.prisma', 'client', 'index.js'),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function runPrismaGenerateAsync() {
  return new Promise((resolve) => {
    const prismaBin = resolveBin('prisma', backendDir);
    const proc = prismaBin
      ? spawn(prismaBin, ['generate'], { cwd: backendDir, stdio: 'inherit', env: process.env })
      : spawn('npm', ['--workspace=backend', 'run', 'prisma:generate'], {
          cwd: rootDir,
          stdio: 'inherit',
          env: process.env,
        });
    proc.on('error', () => resolve());
    proc.on('exit', () => resolve());
  });
}

function startBootstrapHttpServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/health' || req.url === '/health/live') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          Connection: 'close',
        });
        res.end(JSON.stringify({ success: true, status: 'STARTING' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'close',
      });
      res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="3" />
    <title>MediCore — Starting Workspace</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #f8fafc; color: #172b43; }
      .box { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 32px; max-width: 420px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 13px; color: #64748b; margin: 0; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Starting MediCore Platform…</h1>
      <p>Installing workspace dependencies and initializing services. This page refreshes automatically.</p>
    </div>
  </body>
</html>`);
    });
    server.keepAliveTimeout = 100;
    server.on('error', () => resolve(null));
    server.listen(3000, '0.0.0.0', () => {
      console.log('[MediCore] Bootstrap listener ready on http://0.0.0.0:3000 while installing dependencies...');
      resolve(server);
    });
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

async function waitForPortFree(port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortFree(port)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function closeBootstrapServer(server) {
  if (!server) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), 1500);
    server.close(() => {
      clearTimeout(timer);
      resolve();
    });
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
  });
  await waitForPortFree(3000, 3000);
}

function runNpmInstallAsync() {
  return new Promise((resolve, reject) => {
    const installer = spawn('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    installer.on('error', reject);
    installer.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code}`));
    });
  });
}

function launchRealDevServers() {
  const viteBin = resolveBin('vite', webDir);
  const tsxBin = resolveBin('tsx', backendDir);
  const tsNodeDevBin = resolveBin('ts-node-dev', backendDir);

  webProc = viteBin
    ? spawn(viteBin, ['--host', '0.0.0.0', '--port', '3000', '--strictPort'], {
        cwd: webDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: '3000' },
      })
    : spawn('npm', ['--workspace=web', 'run', 'dev'], {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: '3000' },
      });

  const backendEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: '4000',
    DISABLE_AUTH_RATE_LIMIT_FOR_TEST: process.env.DISABLE_AUTH_RATE_LIMIT_FOR_TEST || 'true',
    AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '500',
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '2000',
  };

  backendProc = tsxBin
    ? spawn(tsxBin, ['src/server.ts'], {
        cwd: backendDir,
        stdio: 'inherit',
        env: backendEnv,
      })
    : tsNodeDevBin
    ? spawn(tsNodeDevBin, ['--respawn', '--transpile-only', 'src/server.ts'], {
        cwd: backendDir,
        stdio: 'inherit',
        env: backendEnv,
      })
    : spawn('npm', ['--workspace=backend', 'run', 'dev'], {
        cwd: rootDir,
        stdio: 'inherit',
        env: backendEnv,
      });

  backendProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[MediCore] Backend dev server exited unexpectedly (code ${code ?? 'unknown'}).`);
      cleanup(code || 1);
    }
  });

  webProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[MediCore] Web dev server exited unexpectedly (code ${code ?? 'unknown'}).`);
      cleanup(code || 1);
    }
  });
}

async function main() {
  freePortsIfNeeded();

  if (!hasWorkspaceDependencies()) {
    // Bind port 3000 immediately (<50ms) so container readiness checks never time out on cold boots
    bootstrapServer = await startBootstrapHttpServer();
    try {
      await runNpmInstallAsync();
    } catch (err) {
      console.error('[MediCore] Failed to install workspace dependencies:', err);
      cleanup(1);
      return;
    }

    if (!hasPrismaClient()) {
      await runPrismaGenerateAsync();
    }

    await closeBootstrapServer(bootstrapServer);
    bootstrapServer = null;
  } else if (!hasPrismaClient()) {
    await runPrismaGenerateAsync();
  }

  launchRealDevServers();
}

void main();
