// Copies static game data from node_modules into /public:
//  - flag-icons SVGs (games fetch and edit them)
//  - world-atlas TopoJSON (loaded at runtime instead of bundled)
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pub = join(process.cwd(), 'public');

const flagsSrc = join(dirname(require.resolve('flag-icons/package.json')), 'flags', '4x3');
const flagsDest = join(pub, 'flags', '4x3');
if (!existsSync(flagsDest)) {
  mkdirSync(flagsDest, { recursive: true });
  cpSync(flagsSrc, flagsDest, { recursive: true });
}

const atlasDir = dirname(require.resolve('world-atlas/package.json'));
mkdirSync(join(pub, 'geo'), { recursive: true });
for (const f of ['countries-110m.json', 'land-110m.json']) {
  cpSync(join(atlasDir, f), join(pub, 'geo', f));
}
console.log('Static assets ready in public/');
