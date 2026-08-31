import { LanguageCode } from '@/constants/languages';
import { getTranslation } from '@/constants/translations';

// Meal-plan weeks are real calendar weeks, Monday–Sunday, keyed by the ISO
// date (YYYY-MM-DD) of each day. Everything here is plain Date math so the
// planner needs no date library.

// Midnight, local time, of the Monday of the week containing `d`.
export function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string to a local-midnight Date.
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function thisMondayIso(): string {
  return isoDate(startOfWeek(new Date()));
}

// The 7 ISO dates Mon→Sun for the week whose Monday is `mondayIso`.
export function weekDates(mondayIso: string): string[] {
  const monday = fromIso(mondayIso);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return isoDate(d);
  });
}

export function addWeeks(mondayIso: string, n: number): string {
  const monday = fromIso(mondayIso);
  monday.setDate(monday.getDate() + n * 7);
  return isoDate(monday);
}

const WEEKDAY_KEYS = ['wdSun', 'wdMon', 'wdTue', 'wdWed', 'wdThu', 'wdFri', 'wdSat'] as const;
const MONTH_KEYS = [
  'monJan', 'monFeb', 'monMar', 'monApr', 'monMay', 'monJun',
  'monJul', 'monAug', 'monSep', 'monOct', 'monNov', 'monDec',
] as const;

export function weekdayName(iso: string, lang: LanguageCode | undefined | null): string {
  return getTranslation(lang, WEEKDAY_KEYS[fromIso(iso).getDay()]);
}

// "Mo · 1. Sep" (de) / "Mon · Sep 1" (en)
export function formatDayLabel(iso: string, lang: LanguageCode | undefined | null): string {
  const d = fromIso(iso);
  const wd = weekdayName(iso, lang).slice(0, lang === 'en' ? 3 : 2);
  const month = getTranslation(lang, MONTH_KEYS[d.getMonth()]);
  return lang === 'en' ? `${wd} · ${month} ${d.getDate()}` : `${wd} · ${d.getDate()}. ${month}`;
}

// "1.–7. Sep" (de) / "Sep 1 – 7" (en); spans months when needed.
export function formatWeekRange(mondayIso: string, lang: LanguageCode | undefined | null): string {
  const start = fromIso(mondayIso);
  const end = fromIso(addWeeks(mondayIso, 1));
  end.setDate(end.getDate() - 1);
  const sMon = getTranslation(lang, MONTH_KEYS[start.getMonth()]);
  const eMon = getTranslation(lang, MONTH_KEYS[end.getMonth()]);
  if (lang === 'en') {
    return start.getMonth() === end.getMonth()
      ? `${sMon} ${start.getDate()} – ${end.getDate()}`
      : `${sMon} ${start.getDate()} – ${eMon} ${end.getDate()}`;
  }
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}.–${end.getDate()}. ${sMon}`
    : `${start.getDate()}. ${sMon} – ${end.getDate()}. ${eMon}`;
}

export function isTodayIso(iso: string): boolean {
  return iso === isoDate(new Date());
}
