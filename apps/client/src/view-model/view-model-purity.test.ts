/** Technical spec v7 §4.3: src/view-model/ imports no React/react-dom/motion and reads no clock. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const eslint = new ESLint({ cwd: repoRoot });
const VIEW_MODEL_FILE = join(repoRoot, 'apps/client/src/view-model/threat-tone.ts');
const OUTSIDE_FILE = join(repoRoot, 'apps/client/src/fx/play-flyout.ts');
const REACT_IMPORT = "import { useState } from 'react';\n\nexport const probe = useState;\n";
const DATE_NOW = 'export function probe(): number {\n  return Date.now();\n}\n';

async function lintRuleIds(code: string, filePath: string): Promise<(string | null)[]> {
  const messages = (await eslint.lintText(code, { filePath })).flatMap((result) => result.messages);
  expect(messages.filter((message) => message.fatal === true)).toEqual([]);
  return messages.map((message) => message.ruleId);
}

describe('view-model purity lint (technical spec v7 §4.3)', { timeout: 30_000 }, () => {
  it.each([
    ['a react import', REACT_IMPORT, 'no-restricted-imports'],
    ['a motion/react import', "import { motion } from 'motion/react';\n\nexport const probe = motion;\n", 'no-restricted-imports'],
    ['Date.now()', DATE_NOW, 'no-restricted-properties'],
    ['performance.now()', 'export function probe(): number {\n  return performance.now();\n}\n', 'no-restricted-properties'],
  ] as const)('rejects %s under src/view-model/', async (_label, code, ruleId) => {
    expect(await lintRuleIds(code, VIEW_MODEL_FILE)).toContain(ruleId);
  });

  it('leaves the same code alone outside src/view-model/', async () => {
    const ids = [...(await lintRuleIds(REACT_IMPORT, OUTSIDE_FILE)), ...(await lintRuleIds(DATE_NOW, OUTSIDE_FILE))];
    expect(ids).not.toContain('no-restricted-imports');
    expect(ids).not.toContain('no-restricted-properties');
  });
});
