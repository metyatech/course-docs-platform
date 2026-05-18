import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('README records the no-op response task', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(readme, /## Optio task response/);
  assert.match(readme, /f03b3b4d-056b-4f4d-9f7b-4e8515944636/);
  assert.match(readme, /No runtime or API changes are required for this task\./);
});
