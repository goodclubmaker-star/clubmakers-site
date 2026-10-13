// node --test scripts/nangman-postcard/layered-ink.test.mjs
// Ensures an outlined/wide handwriting stroke is one movement, not several
// repeated movements in the receiver's web replay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptiveTimeline } from "../../public/nangman/postcard/stroke-playback-20261013-c.js";

const stroke = (start, mode = "pad", group = 0, dx = 0) => ({
  mode, group, tool: "pen", color: "#222222FF", start,
  points: [[10 + dx, 20, 0, 7], [30 + dx, 50, 0.3, 7]],
});
const doc = (strokes) => ({ version: 1, canvas: { width: 1080, height: 1350 }, strokes });

test("outlined strokes animate at the exact same time", () => {
  const t = adaptiveTimeline(doc([stroke(0), stroke(0)]), 1);
  assert.equal(t.strokes.length, 2);
  assert.deepEqual(t.strokes[0].points.map(p => p.at), t.strokes[1].points.map(p => p.at));
  assert.equal(t.duration, 0.3);
});

test("three horizontally offset layers are a single gesture", () => {
  const strokes = [stroke(0, "direct", null, -2), stroke(0, "direct", null, 0), stroke(0, "direct", null, 2)];
  const t = adaptiveTimeline(doc(strokes), 1);
  assert.equal(t.strokes.length, 3);
  assert.deepEqual(t.strokes.map(s => s.points[1].at), [0.3, 0.3, 0.3]);
  assert.equal(t.duration, 0.3);
});

test("next handwritten glyph still follows the previous glyph", () => {
  const t = adaptiveTimeline(doc([stroke(0), stroke(0), stroke(0.8, "pad", 1)]), 1);
  assert.equal(t.strokes[0].points[1].at, 0.3);
  assert.equal(t.strokes[1].points[1].at, 0.3);
  assert.ok(t.strokes[2].points[0].at >= 0.8 - 1e-9);
});

test("auto mode continues to play pad strokes twice as fast", () => {
  const t = adaptiveTimeline(doc([stroke(0), stroke(0)]));
  assert.deepEqual(t.strokes.map(s => s.points[1].at), [0.15, 0.15]);
  assert.equal(t.duration, 0.15);
});
