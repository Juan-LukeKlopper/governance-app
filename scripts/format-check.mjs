import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync("rg --files src -g '*.svelte' -g '*.ts' -g '*.js'", { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const longLines = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.length > 2000) {
      longLines.push(`${file}:${index + 1} exceeds 2000 chars`);
    }
  });
}

if (longLines.length > 0) {
  console.error('Format check failed:');
  console.error(longLines.join('\n'));
  process.exit(1);
}

console.log(`Format check passed for ${files.length} files.`);
