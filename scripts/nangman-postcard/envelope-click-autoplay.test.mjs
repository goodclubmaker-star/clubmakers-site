import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  CANVAS_W, CANVAS_H, adaptiveTimeline, isSupported,
} from "../../public/nangman/postcard/stroke-playback-20261013-c.js";

const html = readFileSync(new URL("../../public/nangman/postcard/index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../../public/nangman/postcard/player-20261016-aftertap-autoplay-a.js", import.meta.url), "utf8");
assert.match(html, /id="openEnvelope"/);
assert.match(html, /봉투를 눌러 열어 보세요/);
assert.match(html, /player-20261016-aftertap-autoplay-a\.js/);
assert.match(source, /openEnvelope"\)\.addEventListener\("click", openEnvelope\)/);
assert.match(source, /const PLAYBACK_SPEED = "3"/);
assert.doesNotMatch(source, /scheduleAutomaticOpen/);
const script = source.replace(/^import .*;\s*$/m, "");

function harness({ reducedMotion = false, sealed = false, empty = false } = {}) {
  const nodes = new Map();
  const timers = new Map();
  const frames = [];
  const events = new Map();
  let timerId = 0;
  const noop = () => {};
  const ctx = {
    setTransform: noop, clearRect: noop, drawImage: noop, beginPath: noop,
    arc: noop, fill: noop, moveTo: noop, lineTo: noop, stroke: noop,
  };
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const obj = {
      disabled: false, hidden: false, textContent: "", style: {}, width: 0, height: 0,
      href: "",
      classList: {
        add: (x) => classes.add(x),
        remove: (x) => classes.delete(x),
        contains: (x) => classes.has(x),
      },
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 320, height: 400 }),
      addEventListener: (name, cb) => { obj["on_" + name] = cb; },
      setAttribute: noop,
    };
    nodes.set(id, obj);
    return obj;
  }
  const document = {
    body: { dataset: { view: "loading" } }, hidden: false,
    getElementById: node, createElement: node,
    addEventListener: (name, cb) => events.set(name, cb),
  };
  const window = {
    location: { search: "?p=abcdefghijklmnopqrstuv" },
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (cb, ms) => { const id = ++timerId; timers.set(id, { cb, ms }); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: noop, clearInterval: noop,
    requestAnimationFrame: (cb) => frames.push(cb),
    addEventListener: noop,
  };
  const strokes = {
    version: 1,
    strokes: empty ? [] : [{
      mode: "direct", group: null, tool: "pen", color: "#000000FF", start: 0,
      points: [[10, 10, 0, 4], [30, 40, 3, 4]],
    }],
  };
  const response = sealed ? {
    sealed: true, from: "테스트", calendar: "/api/calendar",
    opensAt: new Date(Date.now() + 60_000).toISOString(),
  } : { format: "nangman-postcard", from: "테스트", strokes, background: "/background.jpg" };
  class ImageMock { async decode() {} }
  vm.runInNewContext(script, {
    window, document, Image: ImageMock, fetch: async () => ({
      ok: true, status: 200, json: async () => response,
    }),
    CANVAS_W, CANVAS_H, adaptiveTimeline, isSupported,
    URLSearchParams, Date, Intl, performance: { now: () => 100 },
  }, { filename: "player-20261016-aftertap-autoplay-a.js" });

  const timeout = (ms) => {
    const found = [...timers].find(([, item]) => item.ms === ms);
    assert.ok(found, `Expected ${ms}ms timer`);
    timers.delete(found[0]);
    found[1].cb();
  };
  return {
    document, node, frames, timers, timeout,
    async load() {
      // Both fetch().json() and image.decode() yield control.
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

for (const reducedMotion of [false, true]) {
  const t = harness({ reducedMotion });
  await t.load();
  assert.equal(t.document.body.dataset.view, "envelope", "a recipient must see the envelope");
  assert.equal(t.timers.size, 0, "loading alone must never automatically open the envelope");
  assert.equal(t.frames.length, 0, "loading alone must not play handwriting");
  t.node("openEnvelope").on_click();
  assert.equal(t.node("openEnvelope").classList.contains("is-open"), true);
  t.timeout(reducedMotion ? 0 : 1150);
  assert.equal(t.document.body.dataset.view, "player");
  assert.equal(t.node("playButton").textContent, "일시정지",
    "replay must be running immediately after opening, including Reduce Motion");
  assert.equal(t.frames.length, 1, "playback animation starts automatically");
}

{
  const t = harness({ empty: true });
  await t.load();
  t.node("openEnvelope").on_click();
  t.timeout(1150);
  assert.equal(t.document.body.dataset.view, "player");
  assert.equal(t.node("playButton").disabled, true, "empty postcards must not animate");
}

{
  const t = harness({ sealed: true });
  await t.load();
  assert.equal(t.document.body.dataset.view, "sealed");
  assert.equal(t.timers.size, 0, "sealed postcards must stay locked");
  assert.equal(t.frames.length, 0, "sealed postcards must never start handwriting");
}

console.log("PASS: envelope requires a tap; 3x handwriting autoplays afterward on iOS/Android shared web");
