import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { adaptiveTimeline, CANVAS_W, CANVAS_H, isSupported } from "../../public/nangman/postcard/stroke-playback-20261013-c.js";

const html = readFileSync(new URL("../../public/nangman/postcard/index.html", import.meta.url), "utf8");
const player = readFileSync(new URL("../../public/nangman/postcard/player-20261016-autoplay-a.js", import.meta.url), "utf8");

assert.match(html, /player-20261016-autoplay-a\.js/);
assert.doesNotMatch(html, /player-20261015-fixed3x-a\.js/);
assert.match(player, /const PLAYBACK_SPEED = "3"/);
assert.match(player, /adaptiveTimeline\(data\.strokes, PLAYBACK_SPEED\)/);
assert.match(player, /scheduleAutomaticOpen\(\);/);
assert.doesNotMatch(player, /speedSelect|playbackPreset/);

// Exercise the actual recipient player in a tiny mocked mobile browser.
// No headless browser or live API is needed; timers can be advanced deliberately.
function harness({ hidden = false, sealed = false, noStrokes = false, reduceMotion = false } = {}) {
  const timers = new Map();
  const intervals = new Map();
  const listeners = new Map();
  const nodes = new Map();
  const frames = [];
  let timerID = 0;
  const canvasContext = {
    setTransform() {}, clearRect() {}, drawImage() {}, beginPath() {},
    arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {},
  };
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const elem = {
      textContent: "", style: {}, disabled: false, hidden: false,
      href: "", width: 0, height: 0,
      classList: {
        add: (x) => classes.add(x),
        remove: (x) => classes.delete(x),
        contains: (x) => classes.has(x),
      },
      addEventListener: (name, cb) => { elem["on_" + name] = cb; },
      setAttribute() {},
      getContext: () => canvasContext,
      getBoundingClientRect: () => ({ width: 320, height: 400 }),
    };
    nodes.set(id, elem);
    return elem;
  }
  const doc = {
    hidden, body: { dataset: { view: "loading" } },
    getElementById: node,
    createElement: (tag) => node("_" + tag),
    addEventListener: (event, callback) => listeners.set(event, callback),
  };
  const window = {
    location: { search: "?p=abcdefghijklmnopqrstuv" },
    matchMedia: () => ({ matches: reduceMotion }),
    setTimeout: (callback, delay) => { const id = ++timerID; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (callback, delay) => { const id = ++timerID; intervals.set(id, { callback, delay }); return id; },
    clearInterval: (id) => intervals.delete(id),
    requestAnimationFrame: (callback) => { frames.push(callback); },
    addEventListener: (event, callback) => listeners.set("window:" + event, callback),
    devicePixelRatio: 2,
  };
  const strokes = {
    version: 1,
    strokes: noStrokes ? [] : [{
      mode: "direct", group: null, tool: "pen", color: "#000000FF", start: 0,
      points: [[50, 50, 0, 6], [100, 100, 3, 6]],
    }],
  };
  const payload = sealed ? {
    sealed: true, opensAt: new Date(Date.now() + 60_000).toISOString(),
    calendar: "/nangman/calendar/test.ics",
  } : {
    format: "nangman-postcard",
    from: "보낸 사람",
    background: "/background.jpg",
    strokes,
  };
  class FakeImage {
    async decode() { return undefined; }
  }
  const source = player.replace(/^import .*;\s*$/m, "");
  vm.runInNewContext(source, {
    document: doc, window, Image: FakeImage,
    URLSearchParams, Intl, Date,
    performance: { now: () => 0 },
    fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    CANVAS_W, CANVAS_H, isSupported, adaptiveTimeline,
    setTimeout: (cb, n) => window.setTimeout(cb, n),
    clearTimeout: (id) => window.clearTimeout(id),
    requestAnimationFrame: window.requestAnimationFrame,
  }, { filename: "player-20261016-autoplay-a.js" });

  function fireTimeout(expectedDelay) {
    const entry = [...timers].find(([, item]) => item.delay === expectedDelay);
    assert.ok(entry, `Expected timer ${expectedDelay}ms`);
    timers.delete(entry[0]);
    entry[1].callback();
  }
  return {
    doc, node, timers, intervals, listeners, frames, fireTimeout,
    async ready() {
      for (let i = 0; i < 8; i++) await Promise.resolve();
    },
    clickEnvelope() { node("openEnvelope").on_click(); },
    showTab() { doc.hidden = false; listeners.get("visibilitychange")?.(); },
    hideTab() { doc.hidden = true; listeners.get("visibilitychange")?.(); },
  };
}

{
  const t = harness();
  await t.ready();
  assert.equal(t.doc.body.dataset.view, "envelope", "valid link shows envelope first");
  t.fireTimeout(180);
  assert.ok(t.node("openEnvelope").classList.contains("is-open"), "envelope automatically opens");
  t.fireTimeout(1150);
  assert.equal(t.doc.body.dataset.view, "player", "player automatically displays");
  assert.equal(t.node("playButton").textContent, "일시정지", "3x ink playback starts without touch");
  assert.equal(t.frames.length, 1, "animation frame is scheduled");
}
{
  const t = harness({ hidden: true });
  await t.ready();
  assert.equal(t.doc.body.dataset.view, "envelope");
  assert.equal(t.timers.size, 0, "do not open a hidden messenger preview");
  t.showTab();
  t.fireTimeout(180);
  t.fireTimeout(1150);
  assert.equal(t.doc.body.dataset.view, "player", "opens once recipient returns");
}
{
  const t = harness();
  await t.ready();
  t.hideTab();
  assert.equal(t.timers.size, 0, "cancel queued autoplay on backgrounding");
  t.showTab();
  t.clickEnvelope();
  assert.ok(t.node("openEnvelope").classList.contains("is-open"), "manual open still works");
  assert.equal(t.timers.size, 1, "manual tap cancels automatic open to avoid double start");
  t.fireTimeout(1150);
  assert.equal(t.doc.body.dataset.view, "player");
}
{
  const t = harness({ sealed: true });
  await t.ready();
  assert.equal(t.doc.body.dataset.view, "sealed", "scheduled postcard stays sealed");
  assert.equal(t.timers.size, 0, "no auto-unlock before opening time");
  assert.equal(t.intervals.size, 1, "countdown preserved");
}
{
  const t = harness({ noStrokes: true });
  await t.ready();
  t.fireTimeout(180);
  t.fireTimeout(1150);
  assert.equal(t.doc.body.dataset.view, "player");
  assert.equal(t.node("playButton").disabled, true, "blank postcard does not spin");
}
{
  const t = harness({ reduceMotion: true });
  await t.ready();
  t.fireTimeout(180);
  t.fireTimeout(0);
  assert.equal(t.doc.body.dataset.view, "player");
  assert.equal(t.node("playButton").textContent, "이어 보기",
    "the existing reduced-motion accessibility preference is respected");
}

console.log("PASS: recipient autoplay, iOS/Android shared URL, background handling, manual open, sealed & reduced-motion guards");
