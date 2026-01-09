const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/webview/webviewMain.ts'],
  bundle: true,
  outfile: 'out/webview/webview.bundle.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  sourcemap: true,
  minify: false,
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.jsx': 'jsx'
  }
};

if (watch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching webview bundle...');
  });
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}
