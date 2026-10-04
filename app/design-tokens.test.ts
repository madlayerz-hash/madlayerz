import { readFileSync } from 'fs';
import path from 'path';

// Lee los tokens directo del CSS para que el test falle si alguien cambia un
// color sin revisar el contraste.
const css = readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encontró ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  body.replace(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g, (_m, name: string, value: string) => {
    vars[name] = value;
    return '';
  });
  return vars;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['heading', 'bg'],
  ['accent-text', 'bg'],
  ['accent-text', 'surface'],
  ['on-accent', 'accent'],
];

describe.each([':root', '.dark'])('tokens %s', (selector) => {
  const tokens = block(selector);

  it.each(PAIRS)('%s sobre %s cumple AA', (fg, bg) => {
    expect(tokens[fg], `falta --${fg}`).toBeDefined();
    expect(tokens[bg], `falta --${bg}`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
