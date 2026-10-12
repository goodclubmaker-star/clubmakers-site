// 웹 재생기가 앱(Swift)·참조 구현(Python)과 같은 숫자를 내는지 확인한다.
// 실행: node scripts/nangman-postcard/golden.test.mjs
// 골든 파일: nangman-postcard-ios docs/fixtures/stroke-v1-golden.json 사본
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  sanitizeStroke, playbackStarts, playbackDuration, fit, isSupported, cssColor, timeline,
} from "../../public/nangman/postcard/stroke-playback-20261012-a.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const data = JSON.parse(readFileSync(here + "stroke-v1-golden.json", "utf8"));
const doc = data.document;
const exp = data.expected;
const r = (xs) => xs.map((v) => Math.round(v * 1e6) / 1e6);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failed = 0;
const check = (name, ok, info) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) { failed += 1; console.log("   ", info); }
};

const times = doc.strokes.map((s) => sanitizeStroke(s).points.map((p) => p[2]));
check("rule S point times", eq(times, exp.sanitizedPointTimes), times);
check("rule P playbackStarts", eq(r(playbackStarts(doc.strokes)), exp.playbackStarts), playbackStarts(doc.strokes));
check("rule P duration", Math.round(playbackDuration(doc.strokes) * 1e6) / 1e6 === exp.playbackDuration, playbackDuration(doc.strokes));
check("rule P speed 2", eq(r(playbackStarts(doc.strokes, 0.6, 2)), exp.playbackStartsSpeed2), playbackStarts(doc.strokes, 0.6, 2));
for (const [name, [w, h]] of Object.entries(data.fitCases)) {
  check(`rule F ${name}`, eq(r(fit(w, h)), exp.fit[name]), fit(w, h));
}

// Monotonic starts under random data (same property as the Swift/Python fuzz).
let mono = true;
for (let n = 0; n < 5000 && mono; n++) {
  const strokes = Array.from({ length: 1 + Math.floor(Math.random() * 8) }, () => ({
    start: Math.random() * 13 - 3,
    points: Array.from({ length: Math.floor(Math.random() * 5) }, () => [0, 0, Math.random() * 3 - 1, 1]),
  }));
  const st = playbackStarts(strokes);
  mono = st.every((v, i) => i === 0 || v >= st[i - 1]);
}
check("starts never decrease (5000 random docs)", mono);

check("version policy", isSupported(doc) && !isSupported({ ...doc, version: 2 }) && !isSupported({ ...doc, version: 0 }));
check("color", cssColor("#1E66F5CC") === "rgba(30,102,245,0.8)" && cssColor("bad") === "rgba(0,0,0,1)", cssColor("#1E66F5CC"));
const tl = timeline(doc);
check("timeline last point = duration", Math.abs(Math.max(...tl.strokes.flatMap((s) => s.points.map((p) => p.at))) - tl.duration) < 1e-9);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
