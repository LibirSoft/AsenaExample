import { defineConfig } from '@asenajs/asena-cli';

export default defineConfig({
  sourceFolder: 'src',
  rootFile: 'src/index.ts',
  buildOptions: {
    outdir: 'out',
    target: 'bun',
    minify: {
      syntax: true,
      whitespace: true,
      identifiers: false,
    },
  },
});
