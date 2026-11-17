#!/usr/bin/env node
/* 生成全套应用图标：PWA（assets/icons/）和安卓自适应图标（android-icon-res/），
   并把 index.html 里内联的同款标志（favicon、顶栏 .brand-mark、开屏动画的字）一起更新。
   node tools/build-icons.js            全部重出
   node tools/build-icons.js --inline   只更新 index.html 和原生启动图，不出图标 PNG（不需要 playwright）

   图标是手绘的「宝」：等线圆头的笔画，「玉」里那一点画成一粒荧光黄胶囊
   （宝宝 + 药学 + 高亮色）。字形全部由下面的几何参数算出来，不依赖任何字体，
   所以改粗细、间距、配色都在这个文件里改，然后重新跑一遍。

   栅格化用 playwright 自带的 Chromium。playwright 没有写进 package.json
   （安卓打包的 CI 用不着它），本机没有的话先：npm i --no-save playwright && npx playwright install chromium */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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
  splash: "#1F4A3B",                           // 启动时的平涂底色：原生启动图、WebView 底色、开屏动画起始帧都用它
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

/* 安卓壳的原生启动图：Capacitor 模板自带的是白底蓝标，这里按模板的文件名逐个盖掉，换成平涂的品牌绿。
   平涂色怎么拉伸都不变形，所以每张只有 16×16；图案交给网页里的开屏动画去画 */
const NATIVE_SPLASH = ["drawable"].concat(
  ["land", "port"].reduce((all, o) => all.concat(Object.keys(DENSITIES).map((d) => "drawable-" + o + "-" + d)), [])
);

function flatPng(size, hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const row = Buffer.concat([Buffer.from([0])].concat(Array.from({ length: size }, () => Buffer.from(rgb))));
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]), len = Buffer.alloc(4), sum = Buffer.alloc(4);
    len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 2;   // 8 位 RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
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

/* 开屏动画里的字：同一套几何，拆成一组可以各自动起来的 HTML 元素。
   单位是 em，1em = 字框的 1/10（样式里按屏幕大小定 font-size）。动效在 assets/css/app.css 的「开屏动画」一节 */
function splashMarkup(indent) {
  const g = G, c = g.cap, hv = g.wv / 2, hh = g.wh / 2, e = (v) => n(v / 100) + "em";
  const at = (x1, y1, x2, y2) => "left:" + e(x1) + ";top:" + e(y1) + ";width:" + e(x2 - x1) + ";height:" + e(y2 - y1);
  const stroke = (cls, x1, y1, x2, y2, inner) => '<span class="sp ' + cls + '" style="' + at(x1, y1, x2, y2) + '">' + (inner || "<i></i>") + "</span>";
  const capEnd = (side) => '<b style="' + side + ":" + e(-g.wv) + ";bottom:" + e(-hv) + ";width:" + e(g.wv) + ";height:" + e(g.wv) + '"></b>';
  const roof = (left) => '<i class="sp-roof" style="left:' + e(left) + ";width:" + e(g.roofR - g.roofL) + ";height:" + e(g.roofLegY - g.roofTop) +
    ";border-width:" + e(g.wh) + " " + e(g.wv) + " 0;border-radius:" + e(g.roofOuterR) + " " + e(g.roofOuterR) + ' 0 0">' + capEnd("left") + capEnd("right") + "</i>";
  const glintW = c.len / 2 - c.w * 0.52, glint = (x, o) => '<b style="left:' + e(x) + ";top:" + e(c.w * 0.17) + ";width:" + e(glintW) + ";height:" + e(c.w * 0.14) + ";opacity:" + o + '"></b>';
  const rows = [
    stroke("sp-roof-l", g.roofL, g.roofTop, 500, g.roofLegY + hv, roof(0)),
    stroke("sp-roof-r", 500, g.roofTop, g.roofR, g.roofLegY + hv, roof(g.roofL - 500)),
    stroke("sp-stub", 500 - hv, g.stubTop, 500 + hv, g.roofTop + g.wh),
    stroke("sp-h1", g.h1L, g.h1 - hh, g.h1R, g.h1 + hh),
    stroke("sp-h2", g.h2L, g.h2 - hh, g.h2R, g.h2 + hh),
    stroke("sp-h3", g.h3L, g.h3 - hh, g.h3R, g.h3 + hh),
    stroke("sp-v", 500 - hv, g.h1 - hh, 500 + hv, g.h3 + hh),
    '<span class="sp-pulse" style="left:' + e(c.cx) + ";top:" + e(c.cy) + '"></span>',
    '<span class="sp-cap" style="' + at(c.cx - c.len / 2, c.cy - c.w / 2, c.cx + c.len / 2, c.cy + c.w / 2) + ";transform:rotate(" + c.ang + 'deg)"><i>' +
      glint(c.w * 0.36, ".62") + glint(c.len / 2 + c.w * 0.16, ".34") + "</i></span>",
  ];
  const pad = indent + "    ";
  return indent + '<div class="splash" id="splash" aria-hidden="true">\n' +
    indent + '  <div class="splash-mark" style="margin:' + e(-g.anchorY) + " 0 0 " + e(-g.anchorX) + '">\n' +
    rows.map((r) => pad + r + "\n").join("") + indent + "  </div>\n" + indent + "</div>\n";
}

/* 把 index.html 里的三处内联标志换成当前几何算出来的版本 */
function updateIndexHtml() {
  const file = path.join(ROOT, "index.html"), m = inlineMarks();
  let html = fs.readFileSync(file, "utf8");
  const swap = (label, re, text) => {
    if (!re.test(html)) throw new Error("index.html 里找不到" + label);
    html = html.replace(re, () => text);
  };
  swap("顶栏标志", /<svg class="brand-mark"[\s\S]*?<\/svg>/, m.brand);
  swap(" favicon", /<link rel="icon" href="data:image\/svg\+xml,[^"]*" \/>/, m.favicon);
  const block = /([ \t]*)<!-- splash:start -->\n[\s\S]*?<!-- splash:end -->/, found = html.match(block);
  if (!found) throw new Error("index.html 里找不到开屏动画的标记（splash:start / splash:end）");
  html = html.replace(block, () => found[1] + "<!-- splash:start -->\n" + splashMarkup(found[1]) + found[1] + "<!-- splash:end -->");
  fs.writeFileSync(file, html);
}

async function main() {
  updateIndexHtml();
  NATIVE_SPLASH.forEach((dir) => {
    fs.mkdirSync(path.join(ROOT, "android-icon-res", dir), { recursive: true });
    fs.writeFileSync(path.join(ROOT, "android-icon-res", dir, "splash.png"), flatPng(16, C.splash));
  });
  if (process.argv.includes("--inline")) {
    console.log("已更新 index.html 里的 favicon、顶栏标志和开屏动画的字");
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
  console.log("已生成 assets/icons/icon.svg、" + list.length + " 张图标 PNG、" + NATIVE_SPLASH.length + " 张原生启动图，并更新了 index.html");
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { VARIANTS, inlineMarks, splashMarkup };
