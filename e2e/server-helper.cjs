'use strict';
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const API_PORT = 4000;
const WEB_PORT = 5173;
const ADMIN_PORT = 5175;
const { assertSafeTestDatabase } = require('../carrental-api/src/db/dbGuard');

const E2E_DB_NAME = assertSafeTestDatabase(process.env.E2E_DB_NAME || process.env.DB_NAME || 'wanderwheels_e2e_test');

let spawnedApi = null;
let spawnedWeb = null;
let spawnedAdmin = null;

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => {
      const s6 = net.createConnection({ port, host: '::1' }, () => {
        s6.destroy();
        resolve(true);
      });
      s6.on('error', () => resolve(false));
    });
  });
}

function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (await checkPort(port)) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 500);
  });
}

async function ensureServers(options = {}) {
  const needApi = options.api !== false;
  const needWeb = options.web !== false;
  const needAdmin = options.admin === true;

  if (needApi) {
    const isRunning = await checkPort(API_PORT);
    if (!isRunning) {
      console.log('[STARTUP] Starting carrental-api on port 4000...');
      let apiOutput = '';
      spawnedApi = spawn('node', ['src/server.js'], {
        cwd: path.resolve(__dirname, '..', 'carrental-api'),
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          DB_NAME: E2E_DB_NAME,
          PAYMENT_GATEWAY: 'mock'
        }
      });
      spawnedApi.stdout.on('data', d => { apiOutput += d.toString(); });
      spawnedApi.stderr.on('data', d => { apiOutput += d.toString(); });
      const ok = await waitForPort(API_PORT);
      if (!ok) {
        console.error('[STARTUP ERROR carrental-api]:\n' + apiOutput);
        throw new Error('API server failed to start on port 4000');
      }
      console.log('  -> carrental-api ready.');
    }
  }

  if (needWeb) {
    const isRunning = await checkPort(WEB_PORT);
    if (!isRunning) {
      console.log('[STARTUP] Starting carrental-web on port 5173...');
      const viteBin = path.resolve(__dirname, '..', 'carrental-web', 'node_modules', 'vite', 'bin', 'vite.js');
      let webOutput = '';
      spawnedWeb = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
        cwd: path.resolve(__dirname, '..', 'carrental-web'),
        stdio: 'pipe'
      });
      spawnedWeb.stdout.on('data', d => { webOutput += d.toString(); });
      spawnedWeb.stderr.on('data', d => { webOutput += d.toString(); });
      const ok = await waitForPort(WEB_PORT);
      if (!ok) {
        console.error('[STARTUP ERROR carrental-web]:\n' + webOutput);
        throw new Error('Web client failed to start on port 5173');
      }
      console.log('  -> carrental-web ready.');
    }
  }

  if (needAdmin) {
    const isRunning = await checkPort(ADMIN_PORT);
    if (!isRunning) {
      console.log('[STARTUP] Starting carrental-admin on port 5175...');
      const viteBin = path.resolve(__dirname, '..', 'carrental-admin', 'node_modules', 'vite', 'bin', 'vite.js');
      let adminOutput = '';
      spawnedAdmin = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
        cwd: path.resolve(__dirname, '..', 'carrental-admin'),
        stdio: 'pipe'
      });
      spawnedAdmin.stdout.on('data', d => { adminOutput += d.toString(); });
      spawnedAdmin.stderr.on('data', d => { adminOutput += d.toString(); });
      const ok = await waitForPort(ADMIN_PORT);
      if (!ok) {
        console.error('[STARTUP ERROR carrental-admin]:\n' + adminOutput);
        throw new Error('Admin client failed to start on port 5175');
      }
      console.log('  -> carrental-admin ready.');
    }
  }
}

const { execSync } = require('child_process');

function killPid(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch (e) {}
}

function stopServers() {
  if (spawnedApi) {
    killPid(spawnedApi.pid);
    spawnedApi = null;
  }
  if (spawnedWeb) {
    killPid(spawnedWeb.pid);
    spawnedWeb = null;
  }
  if (spawnedAdmin) {
    killPid(spawnedAdmin.pid);
    spawnedAdmin = null;
  }
}

module.exports = {
  checkPort,
  waitForPort,
  ensureServers,
  stopServers,
  killPid,
  API_PORT,
  WEB_PORT,
  ADMIN_PORT,
  E2E_DB_NAME
};
