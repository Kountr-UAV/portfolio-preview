import { cp, mkdir, rm } from 'node:fs/promises';
const files = ['index.html', '404.html', 'robots.txt', 'assets', 'examples', 'licenses', '_headers', '_routes.json'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built static portfolio in dist from the explicit public-file allowlist.');
