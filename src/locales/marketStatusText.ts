import type { LanguageCode } from './types';
import { interfaceText } from './interfaceText';

// Presentation only: the schedule engine keeps its canonical states and timestamps.
const templates = [
  'Closes in {time}', 'Opens in {time}', 'Session active. Closes in {time}',
  'Session closes at scheduled time in {minutes} minutes',
  'Next trading session begins in {minutes} minutes at {date}',
  'Opens {date} ({time})', 'Holiday ({holiday})', 'Market closed for {holiday}.',
  'Closed for {holiday}. Resumes {date} (in {time})', 'Trading resumes {date} (in {time})',
].map(template => {
  const names: string[] = [];
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\\\{(\w+)\\\}/g, (_, name) => { names.push(name); return '(.+?)'; });
  return { template, names, pattern: new RegExp(`^${pattern}$`) };
});

export function marketStatusText(value: string, language: LanguageCode): string {
  if (language === 'en') return value;
  const units = language === 'ar' ? ['ي', 'س', 'د', 'ث'] : language === 'uk' ? ['д', 'год', 'хв', 'с'] : ['д', 'ч', 'мин', 'с'];
  const duration = (text: string) => text.replace(/(\d+)\s*(min|d|h|m|s)\b/g, (_, n, unit) => `${n} ${units[{ d: 0, h: 1, m: 2, min: 2, s: 3 }[unit]!]}`);
  const dateText = (text: string) => text.replace(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/g, day => new Intl.DateTimeFormat(language, {weekday: 'short', timeZone: 'UTC'}).format(new Date(Date.UTC(2026, 0, 4 + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day)))));
  for (const { template, names, pattern } of templates) {
    const match = value.match(pattern);
    if (!match) continue;
    const params = Object.fromEntries(names.map((name, i) => [name, name === 'time' ? duration(match[i + 1]) : name === 'date' ? dateText(match[i + 1]) : interfaceText(match[i + 1], language)]));
    return interfaceText(template, language, params);
  }
  return dateText(interfaceText(value, language));
}
