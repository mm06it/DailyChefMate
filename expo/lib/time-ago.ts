// Compact relative timestamps for the social feed / inbox:
// "gerade eben", "vor 5 Min.", "vor 3 Std.", "vor 2 Tg.", "vor 4 Wo.", "vor 2 Mon."
// Word order lives in the translation string via a "%s" placeholder, so both
// DE ("vor %s Min.") and EN ("%s min ago") render correctly.

type Translate = (key: string) => string;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(ts: number, t: Translate, now: number = Date.now()): string {
  const sec = Math.max(0, (now - ts) / 1000);

  if (sec < MINUTE) return t("timeAgoNow");
  if (sec < HOUR) return t("timeAgoMin").replace("%s", String(Math.floor(sec / MINUTE)));
  if (sec < DAY) return t("timeAgoHour").replace("%s", String(Math.floor(sec / HOUR)));
  if (sec < WEEK) return t("timeAgoDay").replace("%s", String(Math.floor(sec / DAY)));
  if (sec < MONTH) return t("timeAgoWeek").replace("%s", String(Math.floor(sec / WEEK)));
  return t("timeAgoMonth").replace("%s", String(Math.max(1, Math.floor(sec / MONTH))));
}
