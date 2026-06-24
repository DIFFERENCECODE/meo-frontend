const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseBookingDateTime(day: string, slot: string, durationMins: number) {
  // day: "Mon 6 Jan"  slot: "09:00"
  const parts = day.split(' ');
  const dayNum = parseInt(parts[1], 10);
  const month = MONTH_MAP[parts[2]] ?? 0;
  // Use next occurrence of this month; assume 2026 for Jan-Jun, 2027 for Jul-Dec
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, dayNum);
  if (candidate < now) year += 1;

  const [hours, mins] = slot.split(':').map(Number);
  const start = new Date(year, month, dayNum, hours, mins, 0);
  const end = new Date(start.getTime() + durationMins * 60 * 1000);
  return { start, end };
}

function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function googleDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}

export function buildCalendarEvent(
  therapistName: string,
  day: string,
  slot: string,
  durationMins: number,
  note?: string,
): CalendarEvent {
  const { start, end } = parseBookingDateTime(day, slot, durationMins);
  return {
    title: `Session with ${therapistName}`,
    description: `Meo Marketplace therapy session with ${therapistName}.${note ? `\n\nNote: ${note}` : ''}`,
    location: 'Online (link sent by email)',
    start,
    end,
  };
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${googleDate(ev.start)}/${googleDate(ev.end)}`,
    details: ev.description,
    location: ev.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    startdt: ev.start.toISOString(),
    enddt: ev.end.toISOString(),
    body: ev.description,
    location: ev.location,
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

export function downloadICS(ev: CalendarEvent): void {
  const uid = `meo-${Date.now()}@meterbolic.com`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meterbolic//MeO Marketplace//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(ev.end)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${ev.location}`,
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: therapy session in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meo-session-${ev.start.toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
