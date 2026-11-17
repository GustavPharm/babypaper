#!/usr/bin/env node
/* 生成全套应用图标：PWA（assets/icons/）和安卓自适应图标（android-icon-res/）。
   node tools/build-icons.js

   图标是手绘的「宝」：等线圆头的笔画，「玉」里那一点画成一粒荧光黄胶囊
   （宝宝 + 药学 + 高亮色）。字形全部由下面的几何参数算出来，不依赖任何字体，
   所以改粗细、间距、配色都在这个文件里改，然后重新跑一遍。

   栅格化用 playwright 自带的 Chromium。playwright 没有写进 package.json
   （安卓打包的 CI 用不着它），本机没有的话先：npm i --no-save playwright && npx playwright install chromium

   页面里还有两处内联的同款标志（index.html 的 favicon 和顶栏 .brand-mark），
   改了字形要一起换：node tools/build-icons.js --inline 会把这两段打印出来，贴回去即可。 */
"use strict";
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./lib");

/* ---------- 字形：画在 1000×1000 的字框里，y 轴向下 ---------- */
const G = {
  wh: 96,            // 横画粗细。横比竖略细是光学修正：等粗时横看起来更重
  wv: 106,           // 竖画粗细
  stubTop: 30,       // 宝盖头顶上那一点（画成短竖）的顶端
  roofTop: 150, roofL: 36, roofR: 964, roofOuterR: 128, roofInnerR: 26, roofLegY: 318,
  h1: 394, h1L: 232, h1R: 768,   // 王的三横：中心 y、左右端
  h2: 590, h2L: 276, h2R: 650,   // 中横右臂收短，把位置让给胶囊
  h3: 856, h3L: 70, h3R: 930,
  cap: { w: 120, len: 252, cx: 778, cy: 675, ang: 45 },
  // 摆放时对准的锚点：取在外接框中心和墨色重心之间，视觉上才居中
  anchorX: 505, anchorY: 481,
};

const n = (v) => +v.toFixed(2);

function stadium(x1, y1, x2, y2) {
  const r = Math.min(x2 - x1, y2 - y1) / 2, arc = "A" + r + " " + r + " 0 0 1 ";
  const h = (x) => (x2 - x1 > 2 * r ? "H" + n(x) : ""), v = (y) => (y2 - y1 > 2 * r ? "V" + n(y) : "");
  return "M" + n(x1 + r) + " " + n(y1) + h(x2 - r) + arc + n(x2) + " " + n(y1 + r) + v(y2 - r) + arc + n(x2 - r) + " " + n(y2) +
    h(x1 + r) + arc + n(x1) + " " + n(y2 - r) + v(y1 + r) + arc + n(x1 + r) + " " + n(y1) + "Z";
}

/* 除胶囊以外的全部笔画，一条 path */
function strokesPath() {
  const g = G, hv = g.wv / 2, hh = g.wh / 2;
  const yT = g.roofTop, yU = yT + g.wh, xL = g.roofL, xR = g.roofR, Ro = g.roofOuterR, Ri = g.roofInnerR, yc = g.roofLegY;
  const roof = "M" + xL + " " + yc + "V" + (yT + Ro) + "A" + Ro + " " + Ro + " 0 0 1 " + (xL + Ro) + " " + yT + "H" + (xR - Ro) +
    "A" + Ro + " " + Ro + " 0 0 1 " + xR + " " + (yT + Ro) + "V" + yc + "A" + hv + " " + hv + " 0 0 1 " + (xR - g.wv) + " " + yc +
    "V" + (yU + Ri) + "A" + Ri + " " + Ri + " 0 0 0 " + (xR - g.wv - Ri) + " " + yU + "H" + (xL + g.wv + Ri) +
    "A" + Ri + " " + Ri + " 0 0 0 " + (xL + g.wv) + " " + (yU + Ri) + "V" + yc + "A" + hv + " " + hv + " 0 0 1 " + xL + " " + yc + "Z";
  return roof +
    stadium(500 - hv, g.stubTop, 500 + hv, yU) +
    stadium(g.h1L, g.h1 - hh, g.h1R, g.h1 + hh) +
    stadium(g.h2L, g.h2 - hh, g.h2R, g.h2 + hh) +
    stadium(g.h3L, g.h3 - hh, g.h3R, g.h3 + hh) +
    stadium(500 - hv, g.h1 - hh, 500 + hv, g.h3 + hh);
}

function capsuleRect(attrs) {
  const c = G.cap;
  return '<rect x="' + n(c.cx - c.len / 2) + '" y="' + n(c.cy - c.w / 2) + '" width="' + c.len + '" height="' + c.w + '" rx="' + c.w / 2 +
    '" transform="rotate(' + c.ang + " " + c.cx + " " + c.cy + ')"' + (attrs ? " " + attrs : "") + "/>";
}

/* 把字框摆进画面：size 是字框边长，(cx, cy) 是锚点落在画面上的位置 */
function placement(size, cx, cy) {
  const k = size / 1000;
  return "translate(" + n(cx - G.anchorX * k) + " " + n(cy - G.anchorY * k) + ") scale(" + n(k) + ")";
}

/* ---------- 配色 ---------- */
const C = {
  bgTop: "#2B6451", bgBot: "#163A2E",          // 墨绿底，上亮下暗；品牌色 #1F4A3B 落在中段
  inkTop: "#FFFEF9", inkBot: "#F1ECDD",        // 纸白的字
  capLight: ["#FCE9A0", "#F6D568"],            // 胶囊浅色半边（荧光笔黄）
  capDeep: ["#F0BF45", "#E2A22B"],             // 胶囊深色半边
  shadow: "#06170F",
};

/* ---------- 画面：设计都在 512×512 的「可见画框」里做 ---------- */
const FRAME = 512;
const MARK_SIZE = 330;   // 字框边长。安卓自适应图标的安全区是画框里半径 234 的圆，字的四角离中心约 210

function background() {
  // 底比画框大一圈，给安卓自适应图标和 maskable 的出血用；渐变按画框定位，出血部分自然延续两端的颜色
  const bleed = '<rect x="-128" y="-128" width="768" height="768" ';
  return '<defs><linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="512">' +
    '<stop offset="0" stop-color="' + C.bgTop + '"/><stop offset="1" stop-color="' + C.bgBot + '"/></linearGradient>' +
    '<radialGradient id="light" gradientUnits="userSpaceOnUse" cx="150" cy="40" r="430">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
    bleed + 'fill="url(#bg)"/>' + bleed + 'fill="url(#light)"/>';
}

function mark(size) {
  const c = G.cap, k = size / 1000;
  const top = c.cy - c.w / 2, glintH = c.w * 0.14, glintY = top + c.w * 0.17, glintW = c.len / 2 - c.w * 0.52;
  const half = '" y="' + n(top - 4) + '" width="' + n(c.len / 2 + 4) + '" height="' + (c.w + 8) + '" fill="url(#';
  const glint = '" y="' + n(glintY) + '" width="' + n(glintW) + '" height="' + n(glintH) + '" rx="' + n(glintH / 2) + '" fill="#fff" opacity="';
  return "<defs>" +
    '<linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="904"><stop offset="0" stop-color="' + C.inkTop + '"/><stop offset="1" stop-color="' + C.inkBot + '"/></linearGradient>' +
    '<linearGradient id="capLight" gradientUnits="userSpaceOnUse" x1="0" y1="' + top + '" x2="0" y2="' + (top + c.w) + '"><stop offset="0" stop-color="' + C.capLight[0] + '"/><stop offset="1" stop-color="' + C.capLight[1] + '"/></linearGradient>' +
    '<linearGradient id="capDeep" gradientUnits="userSpaceOnUse" x1="0" y1="' + top + '" x2="0" y2="' + (top + c.w) + '"><stop offset="0" stop-color="' + C.capDeep[0] + '"/><stop offset="1" stop-color="' + C.capDeep[1] + '"/></linearGradient>' +
    '<clipPath id="capClip">' + capsuleRect() + "</clipPath>" +
    // 投影的位移和模糊按画框像素定，再换算回字框单位
    '<filter id="lift" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="' + n(7 / k) + '" stdDeviation="' + n(9 / k) + '" flood-color="' + C.shadow + '" flood-opacity=".36"/></filter>' +
    "</defs>" +
    '<g transform="' + placement(size, FRAME / 2, FRAME / 2) + '" filter="url(#lift)">' +
    '<path d="' + strokesPath() + '" fill="url(#ink)"/>' +
    '<g clip-path="url(#capClip)"><g transform="rotate(' + c.ang + " " + c.cx + " " + c.cy + ')">' +
    '<rect x="' + n(c.cx - c.len / 2 - 4) + half + 'capLight)"/>' +
    '<rect x="' + c.cx + half + 'capDeep)"/>' +
    '<rect x="' + (c.cx - 2.5) + '" y="' + n(top - 4) + '" width="5" height="' + (c.w + 8) + '" fill="#B9791A" opacity=".28"/>' +
    '<rect x="' + n(c.cx - c.len / 2 + c.w * 0.36) + glint + '.62"/>' +
    '<rect x="' + n(c.cx + c.w * 0.16) + glint + '.34"/>' +
    "</g></g></g>";
}

/* 单色剪影：安卓 13+「主题图标」用。胶囊中缝留一道空，单色下也认得出是胶囊 */
function silhouette(size) {
  const c = G.cap, seam = 16, turn = ' transform="rotate(' + c.ang + " " + c.cx + " " + c.cy + ')"';
  return '<defs><mask id="seam" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="#fff"/>' +
    '<rect x="' + (c.cx - seam / 2) + '" y="' + (c.cy - c.w) + '" width="' + seam + '" height="' + c.w * 2 + '" fill="#000"' + turn + "/></mask></defs>" +
    '<g transform="' + placement(size, FRAME / 2, FRAME / 2) + '" fill="#fff"><path d="' + strokesPath() + '"/><g mask="url(#seam)">' + capsuleRect() + "</g></g>";
}

function svg(viewBox, inner, clip) {
  let body = inner;
  if (clip === "rounded") body = '<clipPath id="shape"><rect width="512" height="512" rx="115"/></clipPath><g clip-path="url(#shape)">' + inner + "</g>";
  if (clip === "circle") body = '<clipPath id="shape"><circle cx="256" cy="256" r="256"/></clipPath><g clip-path="url(#shape)">' + inner + "</g>";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '">' + body + "</svg>";
}

const ICON = background() + mark(MARK_SIZE);
const FULL = "0 0 512 512";            // 画框本身
const MASKABLE = "-64 -64 640 640";    // PWA maskable：画框占中间 80%，四周是出血
const ADAPTIVE = "-128 -128 768 768";  // 安卓自适应图层：108dp 画布里中间 72dp 可见

const VARIANTS = {
  square: svg(FULL, ICON),
  rounded: svg(FULL, ICON, "rounded"),
  round: svg(FULL, ICON, "circle"),
  maskable: svg(MASKABLE, ICON),
  // 前景层把底色一起画进去（整幅不透明）：沿用之前修「安卓图标空白」时的做法
  adaptiveFg: svg(ADAPTIVE, ICON),
  adaptiveBg: svg(ADAPTIVE, background()),
  monochrome: svg(ADAPTIVE, silhouette(MARK_SIZE * 0.88)),
};

/* ---------- 输出清单 ---------- */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function jobs() {
  const list = [
    { file: "assets/icons/icon-192.png", px: 192, v: "rounded" },
    { file: "assets/icons/icon-512.png", px: 512, v: "rounded" },
    { file: "assets/icons/icon-maskable-512.png", px: 512, v: "maskable" },
    { file: "assets/icons/apple-touch-icon.png", px: 180, v: "square" },
  ];
  Object.keys(DENSITIES).forEach((d) => {
    const k = DENSITIES[d], dir = "android-icon-res/mipmap-" + d + "/";
    list.push(
      { file: dir + "ic_launcher.png", px: 48 * k, v: "rounded" },
      { file: dir + "ic_launcher_round.png", px: 48 * k, v: "round" },
      { file: dir + "ic_launcher_foreground.png", px: 108 * k, v: "adaptiveFg" },
      { file: dir + "ic_launcher_background.png", px: 108 * k, v: "adaptiveBg" },
      { file: dir + "ic_launcher_monochrome.png", px: 108 * k, v: "monochrome" }
    );
  });
  return list;
}

/* index.html 里内联的两处小标志（顶栏 .brand-mark 和 favicon）：只有十几到二十几像素，
   用平涂的字和胶囊，字比大图标里放大一档，小尺寸下笔画才够粗 */
function inlineMarks() {
  const k = 0.025, at = "translate(" + n(16 - G.anchorX * k) + " " + n(16 - G.anchorY * k) + ") scale(" + k + ")";
  const stops = (q) => "<stop stop-color=" + q + C.bgTop + q + "/><stop offset=" + q + "1" + q + " stop-color=" + q + C.bgBot + q + "/>";
  const body = (q, bgId) => "<defs><linearGradient id=" + q + bgId + q + " x1=" + q + "0" + q + " y1=" + q + "0" + q + " x2=" + q + "0" + q + " y2=" + q + "1" + q + ">" + stops(q) + "</linearGradient></defs>" +
    "<rect width=" + q + "32" + q + " height=" + q + "32" + q + " rx=" + q + "7.5" + q + " fill=" + q + "url(#" + bgId + ")" + q + "/>" +
    "<g transform=" + q + at + q + "><path fill=" + q + "#FAF9F6" + q + " d=" + q + strokesPath() + q + "/>" +
    capsuleRect("fill=" + q + "#F2C94C" + q).replace(/"/g, q) + "</g>";
  const brand = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">' + body('"', "brandMarkBg") + "</svg>";
  const fav = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" + body("'", "b") + "</svg>";
  const favicon = '<link rel="icon" href="data:image/svg+xml,' + fav.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23") + '" />';
  return { brand, favicon };
}

async function main() {
  if (process.argv.includes("--inline")) {
    const m = inlineMarks();
    console.log("顶栏 .brand-mark：\n" + m.brand + "\n\nfavicon：\n" + m.favicon);
    return;
  }
  let chromium;
  try { ({ chromium } = require("playwright")); } catch (e) {
    console.error("缺 playwright：npm i --no-save playwright && npx playwright install chromium");
    process.exit(1);
  }
  fs.writeFileSync(path.join(ROOT, "assets/icons/icon.svg"), VARIANTS.square + "\n");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const list = jobs();
  for (const j of list) {
    await page.setViewportSize({ width: j.px, height: j.px });
    await page.setContent("<style>html,body{margin:0;background:transparent}svg{display:block}</style>" +
      VARIANTS[j.v].replace("<svg ", '<svg width="' + j.px + '" height="' + j.px + '" '));
    const out = path.join(ROOT, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: j.px, height: j.px } });
  }
  await browser.close();
  console.log("已生成 assets/icons/icon.svg 和 " + list.length + " 张 PNG");
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { VARIANTS, inlineMarks };
