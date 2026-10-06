import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    files.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
const files = await walk('dist');
assert(files.every(path => !/node_modules|functions\/|lib\/|docs\/|tests\/|package|wrangler|\.git|\.env|\.dev.vars/.test(path)));
let links = 0;
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
    const path = target.startsWith('/') ? resolve('dist', `.${target}`) : resolve(dirname(file), target);
    assert(path.startsWith(`${resolve('dist')}/`) || path === resolve('dist'), `${file}: link escapes bundle: ${target}`);
    await stat(path).catch(() => { throw new Error(`${file}: missing local link ${target}`); });
    links++;
  }
}
assert.equal((await readFile('dist/robots.txt', 'utf8')).trim(), 'User-agent: *\nDisallow: /');
const routes = JSON.parse(await readFile('dist/_routes.json', 'utf8'));
assert.deepEqual(routes.include, ['/api/contact', '/api/contact-config']);
console.log(`Checked ${files.length} public files and ${links} local asset/navigation links. Review indexing remains disabled.`);
