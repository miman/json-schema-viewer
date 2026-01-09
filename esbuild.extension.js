const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  alias: {
    'jsonc-parser': path.resolve(__dirname, 'node_modules/jsonc-parser/lib/esm/main.js')
  }
};

if (watch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching extension bundle...');
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Extension bundled successfully');
  }).catch((e) => {
    console.error('Extension bundling failed:', e);
    process.exit(1);
  });
}
