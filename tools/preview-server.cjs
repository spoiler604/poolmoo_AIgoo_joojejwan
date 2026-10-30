const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.mp4':'video/mp4', '.gif':'image/gif', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.pdf':'application/pdf' };
http.createServer((req, res) => {
  let file;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  } catch { res.writeHead(400); res.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache' };
    const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    let start = 0, end = stat.size - 1;
    if (range) {
      start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : end;
      if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }); res.end(); return; }
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === 'HEAD' || stat.size === 0) { res.end(); return; }
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}).listen(8768, '127.0.0.1', () => console.log('Preview http://127.0.0.1:8768'));
