import assert from 'node:assert/strict';
import messages from '../src/locales/interfaceMessages.json';
import {interfaceText} from '../src/locales/interfaceText';
import {marketStatusText} from '../src/locales/marketStatusText';
import {translations} from '../src/locales';
for(const [source,values] of Object.entries(messages)){
 const placeholders=(v:string)=>[...v.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const lang of ['ar','uk','ru'] as const){assert.ok(values[lang]?.trim(),`${lang}: ${source}`);assert.deepEqual(placeholders(values[lang]),placeholders(source),`${lang} placeholders: ${source}`);}
}
for(const lang of ['ar','uk','ru'] as const){
 assert.equal(interfaceText('custom user drawing #987',lang),'custom user drawing #987');
 for(const key of Object.keys(translations.en).filter(k=>k.startsWith('reaction'))){assert.ok(translations[lang][key as keyof typeof translations.en]);}
 assert.ok(!marketStatusText('Closes in 2h 15m',lang).includes('Closes'));
 assert.ok(!marketStatusText('Holiday (Christmas Day)',lang).includes('Christmas'));
 assert.ok(!marketStatusText('Session closes at scheduled time in 5 minutes',lang).includes('minutes'));
 assert.ok(marketStatusText('Closes in 2h 15m',lang).includes('15'));
 assert.equal(interfaceText('Account ID: {p0}',lang,{p0:'12345'}).includes('12345'),true);
}
assert.equal(marketStatusText('Closes in 2h 15m','en'),'Closes in 2h 15m');
console.log(`PASS: ${Object.keys(messages).length} translation entries, placeholders, reaction labels, unknown content and market status in AR/UK/RU`);
