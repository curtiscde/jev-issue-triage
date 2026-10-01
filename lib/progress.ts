// A live progress display for classify: a bar, the last few issues Jev answered, and running cost.
// Redraws in place on a terminal; falls back to plain log lines when output is piped.

import { styleText } from 'node:util';
import { costOf } from './cost.ts';
import type { Category } from './jev.ts';
import type { Classification, Issue } from './store.ts';

const FEED_LINES = 8;
const BAR_WIDTH = 30;

const CATEGORY_COLOURS: Record<Category, Parameters<typeof styleText>[0]> = {
  bug: 'red',
  enhancement: 'cyan',
  question: 'yellow',
  'not-an-issue': 'gray',
};

// Issue titles are untrusted text from GitHub: control characters (escape sequences) could
// rewrite the terminal, so each is replaced with a space before printing.
export const printable = (text: string) => text.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');

const fit = (text: string, width: number) => {
  const clean = printable(text);
  return clean.length > width ? clean.slice(0, width - 1) + '…' : clean.padEnd(width);
};

export function createProgress(total: number, { fake = false } = {}) {
  const started = performance.now();
  const feed: string[] = [];
  const latencies: number[] = [];
  let done = 0;
  let failed = 0;
  let tokens = 0;
  let drawnLines = 0;
  const live = process.stdout.isTTY;

  function line(issue: Issue, c: Classification) {
    const titleWidth = Math.max(20, (process.stdout.columns ?? 100) - 60);
    return [
      styleText('dim', `#${issue.number}`.padEnd(6)),
      fit(issue.title, titleWidth),
      styleText(CATEGORY_COLOURS[c.answers.category.choice], fit(c.answers.category.choice, 13)),
      fit(c.answers.skill.choice, 26),
      styleText('dim', `${c.latencyMs}ms`.padStart(6)),
    ].join(' ');
  }

  function render() {
    const seconds = (performance.now() - started) / 1000;
    const share = total ? done / total : 1; // nothing to do counts as finished, not 0/0 = NaN
    const filled = Math.round(share * BAR_WIDTH);
    const median = [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)] ?? 0;
    const lines = [
      '',
      styleText('bold', ' Triaging mattpocock/skills with Jev'),
      '',
      ' ' +
        styleText('green', '█'.repeat(filled)) +
        styleText('dim', '░'.repeat(BAR_WIDTH - filled)) +
        `  ${done}/${total}  ${Math.round(share * 100)}%   ` +
        styleText('dim', `${(done / seconds || 0).toFixed(0)} issues/s   ${seconds.toFixed(0)}s`),
      '',
      ...feed.map((l) => ' ' + l),
      ...Array(FEED_LINES - feed.length).fill(''),
      '',
      styleText(
        'dim',
        ` ${tokens.toLocaleString()} tokens · ${fake ? 'fake model, no cost' : `$${costOf(tokens).toFixed(3)} so far`} · median ${median}ms · ` +
          (failed ? styleText('red', `${failed} failed`) : '0 failed'),
      ),
      '',
    ];
    // Move up over the previous frame and overwrite it.
    process.stdout.write((drawnLines ? `\x1b[${drawnLines}A` : '') + lines.map((l) => `\x1b[2K${l}`).join('\n') + '\n');
    drawnLines = lines.length;
  }

  // Hide the cursor while redrawing, so it doesn't flicker across the bar.
  const showCursor = () => process.stdout.write('\x1b[?25h');
  if (live) {
    process.stdout.write('\x1b[?25l');
    process.once('exit', showCursor);
  }
  const timer = live ? setInterval(render, 80) : undefined;

  return {
    add(issue: Issue, c: Classification) {
      done++;
      tokens += c.inputTokens;
      latencies.push(c.latencyMs);
      feed.push(line(issue, c));
      if (feed.length > FEED_LINES) feed.shift();
      if (!live) console.log(`#${issue.number} ${c.answers.category.choice} ${c.answers.skill.choice} ${c.latencyMs}ms`);
    },
    fail() {
      done++;
      failed++;
    },
    finish() {
      clearInterval(timer);
      if (live) {
        render();
        showCursor();
      }
    },
  };
}
