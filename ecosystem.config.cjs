const path = require('node:path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'quali-api',
      cwd: path.join(root, 'apps/api'),
      script: path.join(root, 'apps/api/dist/main.js'),
      interpreter: process.execPath,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', API_PORT: '4002' },
    },
    {
      name: 'quali-admin',
      cwd: path.join(root, 'apps/admin'),
      script: path.join(root, 'apps/admin/node_modules/next/dist/bin/next'),
      args: 'start --hostname 127.0.0.1 --port 3003',
      interpreter: process.execPath,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '768M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'quali-clube',
      cwd: path.join(root, 'apps/clube'),
      script: path.join(root, 'apps/clube/node_modules/next/dist/bin/next'),
      args: 'start --hostname 127.0.0.1 --port 3002',
      interpreter: process.execPath,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '768M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
