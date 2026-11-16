import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readBrandSvg() {
  return readFileSync(join(process.cwd(),'public','bat-logo.svg'),'utf8');
}

export function brandVersion() {
  return createHash('sha256').update(readBrandSvg()).digest('hex').slice(0,12);
}

export function brandLogoUrl() {
  return `/bat-logo.svg?v=${brandVersion()}`;
}
