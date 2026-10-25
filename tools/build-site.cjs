// Publish an explicit set of runtime files, never the whole working folder.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const output = path.join(base, '_site');
const files = new Set([
  'index.html', 'style.css', 'intro.css', 'book-reader.css',
  'motion.js', 'cosmos-data.js', 'script.js', 'book-model.js',
  'book-reader.js', 'intro-tunnel.js', 'intro.js',
]);

function addReference(reference, from = '') {
  if (!reference || /^(https?:|data:|#)/i.test(reference)) return;
  if (reference.startsWith('/')) throw new Error(`Use a relative site URL: ${reference}`);
  const local = path.posix.normalize(path.posix.join(path.posix.dirname(from || 'index.html'), reference.split(/[?#]/)[0]));
  if (local.startsWith('../') || path.isAbsolute(local)) throw new Error(`Invalid asset path: ${reference}`);
  files.add(local.replace(/^\.\//, ''));
}

const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href|data-src)="([^"]+)"/g)) addReference(match[1], 'index.html');
for (const file of [...files].filter(file => file.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(base, file), 'utf8');
  for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) addReference(match[1], file);
}
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(base, 'cosmos-data.js'), 'utf8'), context);
for (const topic of context.window.COSMIC_TOPICS) {
  if (topic.image) addReference(topic.image);
  for (const star of topic.stars) {
    if (!star.book) continue;
    addReference(star.book.pdfUrl);
    for (let page = 1; page <= star.book.pageCount; page++) {
      addReference(`${star.book.basePath}/page-${String(page).padStart(2, '0')}.jpg`);
    }
  }
}
for (const file of files) {
  const source = path.join(base, file);
  if (!fs.statSync(source).isFile()) throw new Error(`Missing deployment file: ${file}`);
}

// Refuse unexpected stale output instead of accidentally publishing it.
function list(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not published: ${entry.name}`);
    const relative = prefix + entry.name;
    return entry.isDirectory() ? list(path.join(directory, entry.name), relative + '/') : [relative];
  });
}
for (const file of list(output)) {
  if (file !== '.nojekyll' && !files.has(file)) throw new Error(`Unexpected output file; review it before publishing: ${file}`);
}

let bytes = 0;
fs.mkdirSync(output, { recursive: true });
for (const file of files) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(base, file), destination);
  bytes += fs.statSync(destination).size;
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Ready: ${files.size + 1} deployment files, ${(bytes / 1024 / 1024).toFixed(1)} MiB in _site/`);
console.log('Includes the GIF/image intro, constellation assets, original PDF, and all book pages.');
