'use client';

// Starts a run and reads the streamed answers. Answers are buffered and flushed to React
// ten times a second, so 30+ answers a second don't mean 30+ renders a second.

import { useEffect, useRef, useState } from 'react';
import { lineSplitter } from '../lib/lines.ts';
import type { RunEvent } from './api/run/route.ts';

export type Answer = Extract<RunEvent, { type: 'answer' }>;

export function useTriageRun() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [errors, setErrors] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [fakeRun, setFakeRun] = useState(false); // what's on screen, even if the switch has moved since
  const buffer = useRef<Answer[]>([]);
  const started = useRef(0);
  const abort = useRef<AbortController | null>(null);

  // Leaving the page cancels the run, so the server stops calling Jev.
  useEffect(() => () => abort.current?.abort(), []);

  // While running: flush buffered answers and tick the clock.
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => {
      setElapsedMs(performance.now() - started.current);
      flush();
    }, 100);
    return () => clearInterval(timer);
  }, [status]);

  function flush() {
    if (!buffer.current.length) return;
    const fresh = buffer.current;
    buffer.current = [];
    setAnswers((prev) => [...prev, ...fresh]);
  }

  async function run(fake: boolean) {
    abort.current?.abort(); // a run still in progress is replaced, not merged
    const { signal } = (abort.current = new AbortController());
    buffer.current = [];
    setAnswers([]);
    setErrors(0);
    setTotal(0);
    setError(null);
    setFakeRun(fake);
    setElapsedMs(0);
    started.current = performance.now();
    setStatus('running');

    try {
      const res = await fetch(fake ? '/api/run?fake' : '/api/run', { method: 'POST', signal });
      if (!res.ok || !res.body) throw new Error((await res.text()) || `The server replied ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      const split = lineSplitter();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of split(value)) {
          const event = JSON.parse(line) as RunEvent;
          if (event.type === 'start') setTotal(event.total);
          else if (event.type === 'answer') buffer.current.push(event);
          else setErrors((n) => n + 1);
        }
      }
      setStatus('done');
    } catch (err) {
      if (signal.aborted) return; // replaced by a newer run, or the page closed: nothing to report
      setError((err as Error).message);
      setStatus('error');
    }
    flush();
    setElapsedMs(performance.now() - started.current);
  }

  return { status, error, total, answers, errors, elapsedMs, fakeRun, run };
}
