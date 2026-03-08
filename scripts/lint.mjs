import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync("rg --files src -g '*.svelte' -g '*.ts' -g '*.js'", { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const problems = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('\t')) {
      problems.push(`${file}:${index + 1} contains tab indentation`);
    }
    if (/\s+$/.test(line)) {
      problems.push(`${file}:${index + 1} has trailing whitespace`);
    }
  });
}

if (problems.length > 0) {
  console.error('Basic lint failed:');
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`Basic lint passed for ${files.length} files.`);
