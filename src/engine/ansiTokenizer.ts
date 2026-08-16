import { TokenSpan } from './types';

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'var(--ansi-black)',
  31: 'var(--ansi-red)',
  32: 'var(--ansi-green)',
  33: 'var(--ansi-yellow)',
  34: 'var(--ansi-blue)',
  35: 'var(--ansi-magenta)',
  36: 'var(--ansi-cyan)',
  37: 'var(--ansi-white)',
  90: 'var(--ansi-bright-black)',
  91: 'var(--ansi-bright-red)',
  92: 'var(--ansi-bright-green)',
  93: 'var(--ansi-bright-yellow)',
  94: 'var(--ansi-bright-blue)',
  95: 'var(--ansi-bright-magenta)',
  96: 'var(--ansi-bright-cyan)',
  97: 'var(--ansi-bright-white)',
};

const ANSI_BG_MAP: Record<number, string> = {
  40: 'var(--ansi-black)',
  41: 'var(--ansi-red)',
  42: 'var(--ansi-green)',
  43: 'var(--ansi-yellow)',
  44: 'var(--ansi-blue)',
  45: 'var(--ansi-magenta)',
  46: 'var(--ansi-cyan)',
  47: 'var(--ansi-white)',
  100: 'var(--ansi-bright-black)',
  101: 'var(--ansi-bright-red)',
  102: 'var(--ansi-bright-green)',
  103: 'var(--ansi-bright-yellow)',
  104: 'var(--ansi-bright-blue)',
  105: 'var(--ansi-bright-magenta)',
  106: 'var(--ansi-bright-cyan)',
  107: 'var(--ansi-bright-white)',
};

export function tokenizeAnsi(input: string): TokenSpan[] {
  if (!input) return [];

  const result: TokenSpan[] = [];
  const regex = /\x1b\[([0-9;]+)m/g;
  let lastIndex = 0;
  let currentColor: string | null = null;
  let currentBg: string | null = null;
  let bold = false;
  let italic = false;
  let underline = false;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        text: input.substring(lastIndex, match.index),
        color: currentColor,
        bgColor: currentBg,
        bold,
        italic,
        underline,
      });
    }

    const codes = match[1].split(';').map(Number);
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentColor = null;
        currentBg = null;
        bold = false;
        italic = false;
        underline = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 3) {
        italic = true;
      } else if (code === 4) {
        underline = true;
      } else if (ANSI_COLOR_MAP[code]) {
        currentColor = ANSI_COLOR_MAP[code];
      } else if (ANSI_BG_MAP[code]) {
        currentBg = ANSI_BG_MAP[code];
      } else if (code === 38 && codes[i + 1] === 2) {
        // TrueColor Foreground: \x1b[38;2;R;G;Bm
        const r = codes[i + 2];
        const g = codes[i + 3];
        const b = codes[i + 4];
        currentColor = `rgb(${r},${g},${b})`;
        i += 4;
      } else if (code === 48 && codes[i + 1] === 2) {
        // TrueColor Background: \x1b[48;2;R;G;Bm
        const r = codes[i + 2];
        const g = codes[i + 3];
        const b = codes[i + 4];
        currentBg = `rgb(${r},${g},${b})`;
        i += 4;
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    result.push({
      text: input.substring(lastIndex),
      color: currentColor,
      bgColor: currentBg,
      bold,
      italic,
      underline,
    });
  }

  return result;
}

export function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
