import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptiveTimeline } from "../../public/nangman/postcard/stroke-playback-20261013-c.js";

// The recipient page must always use one, non-editable 3x timeline.
const page = readFileSync(new URL("../../public/nangman/postcard/index.html", import.meta.url), "utf8");
const player = readFileSync(new URL("../../public/nangman/postcard/player-20261015-fixed3x-a.js", import.meta.url), "utf8");
assert.match(page, /player-20261015-fixed3x-a\\.js/);
assert.doesNotMatch(page, /speedSelect|speed-row|speed-select|재생 속도/);
assert.match(player, /const PLAYBACK_SPEED = "3"/);
assert.match(player, /adaptiveTimeline\\(data\\.strokes, PLAYBACK_SPEED\\)/);
assert.doesNotMatch(player, /speedSelect|playbackPreset|addEventListener\\("change",/);

const stroke = (mode, start, duration) => ({
  mode, start, duration, tool: "pen", color: "#000000FF",
  points: [[0, 0, 0, 4], [10, 10, duration, 4]],
});
const doc = { version: 1, strokes: [stroke("direct", 0, 3), stroke("pad", 4, 3)] };
const replay = adaptiveTimeline(doc, "3");
assert.ok(replay.duration > 0);
assert.ok(replay.duration < adaptiveTimeline(doc, "2").duration);
assert.equal(replay.strokes[0].points.at(-1).at, 1);
assert.equal(replay.strokes[1].points.at(-1).at, replay.duration);

console.log("PASS: postcard recipient fixed 3x, no speed UI, layered timing contract untouched");
