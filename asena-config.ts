import { defineConfig } from '@asenajs/asena-cli';

export default defineConfig({
  sourceFolder: 'src',
  rootFile: 'src/index.ts',
  buildOptions: {
    outdir: 'dist',
    format: 'esm',
    sourcemap: 'none',
    minify: { whitespace: true, syntax: true, identifiers: false },
  },
});
