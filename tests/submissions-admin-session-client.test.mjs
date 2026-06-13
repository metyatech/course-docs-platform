import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const clientPath = path.join(repoRoot, 'src/submissions/submissions-client.tsx');
const packageJsonPath = path.join(repoRoot, 'package.json');
const legacySourcePath = path.join(repoRoot, 'src/submissions/admin-footer-toggle.tsx');
const legacyBuildPath = path.join(repoRoot, 'dist/submissions/admin-footer-toggle.js');

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx']);

const FORBIDDEN_FRAGMENTS = [
  'admin-comment-token',
  'x-admin-token',
  'window.sessionStorage',
  'sessionStorage.setItem',
  'sessionStorage.getItem',
  "new CustomEvent('admin-token'",
  'new CustomEvent("admin-token"',
];

const walkSourceFiles = async (rootDir) => {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        continue;
      }
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
        out.push(full);
      }
    }
  }
  return out;
};

test('legacy admin token UI is fully removed from src/ and dist/', async () => {
  for (const root of ['src', 'dist']) {
    const absRoot = path.join(repoRoot, root);
    const files = await walkSourceFiles(absRoot);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      for (const fragment of FORBIDDEN_FRAGMENTS) {
        assert.ok(
          !content.includes(fragment),
          `Forbidden fragment "${fragment}" found in ${path.relative(repoRoot, file)}`,
        );
      }
    }
  }
});

test('legacy admin-footer-toggle component is deleted from source and build', async () => {
  await assert.rejects(
    () => fs.access(legacySourcePath),
    /ENOENT/,
    'src/submissions/admin-footer-toggle.tsx must not exist',
  );
  await assert.rejects(
    () => fs.access(legacyBuildPath),
    /ENOENT/,
    'dist/submissions/admin-footer-toggle.js must not exist after build',
  );
});

test('package.json no longer exports legacy admin footer toggle', async () => {
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  const exportsField = pkg.exports ?? {};
  assert.ok(
    !('./submissions/admin-footer-toggle' in exportsField),
    'package.json must not declare "./submissions/admin-footer-toggle" export',
  );
});

test('submissions-client.tsx uses signed admin sessions and encodes comment ids', async () => {
  const content = await fs.readFile(clientPath, 'utf-8');

  assert.ok(
    content.includes("ADMIN_STATUS_PATH = '/api/admin/mode/'"),
    'Should define ADMIN_STATUS_PATH',
  );
  assert.ok(
    content.includes("ADMIN_SESSION_CHANGED_EVENT = 'course-docs-admin-session-changed'"),
    'Should define ADMIN_SESSION_CHANGED_EVENT',
  );
  assert.ok(
    content.includes('window.addEventListener(ADMIN_SESSION_CHANGED_EVENT'),
    'Should listen to the admin session changed event',
  );
  assert.ok(
    /fetch\(`\/api\/admin\/comments\/\$\{encodeURIComponent\(commentId\)\}`/u.test(content),
    'DELETE URL must use encodeURIComponent(commentId)',
  );
  assert.ok(
    !/headers\s*:/u.test(
      content.match(
        /fetch\(\s*`\/api\/admin\/comments\/\$\{encodeURIComponent\(commentId\)\}`[\s\S]*?\}\)/u,
      )?.[0] ?? '',
    ),
    'DELETE request must not declare a headers field',
  );
  assert.ok(
    /throw new Error\(await readApiError\(response,\s*'削除に失敗しました。'\)\)/u.test(content),
    'Non-401 failure must throw via readApiError with the localized fallback',
  );
  assert.ok(
    !/\bresponse\.text\(\)/u.test(content),
    'response.text() must not be displayed to the user',
  );

  // The DELETE call site should only read the generic `error` field from the
  // response body. Disallow any direct leakage of response.text().
  const jsonReadMatch = content.match(/await response\.json\(\)/u);
  assert.ok(jsonReadMatch, 'Submissions client should read response.json()');
  const jsonRead = jsonReadMatch[0];
  assert.ok(jsonRead.length > 0, 'response.json() read must be non-empty');
});
