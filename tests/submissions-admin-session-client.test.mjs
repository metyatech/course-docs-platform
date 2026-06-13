import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.join(__dirname, '../src/submissions/submissions-client.tsx');

test('submissions-client.tsx uses signed admin sessions instead of tokens', async () => {
  const content = await fs.readFile(clientPath, 'utf-8');

  // Verify old token logic is removed
  assert.ok(!content.includes('sessionStorage'), 'Should not use sessionStorage');
  assert.ok(!content.includes('admin-comment-token'), 'Should not use admin-comment-token');
  assert.ok(!content.includes('x-admin-token'), 'Should not use x-admin-token header');
  assert.ok(!content.includes('adminToken'), 'Should not use adminToken state');
  assert.ok(!content.includes('setAdminToken'), 'Should not use setAdminToken state');

  // Verify new admin session logic is present
  assert.ok(
    content.includes("ADMIN_STATUS_PATH = '/api/admin/mode/'"),
    'Should define ADMIN_STATUS_PATH',
  );
  assert.ok(
    content.includes("ADMIN_SESSION_CHANGED_EVENT = 'course-docs-admin-session-changed'"),
    'Should define ADMIN_SESSION_CHANGED_EVENT',
  );
  assert.ok(
    content.includes('isAdminCommentModerator'),
    'Should use isAdminCommentModerator state',
  );
  assert.ok(
    content.includes("fetch(ADMIN_STATUS_PATH, { cache: 'no-store' })"),
    'Should fetch admin status without cache',
  );
  assert.ok(
    content.includes('data.enabled === true && data.capabilities?.commentModeration === true'),
    'Should check capabilities',
  );
  assert.ok(
    content.includes('window.addEventListener(ADMIN_SESSION_CHANGED_EVENT'),
    'Should listen to session changed event',
  );
  assert.ok(
    content.includes("window.addEventListener('focus'"),
    'Should listen to window focus event',
  );
});
