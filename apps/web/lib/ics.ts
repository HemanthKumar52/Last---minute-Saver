export interface IcsEvent {
  summary: string;
  start: number;
  end: number;
  allDay: boolean;
}

/** Parse an ICS value like 20260630T150000Z / 20260630T150000 / 20260630 → epoch ms. */
function parseIcsDate(value: string): number | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  const [, Y, Mo, D, h, mi, s, z] = m;
  if (h === undefined) return new Date(Number(Y), Number(Mo) - 1, Number(D)).getTime();
  if (z) return Date.UTC(Number(Y), Number(Mo) - 1, Number(D), Number(h), Number(mi), Number(s));
  return new Date(Number(Y), Number(Mo) - 1, Number(D), Number(h), Number(mi), Number(s)).getTime();
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

/**
 * Minimal but robust VEVENT parser: unfolds continued lines, then reads SUMMARY,
 * DTSTART and DTEND (handling VALUE=DATE / UTC / local). Recurrence is not expanded.
 */
export function parseICS(text: string): IcsEvent[] {
  // Unfold: lines starting with a space or tab continue the previous line.
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  const events: IcsEvent[] = [];
  let cur: { summary?: string; start?: number; end?: number; allDay?: boolean } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.summary && cur.start != null) {
        events.push({
          summary: cur.summary,
          start: cur.start,
          end: cur.end ?? cur.start + (cur.allDay ? 86_400_000 : 3_600_000),
          allDay: !!cur.allDay,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1).trim();
    const name = head.split(";")[0].toUpperCase();
    const isDateOnly = /VALUE=DATE(?!-TIME)/i.test(head);

    if (name === "SUMMARY") cur.summary = unescape(value);
    else if (name === "DTSTART") {
      cur.start = parseIcsDate(value) ?? undefined;
      if (isDateOnly) cur.allDay = true;
    } else if (name === "DTEND") {
      cur.end = parseIcsDate(value) ?? undefined;
    }
  }

  return events;
}
