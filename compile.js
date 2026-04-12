#!/usr/bin/env node
/**
 * FouFou compile.js
 * Pre-compiles app-code.js: JSX → plain JS → minified
 * Called by build.py after writing app-code.js
 * 
 * Why: Removes browser-side Babel entirely.
 * Babel standalone deoptimises files >500KB, breaking handlers in views.js/dialogs.js.
 * Pre-compiled output has zero JSX — no browser Babel needed.
 */

const babel = require('@babel/core');
const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

async function compile(inputPath) {
  const input = fs.readFileSync(inputPath, 'utf8');
  const inputKB = (input.length / 1024).toFixed(0);

  // Step 1: Babel JSX → plain JS
  const babelResult = babel.transform(input, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    filename: 'app.jsx',
    compact: false,
    comments: false
  });
  const compiledKB = (babelResult.code.length / 1024).toFixed(0);

  // Step 2: Terser minification
  // mangle:false is critical — function names like handleCityIconUpload,
  // window.BKK.* references, React hook names must survive
  const terserResult = await minify(babelResult.code, {
    compress: {
      drop_console: false,   // Keep console.log for runtime debug
      passes: 1,
      dead_code: true,
      unused: false          // Don't remove "unused" functions — they may be called from HTML/eval
    },
    mangle: false,           // NEVER mangle — breaks React hooks + window.BKK.* references
    format: { comments: false }
  });

  fs.writeFileSync(inputPath, terserResult.code);
  const outputKB = (terserResult.code.length / 1024).toFixed(0);

  console.log(`✅ compile.js: ${inputKB}KB JSX → ${compiledKB}KB plain JS → ${outputKB}KB minified`);
}

const target = process.argv[2] || 'app-code.js';
compile(target).catch(e => {
  console.error('❌ compile.js failed:', e.message);
  process.exit(1);
});
