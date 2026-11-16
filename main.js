import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { Command } from 'commander';
import superagent from 'superagent';

const program = new Command();

program
  .helpOption('--help', 'показати довідку')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до теки кешу');

program.parse();
const options = program.opts();

const port = Number(options.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Помилка: порт має бути цілим числом від 0 до 65535');
  process.exit(1);
}

const cacheDir = path.resolve(options.cache);
await fs.mkdir(cacheDir, { recursive: true });

const CODE_RE = /^\/(\d{3})$/;

function filePath(code) {
  return path.join(cacheDir, `${code}.jpg`);
}

function send(res, status, text, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    ...headers,
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const match = CODE_RE.exec(url.pathname);

    if (!match) {
      send(res, 404, 'Шлях має вигляд /<код стану>, наприклад /404');
      return;
    }

    const code = match[1];

    switch (req.method) {
      default:
        send(res, 405, 'Метод не дозволено', { Allow: 'GET, PUT, DELETE' });
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      send(res, 500, 'Внутрішня помилка сервера');
    } else {
      res.end();
    }
  }
});

try {
  server.listen(port, options.host);
  await once(server, 'listening');
} catch (err) {
  console.error('Не вдалося запустити сервер:', err.message);
  process.exit(1);
}

console.log(`Сервер запущено: http://${options.host}:${port}/`);