import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(rootDir, 'backend');
const webDir = path.join(rootDir, 'web');

const backendEntry = path.join(backendDir, 'dist', 'server.js');
const webEntry = path.join(webDir, 'dist', 'index.html');

function hasBin(binName, workspaceDir) {
  return (
    fs.existsSync(path.join(workspaceDir, 'node_modules', '.bin', binName)) ||
    fs.existsSync(path.join(rootDir, 'node_modules', '.bin', binName))
  );
}

if (!hasBin('tsc', backendDir) || !hasBin('vite', webDir)) {
  console.log('[MediCore] Installing workspace dependencies...');
  execSync('npm install --no-audit --no-fund', { cwd: rootDir, stdio: 'inherit' });
}

const hasPrismaClient =
  fs.existsSync(path.join(rootDir, 'node_modules', '.prisma', 'client', 'index.js')) ||
  fs.existsSync(path.join(backendDir, 'node_modules', '.prisma', 'client', 'index.js'));
if (!hasPrismaClient) {
  console.log('[MediCore] Generating Prisma client...');
  execSync('npm --workspace=backend run prisma:generate', { cwd: rootDir, stdio: 'inherit' });
}

if (!fs.existsSync(backendEntry)) {
  console.log('[MediCore] Building backend production bundle...');
  execSync('npm --workspace=backend run build', { cwd: rootDir, stdio: 'inherit' });
}
if (!fs.existsSync(webEntry)) {
  console.log('[MediCore] Building web production bundle...');
  execSync('npm --workspace=web run build', { cwd: rootDir, stdio: 'inherit' });
}

const port = process.env.PORT || '3000';
const prodProc = spawn('node', [backendEntry], {
  cwd: backendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: port,
  },
});

prodProc.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => prodProc.kill('SIGINT'));
process.on('SIGTERM', () => prodProc.kill('SIGTERM'));
