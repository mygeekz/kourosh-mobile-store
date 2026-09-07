#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'styles/themes.css'), 'utf8');
const outputIndex = process.argv.indexOf('--output');
const outputDir = path.resolve(root, outputIndex >= 0 && process.argv[outputIndex + 1]
  ? process.argv[outputIndex + 1]
  : 'docs/palette-token-preview-stage21');
const imagesDir = path.join(outputDir, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

const palettes = [
  ['aurora', 'لوکس اجرایی'],
  ['classic', 'کلاسیک iOS'],
  ['ocean', 'اقیانوس مدرن'],
  ['sunset', 'فروش پرانرژی'],
  ['midnight', 'شب حرفه‌ای'],
  ['gold', 'طلایی مات'],
];
const themes = [['light', 'روشن'], ['dark', 'تاریک']];
const viewports = [
  ['mobile', 'موبایل', 390, 844],
  ['tablet', 'تبلت', 768, 1024],
  ['desktop', 'دسکتاپ', 1440, 900],
];

const readBlock = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  if (!match) throw new Error(`Palette selector not found: ${selector}`);
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/--([a-z0-9-]+):\s*([^;]+);/i);
    if (entry) values[entry[1]] = entry[2].trim();
  }
  return values;
};

const parseRgb = value => value.split(/\s+/).map(Number).slice(0, 3);
const hslToRgb = value => {
  const match = value.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!match) return [0, 0, 0];
  let h = Number(match[1]) / 360; const s = Number(match[2]) / 100; const l = Number(match[3]) / 100;
  if (s === 0) return [l, l, l].map(v => Math.round(v * 255));
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q; if (t < 2/3) return p+(q-p)*(2/3-t)*6; return p; };
  const q = l < .5 ? l*(1+s) : l+s-l*s; const p = 2*l-q;
  return [hue2rgb(p,q,h+1/3), hue2rgb(p,q,h), hue2rgb(p,q,h-1/3)].map(v => Math.round(v*255));
};
const rgb = parts => `rgb(${parts.join(' ')})`;
const hex = parts => `#${parts.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')}`;
const escapeXml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const luminance = color => color.map(v => { const x=v/255; return x <= .03928 ? x/12.92 : ((x+.055)/1.055)**2.4; }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };

const common = readBlock(':root');
const results=[];
for (const [palette, paletteLabel] of palettes) {
  for (const [theme, themeLabel] of themes) {
    const selector = theme === 'dark' ? `:root[data-theme='dark'][data-palette='${palette}']` : `:root[data-palette='${palette}']`;
    const values = { ...common, ...readBlock(selector) };
    const page = parseRgb(values['palette-page-rgb']);
    const surface = parseRgb(values['palette-surface-rgb']);
    const muted = parseRgb(values['palette-surface-muted-rgb']);
    const elevated = parseRgb(values['palette-surface-elevated-rgb']);
    const text = parseRgb(values['palette-text-rgb']);
    const secondary = parseRgb(values['palette-text-secondary-rgb']);
    const border = parseRgb(values['palette-border-subtle-rgb']);
    const primary = hslToRgb(values['palette-primary']);
    const primary2 = hslToRgb(values['palette-primary-hover']);
    const success = theme === 'dark' ? [74,222,128] : [21,128,61];
    const warning = theme === 'dark' ? [251,191,36] : [180,83,9];
    const danger = theme === 'dark' ? [248,113,113] : [185,28,28];

    for (const [viewport, viewportLabel, width, height] of viewports) {
      const margin = Math.max(14, Math.round(width * .018));
      const sidebarW = viewport === 'desktop' ? 220 : 0;
      const gap = 14;
      const mainX = margin + (sidebarW ? sidebarW + gap : 0);
      const mainW = width - mainX - margin;
      const headerH = 74;
      const cardGap = 14;
      const cols = viewport === 'mobile' ? 1 : 2;
      const cardW = cols === 1 ? mainW : (mainW-cardGap)/2;
      const cardH = viewport === 'mobile' ? 188 : 214;
      const y1 = margin + headerH + gap;
      const y2 = y1 + cardH + gap;
      const tableH = Math.min(250, height-y2-margin);
      const textContrast = contrast(text,page);
      const cardContrast = contrast(text,surface);
      const buttonContrast = contrast([255,255,255],primary);
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="primary" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${hex(primary)}"/><stop offset="1" stop-color="${hex(primary2)}"/></linearGradient></defs>
  <rect width="${width}" height="${height}" fill="${hex(page)}"/>
  ${sidebarW ? `<rect x="${margin}" y="${margin}" width="${sidebarW}" height="${height-margin*2}" rx="24" fill="${hex(surface)}" stroke="${hex(border)}"/><circle cx="${margin+32}" cy="${margin+34}" r="14" fill="${hex(primary)}"/>${[0,1,2,3,4,5].map((_,i)=>`<rect x="${margin+18}" y="${margin+72+i*52}" width="${sidebarW-36}" height="38" rx="14" fill="${i===0?hex(muted):hex(surface)}" stroke="${hex(border)}"/>`).join('')}` : ''}
  <rect x="${mainX}" y="${margin}" width="${mainW}" height="${headerH}" rx="22" fill="${hex(surface)}" stroke="${hex(border)}"/>
  <rect x="${mainX+18}" y="${margin+18}" width="${Math.min(250,mainW*.35)}" height="14" rx="7" fill="${hex(text)}" opacity=".92"/>
  <rect x="${mainX+18}" y="${margin+43}" width="${Math.min(180,mainW*.26)}" height="9" rx="4.5" fill="${hex(secondary)}" opacity=".7"/>
  <rect x="${mainX+mainW-128}" y="${margin+19}" width="108" height="34" rx="17" fill="${hex(success)}" opacity=".16" stroke="${hex(success)}"/>
  ${[0,1].slice(0,cols).map(i=>`<rect x="${mainX+i*(cardW+cardGap)}" y="${y1}" width="${cardW}" height="${cardH}" rx="22" fill="${hex(surface)}" stroke="${hex(border)}"/>`).join('')}
  <rect x="${mainX+16}" y="${y1+18}" width="${Math.min(170,cardW*.55)}" height="13" rx="6" fill="${hex(text)}" opacity=".9"/>
  <rect x="${mainX+16}" y="${y1+44}" width="${cardW-32}" height="44" rx="14" fill="${hex(muted)}" stroke="${hex(border)}"/>
  <rect x="${mainX+16}" y="${y1+102}" width="${Math.min(150,cardW-32)}" height="46" rx="16" fill="url(#primary)"/>
  <rect x="${mainX+180}" y="${y1+102}" width="${Math.max(90,Math.min(150,cardW-196))}" height="46" rx="16" fill="${hex(elevated)}" stroke="${hex(border)}"/>
  ${cols===2?`<rect x="${mainX+cardW+cardGap+16}" y="${y1+18}" width="${Math.min(160,cardW*.5)}" height="13" rx="6" fill="${hex(text)}" opacity=".9"/><rect x="${mainX+cardW+cardGap+16}" y="${y1+50}" width="${cardW-32}" height="46" rx="16" fill="${hex(elevated)}" stroke="${hex(border)}"/><rect x="${mainX+cardW+cardGap+16}" y="${y1+110}" width="${cardW-32}" height="46" rx="16" fill="${hex(muted)}" stroke="${hex(border)}"/>`:''}
  <rect x="${mainX}" y="${y2}" width="${mainW}" height="${tableH}" rx="22" fill="${hex(surface)}" stroke="${hex(border)}"/>
  <rect x="${mainX+1}" y="${y2+1}" width="${mainW-2}" height="46" rx="21" fill="${hex(muted)}"/>
  ${[0,1,2].map((_,i)=>`<line x1="${mainX+16}" y1="${y2+47+i*50}" x2="${mainX+mainW-16}" y2="${y2+47+i*50}" stroke="${hex(border)}"/><rect x="${mainX+18}" y="${y2+63+i*50}" width="${Math.min(130,mainW*.22)}" height="10" rx="5" fill="${hex(secondary)}" opacity=".55"/><rect x="${mainX+mainW-96}" y="${y2+57+i*50}" width="72" height="24" rx="12" fill="${hex([success,warning,danger][i])}" opacity=".18" stroke="${hex([success,warning,danger][i])}"/>`).join('')}
  <text x="${mainX+mainW-18}" y="${margin+29}" text-anchor="end" font-family="Arial" font-size="12" fill="${hex(text)}">${escapeXml(palette)} · ${escapeXml(theme)} · ${escapeXml(viewport)}</text>
</svg>`;
      const filename=`${palette}-${theme}-${viewport}.svg`;
      fs.writeFileSync(path.join(imagesDir,filename),svg);
      results.push({palette,paletteLabel,theme,themeLabel,viewport,viewportLabel,width,height,image:`images/${filename}`,contrast:{page:Number(textContrast.toFixed(2)),card:Number(cardContrast.toFixed(2)),button:Number(buttonContrast.toFixed(2))},passed:textContrast>=4.5&&cardContrast>=4.5&&buttonContrast>=4.5,colors:{page:hex(page),surface:hex(surface),muted:hex(muted),text:hex(text),primary:hex(primary),border:hex(border)}});
    }
  }
}
const failed=results.filter(x=>!x.passed);
fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify({generatedAt:new Date().toISOString(),kind:'token-preview',summary:{total:results.length,passed:results.length-failed.length,failed:failed.length},results},null,2));
const cards=results.map(r=>`<article class="card"><header><strong>${r.paletteLabel} · ${r.themeLabel} · ${r.viewportLabel}</strong><span class="${r.passed?'ok':'bad'}">${r.passed?'PASS':'FAIL'}</span></header><a href="${r.image}"><img src="${r.image}" alt="${r.paletteLabel}"></a><footer>Page ${r.contrast.page}:1 · Card ${r.contrast.card}:1 · Button ${r.contrast.button}:1</footer></article>`).join('');
fs.writeFileSync(path.join(outputDir,'index.html'),`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ماتریس توکن پالت کوروش</title><style>body{font-family:Tahoma,Arial,sans-serif;background:#f4f5f7;color:#15171a;margin:0;padding:20px}.intro,.card{background:white;border:1px solid #d8dde5;border-radius:18px}.intro{padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{overflow:hidden}.card header,.card footer{display:flex;justify-content:space-between;padding:12px 14px}.card img{width:100%;height:auto;display:block;border-block:1px solid #e5e7eb}.ok{color:#15803d}.bad{color:#b91c1c}</style></head><body><section class="intro"><h1>ماتریس توکن‌های رنگ کوروش</h1><p>${results.length-failed.length} از ${results.length} حالت کنتراست استاندارد دارند. این پیش‌نمایش Token-level است؛ تست واقعی مرورگر با npm run test:palette-visual-matrix اجرا می‌شود.</p></section><section class="grid">${cards}</section></body></html>`);
console.log(JSON.stringify({status:failed.length?'failed':'passed',output:path.relative(root,outputDir),total:results.length,passed:results.length-failed.length,failed:failed.length},null,2));
if(failed.length)process.exitCode=1;
