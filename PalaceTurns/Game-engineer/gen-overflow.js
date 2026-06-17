/* Generates juice-pour-overflow.svg by baking the JS pour animation (renderFrame)
   into SMIL keyframes. The whole 1200x720 scene is wrapped in one transform so the
   tall (receiver) glass lands exactly on translate(328 200) inside viewBox
   "34 -34 410 560" — the anchor the app's fitOverflowSvgToRealJars relies on.
   So this is a drop-in replacement: NO index.html changes needed. */

const fs = require('fs');
const path = require('path');

const DUR_SVG = 6.2;      // SMIL playback seconds (matches WIDE_TO_TALL_OVERFLOW_MS=6200)
const DUR_JS  = 10.0;     // the JS timeline length the math is authored against
const N = 90;             // keyframe samples (N+1 frames)

function ss(a, b, x) { var k = (x - a) / (b - a); k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
function lerp(a, b, k) { return a + (b - a) * k; }
const f1 = n => (Math.round(n * 10) / 10).toString();
const f2 = n => (Math.round(n * 100) / 100).toString();
const f3 = n => (Math.round(n * 1000) / 1000).toString();

// One frame -> a flat object of attribute values (faithful port of renderFrame).
function frame(t) {
  const out = {};
  const sW = 1.5, sT = 1.7;
  // The wide (source) jar is shifted right by SHIFT_X (author units) so that,
  // once the scene is scaled to map the tall glass onto translate(328 200), the
  // wide jar fits inside viewBox "34 -34 410 560" instead of being clipped off
  // the left. The stream still lands on the tall jar (landX is unchanged), so
  // this only tightens the jar gap — the "wide pours into tall" reading is kept.
  const SHIFT_X = 88;
  const rest = { x: 300 + SHIFT_X, y: 461, a: 0 }, pour = { x: 648 + SHIFT_X, y: 140, a: 55 };

  const pPos = ss(0.55, 1.75, t), pTilt = ss(1.25, 2.25, t);
  const chase = 12 * ss(2.3, 6.4, t);
  const rTilt = ss(7.0, 8.1, t), rPos = ss(7.7, 9.0, t);
  let x = lerp(rest.x, pour.x, pPos);
  let y = lerp(rest.y, pour.y, pPos);
  let a = lerp(rest.a, pour.a, pTilt) + chase;
  const dip = ss(0.1, 0.45, t) * (1 - ss(0.45, 0.85, t));
  y += 7 * dip;
  y -= 30 * Math.sin(Math.PI * pPos) * (1 - rPos);
  a += 4 * (ss(1.9, 2.25, t) * (1 - ss(2.25, 2.7, t)));
  x = lerp(x, rest.x, rPos);
  y = lerp(y, rest.y, rPos);
  a = lerp(a, rest.a, rTilt);
  y -= 6 * (ss(8.55, 8.8, t) * (1 - ss(8.8, 9.25, t)));

  out.wideJar_t = `${f2(x)} ${f2(y)}`;
  out.wideJar_r = `${f2(a)} 0 0`;
  out.wideJuiceRot_r = `${f2(-a)} 87.5 92.5`;

  const pourP = ss(2.15, 6.3, t);
  out.wideJuice_y = f1(lerp(8, 255, pourP));
  const fillP = ss(2.25, 6.15, t);
  const ytT = lerp(243, -3, fillP);
  out.tallJuice_y = f1(ytT);
  const surfW = 395 + sT * (ytT - 120.5);
  out.tallSurf_cy = f1(ytT);
  out.tallSurf_o = f2(0.5 * ss(2.2, 2.5, t) * (1 - ss(6.0, 6.5, t)));

  const over = ss(5.95, 6.9, t);
  out.tallDome_o = f2(0.95 * over);
  out.tallDome_ry = f1(2 + 7 * over);
  out.tallDome_cy = f1(190 - 3.5 * over);

  const on = ss(1.95, 2.35, t) * (1 - ss(6.25, 6.7, t));
  const cosA = Math.cos(a * Math.PI / 180), sinA = Math.sin(a * Math.PI / 180);
  const lx = 50.5 * sW, ly = -88.5 * sW;
  const lipx = x + lx * cosA - ly * sinA, lipy = y + lx * sinA + ly * cosA;
  const landX = 818;
  const landY = Math.min(surfW - 2, 560);

  // Stream geometry is computed EVERY frame (not gated on `on`) so the `d`
  // attribute keeps an identical point structure across all keyframes and
  // remains SMIL-interpolatable; visibility is driven purely by opacity.
  const fall = Math.max(40, landY - lipy);
  const pulse = 1 + 0.1 * Math.sin(t * 11);
  const wTop = 11 * pulse, wEnd = 4.5;
  const NS = 14, Lp = [], Rp = [];
  let hi = `M ${f1(lipx)} ${f1(lipy)}`;
  for (let i = 0; i <= NS; i++) {
    const f = i / NS;
    const yy = lipy + fall * f;
    const xx = lipx + (landX - lipx) * f * f;
    const halfw = (wTop + (wEnd - wTop) * f) / 2 + 0.6 * f * Math.sin(t * 9 + f * 7);
    Lp.push(`${f1(xx - halfw)} ${f1(yy)}`);
    Rp.push(`${f1(xx + halfw)} ${f1(yy)}`);
    if (i >= 1) hi += ` L ${f1(lipx + (landX - lipx) * f * f)} ${f1(lipy + fall * f)}`;
  }
  out.stream_d = 'M ' + Lp.join(' L ') + ' L ' + Rp.reverse().join(' L ') + ' Z';
  out.stream_o = f2(0.97 * on);
  out.streamHi_d = hi;
  out.streamHi_o = f2(0.4 * on);

  out.ripple_cy = f1(landY);
  out.ripple_rx = f1(8 + 4 * Math.sin(t * 13));
  out.ripple_o = f2(0.5 * on);

  const grow = ss(6.05, 7.5, t), ovo = ss(5.95, 6.55, t);
  out.spill_off = f3(1 - grow);
  out.spill_o = f2(0.92 * ovo);

  const pud = ss(7.1, 9.2, t);
  out.pud1_rx = f1(10 + 150 * pud);
  out.pud1_ry = f1(5 + 11 * pud);
  out.pud_o = f2(0.9 * pud);
  out.pudL_rx = f1(4 + 40 * pud);
  out.pudL_ry = f1(4 + 7 * pud);
  out.pudL_o = f2(0.82 * pud);
  out.pudR_rx = f1(4 + 36 * pud);
  out.pudR_ry = f1(4 + 6 * pud);
  out.pudR_o = f2(0.82 * pud);

  const splash = ss(5.95, 6.4, t) * (1 - ss(8.8, 9.5, t));
  for (let i = 0; i < 6; i++) {
    const spd = 1.05 + (i % 3) * 0.28;
    const ph = (t * spd + i * 0.41) % 1;
    const side = i % 2 ? 1 : -1;
    const baseX = i % 2 ? 868 : 772;
    const dx = side * (10 + i * 5) * ph;
    const dy = -48 * Math.sin(Math.PI * ph) + 74 * ph;
    out[`drop${i}_cx`] = f1(baseX + dx);
    out[`drop${i}_cy`] = f1(192 + dy);
    out[`drop${i}_o`] = f2(splash * (ph < 0.9 ? (1 - ph * 0.45) : 0));
  }

  const baseSplash = ss(7.05, 7.45, t) * (1 - ss(9.0, 9.7, t));
  const bx = [780, 860, 800, 845];
  for (let i = 0; i < 4; i++) {
    const spd = 1.2 + (i % 3) * 0.3;
    const ph = (t * spd + i * 0.5) % 1;
    const dx = (i % 2 ? 1 : -1) * (7 + i * 4) * ph;
    const dy = -26 * Math.sin(Math.PI * ph);
    out[`bdrop${i}_cx`] = f1(bx[i] + dx);
    out[`bdrop${i}_cy`] = f1(597 + dy);
    out[`bdrop${i}_o`] = f2(baseSplash * (ph < 0.9 ? (1 - ph * 0.5) : 0));
  }

  const liftFrac = Math.max(0, Math.min(1, (461 - y) / (461 - 140)));
  out.wideShadow_cx = f1(x);
  out.wideShadow_rx = f1(95 * (1 - 0.5 * liftFrac));
  out.wideShadow_o = f2(0.16 * (1 - 0.65 * liftFrac));

  return out;
}

// ---- sample ----
const samples = [];
for (let i = 0; i <= N; i++) samples.push(frame((i / N) * DUR_JS));
const keyTimes = samples.map((_, i) => f3(i / N)).join(';');
const vals = key => samples.map(s => s[key]).join(';');

// SMIL helpers
const A = (attr, key, extra = '') =>
  `<animate attributeName="${attr}" calcMode="linear" dur="${DUR_SVG}s" fill="freeze" repeatCount="1" keyTimes="${keyTimes}" values="${vals(key)}"${extra ? ' ' + extra : ''}/>`;
const AT = (type, key, extra = '') =>
  `<animateTransform attributeName="transform" type="${type}" ${extra} calcMode="linear" dur="${DUR_SVG}s" fill="freeze" repeatCount="1" keyTimes="${keyTimes}" values="${vals(key)}"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="34 -34 410 560" width="410" height="560">
<defs>
<linearGradient id="jpJuice" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FEA400"/><stop offset="0.55" stop-color="#FEA400"/><stop offset="1" stop-color="#CC8400"/>
</linearGradient>
<linearGradient id="jpStream" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FEA400"/><stop offset="0.6" stop-color="#FEA400"/><stop offset="1" stop-color="#F49A00"/>
</linearGradient>
<linearGradient id="jpGlass" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.18" stop-color="#e9eef2" stop-opacity="0.28"/>
<stop offset="0.5" stop-color="#cfd6da" stop-opacity="0.14"/><stop offset="0.82" stop-color="#e9eef2" stop-opacity="0.30"/>
<stop offset="1" stop-color="#ffffff" stop-opacity="0.5"/>
</linearGradient>
<clipPath id="jpWideClip"><path d="M39.3029 0C39.3029 0 39.7617 6.72522 39.4172 8.10415C38.3975 12.1992 9.26585 26.3613 2.31704 40.6915C-2.95082 51.5535 2.31531 107.935 3.00258 121.04C3.68984 134.143 7.35467 161.042 24.9881 170.525C51.8883 184.991 125.42 184.991 152.321 170.525C169.954 161.042 173.619 134.143 174.306 121.04C174.993 107.936 180.259 51.5548 174.992 40.6915C168.043 26.3613 138.911 12.1992 137.891 8.10415C137.547 6.72522 138.006 0 138.006 0H39.3029Z"/></clipPath>
<clipPath id="jpTallClip"><path d="M15.3419 0.398438C14.9659 21.9851 -0.200144 28.7592 0.00200288 81.1798C0.0505181 93.8273 0.00503397 131.383 2.72694 196.991C3.97419 227.056 25.7919 241.671 47.5631 241.315C69.3343 241.671 91.152 227.056 92.4003 196.991C95.1222 131.383 95.0757 93.8273 95.1242 81.1798C95.3263 28.7592 80.1613 21.9851 79.7853 0.398438H51.7405H43.3877H15.3419Z"/></clipPath>
</defs>

<!-- All scene geometry uses the original 1200x720 author coordinates; this single
     wrapper maps the tall (receiver) glass onto translate(328 200) in viewBox
     "34 -34 410 560", so the app's existing alignment math is unchanged. -->
<g transform="translate(-106.853 88.147) scale(0.588235)">

<ellipse cx="600" cy="612" rx="560" ry="40" fill="#000000" opacity="0.04"/>
<ellipse cx="820" cy="606" rx="80" ry="12" fill="#1b2a3a" opacity="0.13"/>

<!-- spilled puddles -->
<ellipse cx="762" cy="601" rx="4" ry="6" fill="#FEA400" opacity="0">${A('rx', 'pudL_rx')}${A('ry', 'pudL_ry')}${A('opacity', 'pudL_o')}</ellipse>
<ellipse cx="884" cy="601" rx="4" ry="6" fill="#FEA400" opacity="0">${A('rx', 'pudR_rx')}${A('ry', 'pudR_ry')}${A('opacity', 'pudR_o')}</ellipse>
<ellipse cx="820" cy="600" rx="8" ry="5" fill="#FEA400" opacity="0">${A('rx', 'pud1_rx')}${A('ry', 'pud1_ry')}${A('opacity', 'pud_o')}</ellipse>
<ellipse cx="820" cy="598" rx="6" ry="3" fill="#FFB733" opacity="0">${A('opacity', 'pud_o')}</ellipse>

<!-- TALL JAR (target/receiver) -->
<g transform="translate(820 395) scale(1.7)">
<g transform="translate(-47.5 -120.5)">
<path opacity="0.5" fill-rule="evenodd" d="M47.0933 206.559C63.1357 206.559 76.1398 213.391 76.1398 221.816C76.1398 230.242 63.1347 237.076 47.0933 237.076C31.052 237.076 18.0469 230.244 18.0469 221.816C18.0469 213.388 31.051 206.559 47.0933 206.559Z" fill="#B2B1B2"/>
<path opacity="0.29" fill-rule="evenodd" d="M15.3419 0.398438C14.9659 21.9851 -0.200144 28.7592 0.00200288 81.1798C0.0505181 93.8273 0.00503397 131.383 2.72694 196.991C3.97419 227.056 25.7919 241.671 47.5631 241.315C69.3343 241.671 91.152 227.056 92.4003 196.991C95.1222 131.383 95.0757 93.8273 95.1242 81.1798C95.3263 28.7592 80.1613 21.9851 79.7853 0.398438H51.7405H43.3877H15.3419Z" fill="#CBCBCB"/>
<g clip-path="url(#jpTallClip)">
<rect x="-300" y="243" width="600" height="900" fill="url(#jpJuice)">${A('y', 'tallJuice_y')}</rect>
<ellipse cx="47.5" cy="243" rx="34" ry="3.4" fill="#FFB733" opacity="0">${A('cy', 'tallSurf_cy')}${A('opacity', 'tallSurf_o')}</ellipse>
</g>
<path opacity="0.5" fill-rule="evenodd" d="M15.3419 0.398438C14.9659 21.9851 -0.200144 28.7592 0.00200288 81.1798C0.0505181 93.8273 0.00503397 131.383 2.72694 196.991C3.96004 226.711 25.2946 241.331 46.8141 241.32C46.803 240.828 46.7788 240.327 46.7303 239.814C46.7303 239.814 21.4538 239.224 12.4633 221.756C3.47287 204.289 5.10722 188.61 4.25214 175.749C3.39807 162.886 2.25797 83.487 4.25114 61.7186C6.24431 39.9502 14.408 27.063 16.5912 13.7307C17.5221 8.04962 17.987 3.61694 18.2144 0.398438H15.3419ZM47.4095 241.315H47.5631C69.3343 241.671 91.152 227.056 92.4003 196.991C95.1222 131.383 95.0757 93.8273 95.1242 81.1798C95.3263 28.7592 80.1613 21.9851 79.7853 0.398438H76.0082C76.2366 3.61694 76.7015 8.04962 77.6314 13.7307C79.8146 27.063 87.9783 39.9502 89.9715 61.7186C91.9646 83.4844 90.8245 162.886 89.9705 175.749C89.1164 188.613 90.7507 204.289 81.7593 221.756C72.7688 239.224 47.4923 239.814 47.4923 239.814C47.4448 240.325 47.4206 240.822 47.4095 241.315Z" fill="#CBCBCB"/>
<path opacity="0.3" fill-rule="evenodd" d="M15.3473 0.00390625C15.2533 5.40583 14.2325 10.2784 12.7578 14.7716C13.813 16.7364 17.4426 19.0779 26.3057 21.3509C38.581 24.4983 56.3811 24.4983 68.6554 21.3509C77.8471 18.9936 81.4089 16.5652 82.3094 14.5556C80.8732 10.1335 79.8827 5.71397 79.7897 0.39896H51.7448H43.3921L15.3473 0.00390625Z" fill="#CBCBCB"/>
<path opacity="0.1" fill-rule="evenodd" d="M15.3438 0.00265245C15.3438 0.00265245 18.1556 2.83134 19.9406 2.87875C21.7255 2.92879 53.4666 2.87875 53.4666 2.87875C53.4666 2.87875 77.2734 3.12635 78.6026 2.03596C79.9317 0.948196 80.3269 0 80.3269 0H15.3438V0.00265245Z" fill="#B8B7B8"/>
<path fill-rule="evenodd" d="M17.0937 4.27344C17.0937 4.27344 15.516 17.2581 12.0148 26.7819C8.51362 36.3057 5.25097 42.6137 3.19817 66.8552C1.14536 91.0968 2.85554 153.889 3.2103 165.533C3.56507 177.177 3.9451 197.955 6.36581 207.6C8.78652 217.248 14.481 226.522 14.481 226.522C14.481 226.522 4.15433 215.07 3.2103 200.305C2.26628 185.54 0.0295184 96.5961 0.621809 76.7504C1.21511 56.9047 3.61156 42.1264 7.07636 32.2312C10.5412 22.336 17.0937 4.27344 17.0937 4.27344Z" fill="#B2B1B2"/>
<path fill-rule="evenodd" d="M78.0625 4.27344C78.0625 4.27344 79.6403 17.2581 83.1404 26.7819C86.6416 36.3057 89.9043 42.6137 91.9571 66.8552C94.0099 91.0968 92.3007 153.889 91.9459 165.533C91.5912 177.177 91.2111 197.955 88.7904 207.6C86.3697 217.248 80.6752 226.522 80.6752 226.522C80.6752 226.522 91.0019 215.07 91.9459 200.305C92.89 185.54 95.1267 96.5961 94.5344 76.7504C93.9411 56.9047 91.5447 42.1264 88.0799 32.2312C84.6151 22.336 78.0625 4.27344 78.0625 4.27344Z" fill="#B2B1B2"/>
<path opacity="0.5" fill-rule="evenodd" d="M50.513 89.1306C50.513 89.1306 57.2657 100.783 56.4541 128.332C55.6424 155.884 58.051 223.102 49.1131 228.156C40.1752 233.21 48.5046 235.554 48.5046 235.554C48.5046 235.554 68.7446 242.147 72.4499 217.881C76.1533 193.616 74.6614 91.8224 73.2464 86.8023C71.8303 81.7797 50.513 84.6874 50.513 89.1306Z" fill="#D2D2D1"/>
<path opacity="0.3" fill-rule="evenodd" d="M18.4323 27C16.5332 32.934 6.83114 46.93 5.61724 74.7772C4.39628 102.793 3.98896 202.511 14.2813 217.993C21.1502 228.325 40.0873 231.636 40.0873 231.636C40.0873 231.636 30.0821 214.016 28.3861 186.169C26.69 158.321 23.294 89.3369 25.7036 70.7844C28.1131 52.2318 33.5236 38.8758 45.0096 36.6503C56.4956 34.4247 50.136 29.4784 44.0605 28.2405C37.985 27.0027 20.8985 33.0788 18.4323 27Z" fill="white"/>
<path opacity="0.3" fill-rule="evenodd" d="M67.0993 40.2891C67.0993 40.2891 76.5527 61.0672 77.7605 109.835C78.9684 158.605 75.8098 204.164 74.128 214.299C72.4451 224.434 65.4266 228.49 67.3035 230.11C69.1804 231.727 84.8731 223.971 88.4107 194.751C91.9482 165.532 92.7133 75.0632 88.4107 54.1429C84.108 33.22 78.2629 26.7039 77.7484 18.2468C77.2339 9.78966 77.8081 4.2929 76.1899 4.4404C74.5717 4.58526 63.7083 7.01363 62.736 7.01363C61.7637 7.01363 62.548 29.2719 67.0993 40.2891Z" fill="white"/>
</g>
</g>

<!-- overflow dome cresting the rim -->
<ellipse cx="820" cy="190" rx="52" ry="3" fill="url(#jpStream)" opacity="0">${A('opacity', 'tallDome_o')}${A('ry', 'tallDome_ry')}${A('cy', 'tallDome_cy')}</ellipse>

<!-- overflow sheets down the sides -->
<path d="M770 192 C 752 250, 748 430, 762 598" fill="none" stroke="url(#jpStream)" stroke-width="9" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity="0">${A('stroke-dashoffset', 'spill_off')}${A('opacity', 'spill_o')}</path>
<path d="M870 192 C 888 250, 892 430, 880 598" fill="none" stroke="url(#jpStream)" stroke-width="9" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity="0">${A('stroke-dashoffset', 'spill_off')}${A('opacity', 'spill_o')}</path>

<!-- impact ripple -->
<ellipse cx="818" cy="300" rx="7" ry="2.4" fill="none" stroke="#FFD27A" stroke-width="2" opacity="0">${A('cy', 'ripple_cy')}${A('rx', 'ripple_rx')}${A('opacity', 'ripple_o')}</ellipse>

<!-- splash droplets (rim) -->
${[0,1,2,3,4,5].map(i => {
  const baseCx = i % 2 ? 868 : 772;
  const r = [3.4,3,2.6,3.6,2.2,2.8][i];
  const fill = [4,5].includes(i) ? '#FFB733' : (i===2 ? '#FFB733' : '#FEA400');
  return `<ellipse cx="${baseCx}" cy="192" rx="${r}" ry="${r}" fill="${fill}" opacity="0">${A('cx', `drop${i}_cx`)}${A('cy', `drop${i}_cy`)}${A('opacity', `drop${i}_o`)}</ellipse>`;
}).join('\n')}

<!-- splash droplets (base) -->
${[0,1,2,3].map(i => {
  const bx = [780,860,800,845][i];
  const r = [3,2.6,2.2,2.8][i];
  const fill = i===2 ? '#FFB733' : '#FEA400';
  return `<ellipse cx="${bx}" cy="596" rx="${r}" ry="${r}" fill="${fill}" opacity="0">${A('cx', `bdrop${i}_cx`)}${A('cy', `bdrop${i}_cy`)}${A('opacity', `bdrop${i}_o`)}</ellipse>`;
}).join('\n')}

<!-- pouring stream -->
<path d="${samples[0].stream_d}" fill="url(#jpStream)" opacity="0">${A('d', 'stream_d')}${A('opacity', 'stream_o')}</path>
<path d="${samples[0].streamHi_d}" fill="none" stroke="#FFD98A" stroke-width="2" stroke-linecap="round" opacity="0">${A('d', 'streamHi_d')}${A('opacity', 'streamHi_o')}</path>

<!-- dynamic shadow under wide jar -->
<ellipse cx="360" cy="606" rx="95" ry="14" fill="#1b2a3a" opacity="0.16">${A('cx', 'wideShadow_cx')}${A('rx', 'wideShadow_rx')}${A('opacity', 'wideShadow_o')}</ellipse>

<!-- WIDE JAR (source/pourer) -->
<g>
${AT('translate', 'wideJar_t')}
${AT('rotate', 'wideJar_r', 'additive="sum"')}
<animateTransform attributeName="transform" type="scale" additive="sum" calcMode="linear" dur="${DUR_SVG}s" fill="freeze" repeatCount="1" keyTimes="0;1" values="1.5;1.5"/>
<g transform="translate(-87.5 -92.5)">
<path d="M39.3029 0C39.3029 0 39.7617 6.72522 39.4172 8.10415C38.3975 12.1992 9.26585 26.3613 2.31704 40.6915C-2.95082 51.5535 2.31531 107.935 3.00258 121.04C3.68984 134.143 7.35467 161.042 24.9881 170.525C51.8883 184.991 125.42 184.991 152.321 170.525C169.954 161.042 173.619 134.143 174.306 121.04C174.993 107.936 180.259 51.5548 174.992 40.6915C168.043 26.3613 138.911 12.1992 137.891 8.10415C137.547 6.72522 138.006 0 138.006 0H39.3029Z" fill="url(#jpGlass)"/>
<g clip-path="url(#jpWideClip)">
<g transform="rotate(0 87.5 92.5)">${AT('rotate', 'wideJuiceRot_r')}
<rect x="-600" y="8" width="1200" height="1100" fill="url(#jpJuice)">${A('y', 'wideJuice_y')}</rect>
</g>
</g>
<path opacity="0.45" d="M28.4019 20.3253C32.2503 16.0154 35.2321 15.0457 36.9632 15.4758C38.6943 15.9059 51.7591 18.9243 57.1642 18.9243C62.5692 18.9243 59.3758 27.9756 56.0089 32.61C52.6421 37.2432 46.3843 48.5583 46.3715 55.5621C46.3598 62.5659 43.8946 111.662 46.3598 136.206C48.825 160.751 52.5374 172.65 49.3044 172.594C46.0713 172.539 19.4124 172.237 13.9945 142.241C10.3729 122.186 7.9089 85.286 9.3608 60.5132C10.765 36.5511 13.9969 36.4612 28.4019 20.3253Z" fill="#ffffff"/>
<path opacity="0.4" d="M123.131 24.8274C131.789 30.3145 146.097 40.4818 148.854 49.2546C152.862 62.0026 152.881 105.447 148.863 130.436C144.847 155.425 132.138 168.858 122.456 173.082C119.5 174.37 122 170 124 165C131 150 134 110 132 86C130 62 124 40 117 30C111 21 119 22 123.131 24.8274Z" fill="#ffffff"/>
<path opacity="0.85" d="M39.3548 0.832346C39.4639 2.67787 39.6855 7.0219 39.4172 8.09976C38.3975 12.1948 9.26585 26.3569 2.31704 40.6871C-2.95082 51.5491 2.31531 107.93 3.00258 121.035C3.68984 134.139 7.35467 161.037 24.9881 170.52C51.8883 184.986 125.42 184.986 152.321 170.52C169.954 161.037 173.619 134.139 174.306 121.035C174.993 107.932 180.259 51.5504 174.992 40.6871C168.043 26.3569 138.911 12.1948 137.891 8.09976C137.621 7.01799 137.845 2.6492 137.954 0.814099" fill="none" stroke="#bcae8e" stroke-opacity="0.5" stroke-width="1.4"/>
<path opacity="0.4" d="M40.5078 1.64453C40.5078 1.64453 53.7857 4.22384 65.4138 4.39457C77.0418 4.56401 127.001 5.15181 131.279 4.39457C135.554 3.63733 137.999 1.64583 137.999 1.64583L40.5078 1.64453Z" fill="#8d8068"/>
<path opacity="0.7" d="M45.0979 6.83755C45.0979 6.83755 30.9285 19.1632 23.1989 23.9921C15.4694 28.821 5.45124 37.2275 4.73455 38.9518C2.51349 44.302 43.6247 50.8708 85.7486 51.5042C130.123 52.1729 173.414 44.4493 171.132 38.9518C170.417 37.2275 160.397 28.8223 152.668 23.9934C144.938 19.1645 130.769 6.83886 130.769 6.83886" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.4"/>
<ellipse cx="88.6" cy="4" rx="49" ry="6.4" fill="#fff7e6" opacity="0.5"/>
<ellipse cx="88.6" cy="4" rx="49" ry="6.4" fill="none" stroke="#c9b890" stroke-width="1.3" opacity="0.7"/>
</g>
</g>

</g>
</svg>
`;

module.exports = { frame, ss, lerp };

if (require.main === module) {
  const outPath = path.join(__dirname, '..', 'assets', 'juice-pour-overflow.svg');
  fs.writeFileSync(outPath, svg);
  console.log('Wrote', outPath, '(' + (svg.length / 1024).toFixed(1) + ' KB,', (N + 1), 'keyframes)');
}
