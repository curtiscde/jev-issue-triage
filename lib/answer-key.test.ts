import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryFromTitle, declined, skillFromTitle, withoutPrefix } from './answer-key.ts';

const skills = ['grilling', 'setup-matt-pocock-skills', 'tdd', 'teach'];

test('declined: not planned and duplicates count, completed does not, open is unknown', () => {
  assert.equal(declined('not_planned'), true);
  assert.equal(declined('duplicate'), true);
  assert.equal(declined('completed'), false);
  assert.equal(declined(null), null);
  assert.equal(declined('reopened'), null);
});

test('skillFromTitle: a prefix naming a current skill', () => {
  assert.equal(skillFromTitle('grilling: ask fewer questions', skills), 'grilling');
  assert.equal(skillFromTitle('Setup-Matt-Pocock-Skills: fails on Windows', skills), 'setup-matt-pocock-skills');
});

test('skillFromTitle: "<name> skill:" prefixes', () => {
  assert.equal(skillFromTitle('tdd skill: run tests first', skills), 'tdd');
  assert.equal(skillFromTitle('Teach skill: more examples', skills), 'teach');
});

test('skillFromTitle: no prefix, or a skill that no longer exists', () => {
  assert.equal(skillFromTitle('Grilling asks too many questions', skills), null);
  assert.equal(skillFromTitle('prd: split into tickets', skills), null);
  assert.equal(skillFromTitle('bug: something broke', skills), null);
});

test('categoryFromTitle: conventional prefixes', () => {
  assert.equal(categoryFromTitle('bug: grilling loops forever'), 'bug');
  assert.equal(categoryFromTitle('Feature request: dark mode'), 'enhancement');
  assert.equal(categoryFromTitle('proposal: a retro skill'), 'enhancement');
  assert.equal(categoryFromTitle('New skill proposal: wizard'), 'enhancement');
  assert.equal(categoryFromTitle('question: how do I install?'), 'question');
});

test('categoryFromTitle: skill names and other prefixes say nothing about category', () => {
  assert.equal(categoryFromTitle('grilling: ask fewer questions'), null);
  assert.equal(categoryFromTitle('docs: typo'), null);
  assert.equal(categoryFromTitle('No prefix at all'), null);
});

test('withoutPrefix: removes the "<prefix>:" that gives the answer away', () => {
  assert.equal(withoutPrefix('grilling: ask fewer questions'), 'ask fewer questions');
  assert.equal(withoutPrefix('Feature request:dark mode'), 'dark mode');
  const late = 'A long title where the colon comes far too late: so it stays';
  assert.equal(withoutPrefix(late), late);
  assert.equal(withoutPrefix('Plain title'), 'Plain title');
});
