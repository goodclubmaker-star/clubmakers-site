// GET /api/nangman/postcard/<token>/calendar — "도착일 알림 받기"
// An .ics event at the opening time with an alarm, so the recipient is
// reminded by their own calendar. No contact details are collected or stored.
import { error, findActive, hasBindings } from "../../../../../lib/nangman-postcard.js";

const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function onRequestGet({ request, params, env }) {
  if (!hasBindings(env)) return error(503, "unavailable");
  const found = await findActive(env, params.token);
  if (found.response) return found.response;
  if (found.row.opens_at == null) return error(404, "not_found");

  const opens = Number(found.row.opens_at);
  const link = `${new URL(request.url).origin}/nangman/postcard/?p=${params.token}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nangman Workshop//Nangman Postcard//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${found.idHash.slice(0, 32)}@nangman-postcard`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(opens)}`,
    `DTEND:${stamp(opens + 30 * 60 * 1000)}`,
    "SUMMARY:💌 낭만엽서가 도착해요",
    "DESCRIPTION:시간을 담아 보내는 편지가 도착했어요. 링크를 열어 확인해 보세요.",
    `URL:${link}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:낭만엽서가 도착했어요",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="nangman-postcard.ics"',
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
