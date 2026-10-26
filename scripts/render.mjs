#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const usage = `Usage: node scripts/render.mjs INPUT.json OUTPUT.svg

Input: person, ticker, title, note, birthDate, periods (1–4), optional
portrait, and events (2–25). Each event needs date (YYYY, YYYY-MM, or
YYYY-MM-DD), title, summary, value (0–100), and kind (up/down/neutral).
chartLabel: true annotates it inside the plot. Periods need startYear,
endYear, and label; they must cover all events without overlapping.
The image shows years only; exact source dates remain in the input data.
The array is chronological; coarse dates that overlap may follow a more
precise date in the same period.
`;

if (process.argv.includes('--help') || process.argv.length !== 4) {
  process.stdout.write(usage);
  process.exit(process.argv.includes('--help') ? 0 : 1);
}

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const required = (o, k) => { if (typeof o[k] !== 'string' || !o[k].trim()) throw Error(`Missing ${k}`); };
['person','ticker','title','note','birthDate'].forEach(k => required(data,k));
if (!Array.isArray(data.events) || data.events.length < 2 || data.events.length > 25) throw Error('Need 2–25 events');
if (!Array.isArray(data.periods) || data.periods.length < 1 || data.periods.length > 4) throw Error('Need 1–4 periods');

function parseDate(date) {
  if (typeof date !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(date)) throw Error(`Invalid date: ${date}`);
  const [year,month,day] = date.split('-').map(Number);
  const m = month ?? 1, d = day ?? 1;
  const check = new Date(Date.UTC(year,m-1,d));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== m-1 || check.getUTCDate() !== d) throw Error(`Invalid date: ${date}`);
  const next = month === undefined ? Date.UTC(year+1,0,1) : day === undefined ? Date.UTC(year,m,1) : Date.UTC(year,m-1,d+1);
  const start = Date.UTC(year,m-1,d);
  return {start, end:next-1, midpoint:(start+next-1)/2, year, month, day};
}

const birth=parseDate(data.birthDate);
let prev;
const events = data.events.map((e,i) => {
  for (const k of ['date','title','summary']) required(e,k);
  const date = parseDate(e.date);
  if (!Number.isFinite(e.value) || e.value < 0 || e.value > 100) throw Error(`Invalid index at event ${i+1}`);
  if (!['up','down','neutral'].includes(e.kind)) throw Error(`Invalid kind at event ${i+1}`);
  if (prev && date.end < prev.start) throw Error(`Certain timeline inversion at event ${i+1}`);
  prev = date;
  return {...e, dateInfo:date};
});
const firstYear=events[0].dateInfo.year,lastYear=events.at(-1).dateInfo.year;
let previousEnd=firstYear-1;
for(const [i,p] of data.periods.entries()){
  required(p,'label');
  if(!Number.isInteger(p.startYear)||!Number.isInteger(p.endYear)||p.startYear>p.endYear||p.startYear<=previousEnd||p.startYear<firstYear||p.endYear>lastYear) throw Error(`Invalid period ${i+1}`);
  previousEnd=p.endYear;
}
for(const e of events){
  if(!data.periods.some(p=>p.startYear<=e.dateInfo.year && e.dateInfo.year<=p.endYear)) throw Error(`Event outside periods: ${e.date}`);
}
if (birth.start > events[0].dateInfo.end) throw Error('Birth date is after first event');

function ageAt(date) {
  const dateMonth=date.month ?? 7, dateDay=date.day ?? 1;
  const birthMonth=birth.month ?? 7, birthDay=birth.day ?? 1;
  const years=date.year-birth.year-((dateMonth<birthMonth||(dateMonth===birthMonth&&dateDay<birthDay))?1:0);
  const approximate=!birth.month||!birth.day||!date.month||(date.month===birth.month&&!date.day);
  return `${approximate?'约':''}${Math.max(0,years)}岁`;
}
const yearAge=e=>`${e.dateInfo.year} · ${ageAt(e.dateInfo)}`;
const axisAge=year=>`${year} · ${ageAt(parseDate(String(year).padStart(4,'0')))}`;

const W=1600, H=1500, x0=105, x1=1505, yTop=330, yBase=750;
const start=events[0].dateInfo.start, end=events.at(-1).dateInfo.end;
const rawX = t => x0 + (t-start)/(end-start)*(x1-x0);
let lastX=-Infinity;
events.forEach((e,i) => {
  const raw=rawX(e.dateInfo.midpoint);
  e.x=Math.min(x1, Math.max(raw, lastX+(i ? 8 : 0)));
  e.y=yBase-e.value/100*(yBase-yTop);
  lastX=e.x;
});
const colors={up:'#078d55',down:'#e73336',neutral:'#78808d'};
const out=[];
const put=s=>out.push(s);
const text=(x,y,s,size=18,fill='#111827',weight=400,extra='')=>put(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${esc(s)}</text>`);
function wrap(s,max=22,lines=2) {
  const chars=[...s], result=[];
  while(chars.length && result.length<lines){
    let row='';
    while(chars.length && [...row].reduce((n,c)=>n+(c.charCodeAt(0)>255?1.7:1),0) < max){row+=chars.shift();}
    result.push(row);
  }
  if(chars.length) result[result.length-1]=result.at(-1).slice(0,-1)+'…';
  return result;
}
put(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.title)}" font-family="PingFang SC, Hiragino Sans GB, Arial Unicode MS, sans-serif">`);
put(`<defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#f7f8f7"/></linearGradient><linearGradient id="area" x2="0" y2="1"><stop stop-color="#33b47d" stop-opacity=".23"/><stop offset="1" stop-color="#33b47d" stop-opacity=".025"/></linearGradient></defs>`);
put(`<rect width="${W}" height="${H}" fill="url(#paper)"/>`);
put(`<rect x="52" y="30" width="9" height="31" rx="4" fill="#078d55"/>`);
text(73,52,'LIFE / STOCK',20,'#078d55',800,'letter-spacing="3"');
text(55,126,data.title,60,'#0c1110',800);
if(data.portrait){
  const p=path.resolve(path.dirname(inputPath),data.portrait);
  const bytes=fs.readFileSync(p);
  const mime=p.toLowerCase().endsWith('.jpg')||p.toLowerCase().endsWith('.jpeg')?'image/jpeg':'image/png';
  put(`<image x="1243" y="8" width="305" height="275" preserveAspectRatio="xMidYMid meet" href="data:${mime};base64,${bytes.toString('base64')}"/>`);
}
text(59,294,'人生走势',32,'#111827',800);
text(235,293,'图上年份只精确到年  /  指数是主观叙事设定',18,'#7c858d');
text(60,538,`${esc(data.ticker)} 指数`,19,'#4b5563',700,'transform="rotate(-90 60 538)"');
for(let v=0;v<=100;v+=20){
  const y=yBase-v/100*(yBase-yTop);
  put(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${v===0?'#aeb8b2':'#e7eae9'}" stroke-width="${v===0?2:1}"/>`);
  text(75,y+6,v,17,'#79848b',500,'text-anchor="end"');
}
for(let yr=Math.ceil((firstYear+1)/10)*10;yr<lastYear;yr+=10){
  const x=rawX(Date.UTC(yr,0,1));
  if(x-x0<105 || x1-x<105) continue;
  put(`<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBase}" stroke="#eef0ef"/>`);
  text(x,yBase+29,axisAge(yr),15,'#707b82',500,'text-anchor="middle"');
}
const poly=`${x0},${yBase} `+events.map(e=>`${e.x.toFixed(1)},${e.y.toFixed(1)}`).join(' ')+` ${events.at(-1).x},${yBase}`;
put(`<polygon points="${poly}" fill="url(#area)"/>`);
for(let i=1;i<events.length;i++){
  const a=events[i-1], b=events[i];
  put(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${colors[b.kind]}" stroke-width="4.5" stroke-linecap="round"/>`);
}
events.forEach(e=>put(`<circle cx="${e.x}" cy="${e.y}" r="${e.chartLabel?8:5.5}" fill="${colors[e.kind]}" stroke="#fff" stroke-width="3"/>`));

const occupied=[];
function overlap(a,b){return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
for(const e of events.filter(e=>e.chartLabel)){
  const w=Math.min(192,Math.max(136,[...e.title].length*15+23)),h=50;
  const attempts=[
    [e.x-w/2,e.y-82],[e.x-w/2,e.y+26],[e.x-w-18,e.y-58],
    [e.x+18,e.y-58],[e.x-w/2,e.y-135],[e.x-w/2,e.y+75],
    [e.x-w-18,e.y+14],[e.x+18,e.y+14]
  ];
  let best=null,score=Infinity;
  for(const [ax,ay] of attempts){
    const r={x:Math.max(x0+3,Math.min(x1-w-3,ax)),y:Math.max(yTop+5,Math.min(yBase-h-7,ay)),w,h};
    const collisions=occupied.filter(o=>overlap(o,r)).length;
    const cost=collisions*1000+Math.abs(r.x+w/2-e.x)*.15+Math.abs(r.y+h/2-e.y)*.08;
    if(cost<score){best=r;score=cost;}
  }
  occupied.push(best);
  const cx=best.x+w/2,cy=best.y+h/2;
  put(`<line x1="${e.x}" y1="${e.y}" x2="${cx}" y2="${cy}" stroke="#9ca7a6" stroke-width="1.3"/>`);
  put(`<rect x="${best.x}" y="${best.y}" width="${w}" height="${h}" rx="8" fill="#fff" fill-opacity=".93" stroke="#e4e8e6"/>`);
  text(best.x+10,best.y+19,yearAge(e),14,colors[e.kind],700);
  text(best.x+10,best.y+40,e.title,16,'#17221d',700);
}
function curveYAt(x){
  for(let i=1;i<events.length;i++){
    const a=events[i-1],b=events[i];
    if(x<=b.x){
      const t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));
      return a.y+(b.y-a.y)*t;
    }
  }
  return events.at(-1).y;
}
for(const p of data.periods){
  const mid=(rawX(Date.UTC(p.startYear,0,1))+rawX(Date.UTC(p.endYear+1,0,1)))/2;
  const x=Math.max(x0+65,Math.min(x1-65,mid)), y=curveYAt(x);
  const w=Math.max(100,Math.min(190,[...p.label].length*17+28)),h=34;
  const attempts=[
    [x-w/2,y-63],[x-w/2,y-108],[x-w/2,y+23],
    [x-w/2-48,y-63],[x-w/2+48,y-63],
    [x-w/2,y-153],[x-w/2-48,y-108],[x-w/2+48,y-108]
  ];
  let best=null,score=Infinity;
  for(const [ax,ay] of attempts){
    const r={x:Math.max(x0+3,Math.min(x1-w-3,ax)),y:Math.max(yTop+4,Math.min(yBase-h-7,ay)),w,h};
    const collisions=occupied.filter(o=>overlap(o,r)).length;
    const cost=collisions*1000+Math.abs(r.x+w/2-x)*.18+Math.abs(r.y+h/2-y)*.08+(r.y>y?30:0);
    if(cost<score){best=r;score=cost;}
  }
  occupied.push(best);
  put(`<rect data-role="period-label" x="${best.x}" y="${best.y}" width="${w}" height="${h}" rx="17" fill="#eef7f2" fill-opacity=".96" stroke="#9ecab1"/>`);
  text(best.x+w/2,best.y+23,p.label,16,'#176847',700,'text-anchor="middle"');
}
text(x0,yBase+29,yearAge(events[0]),15,'#707b82',600,'text-anchor="middle"');
text(x1,yBase+29,yearAge(events.at(-1)),15,'#707b82',600,'text-anchor="middle"');
text(54,841,'时间轴 / 大事件',34,'#111827',800);
put(`<line x1="326" y1="829" x2="1548" y2="829" stroke="#a4acb3" stroke-width="2"/>`);
put(`<circle cx="326" cy="829" r="5" fill="#a4acb3"/>`);
const colX=[55,557,1059],colW=480,rowY=878,rowH=57;
const counts=[Math.ceil(events.length/3),Math.ceil((events.length-Math.ceil(events.length/3))/2)];
counts.push(events.length-counts[0]-counts[1]);
let offset=0;
for(let col=0;col<3;col++){
  const items=events.slice(offset,offset+counts[col]);
  items.forEach((e,j)=>{
    const x=colX[col], y=rowY+j*rowH;
    put(`<circle cx="${x+17}" cy="${y-7}" r="16" fill="${colors[e.kind]}"/>`);
    text(x+17,y-1,String(offset+j+1),16,'#fff',800,'text-anchor="middle"');
    text(x+45,y-1,yearAge(e),16,colors[e.kind],700);
    text(x+178,y-1,e.title,17,'#111827',750);
    const lines=wrap(e.summary,31,2);
    lines.forEach((line,k)=>text(x+178,y+18+k*16,line,14,'#5d6870'));
  });
  offset+=items.length;
  if(col<2)put(`<line x1="${colX[col]+493}" y1="866" x2="${colX[col]+493}" y2="1379" stroke="#d7dcde"/>`);
}
put(`<rect x="43" y="1404" width="1514" height="62" rx="12" fill="#eef1ef"/>`);
text(59,1429,data.note,16,'#5b646b');
text(59,1453,`${data.ticker}  ·  ${data.ending ?? ''}`,17,'#26312a',700);
put('</svg>');
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,out.join('\n'));
process.stdout.write(`${outputPath}\n`);
