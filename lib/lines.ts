// Turns a stream of text chunks into whole lines. A chunk can end mid-line, so the unfinished
// tail is held back until the next chunk completes it. Used to read the page's streamed answers.

export function lineSplitter() {
  let partial = '';
  return (chunk: string): string[] => {
    const lines = (partial + chunk).split('\n');
    partial = lines.pop()!;
    return lines.filter(Boolean);
  };
}
