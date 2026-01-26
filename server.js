const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const WEB_DIR = path.join(process.cwd(), 'web');
const DATA_DIR = path.join(process.cwd(), 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  if (urlPath === '/ip.json') {
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
    const ip = ips[0] || 'localhost';
    const obj = { ipv4: ips, url: `http://${ip}:${PORT}/olivier-discographie/` };
    const buf = Buffer.from(JSON.stringify(obj));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(buf);
  }

  if (urlPath === '/authorize-firewall') {
    const script = path.join(process.cwd(), 'autoriser_parefeu_node.ps1').replace(/\\/g, '\\\\');
    const cmd = `powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"${script}\"'"`;
    exec(cmd, { windowsHide: true }, () => {});
    const buf = Buffer.from(JSON.stringify({ status: 'started' }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(buf);
  }
  if (urlPath === '/' || urlPath === '/index.html') {
    return serveFile(path.join(WEB_DIR, 'index.html'), res);
  }

  // Serve from /data/*
  if (urlPath.startsWith('/data/')) {
    const dataPath = path.join(DATA_DIR, urlPath.replace('/data/', ''));
    if (fs.existsSync(dataPath) && fs.statSync(dataPath).isFile()) {
      return serveFile(dataPath, res);
    }
  }

  // Serve from web dir
  const webPath = path.join(WEB_DIR, urlPath);
  if (fs.existsSync(webPath) && fs.statSync(webPath).isFile()) {
    return serveFile(webPath, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Serveur démarré: http://localhost:${PORT}/`);
});
