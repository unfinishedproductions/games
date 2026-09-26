// Test 4: the photo pieces (EXIF GPS / heading / lens, latitude-longitude onto the game grid, the camera pose) and the Markdown
// renderer's safety, taken out of dist/editor.js and run on their own.
const vm = require('vm'), fs = require('fs'), path = require('path'), acorn = require('acorn'), assert = require('assert');
const ed = fs.readFileSync(path.join(__dirname, '..', 'dist', 'editor.js'), 'utf8');
const body = acorn.parse(ed, { ecmaVersion: 'latest' }).body.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression').expression.callee.body.body;
const want = ['exifOf', 'tiff', 'GEO', 'pl', 'geoToGame', 'photoPose', 'md', 'esc', 'deg', 'r1', 'compass', 'clip'];
let code = '';for (const n of body) { const nm = n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name) : n.id ? [n.id.name] : []; if (nm.some(x => want.includes(x))) code += ed.slice(n.start, n.end) + '\n'; }
for (const w of want) assert(new RegExp(`\\b${w}\\b`).test(code), 'missing ' + w);
const ctx = { VIS: { x0: -640, x1: 1400, z0: -980, z1: 620 }, groundAt: () => 0.16, placeName: (x, z) => `near (${Math.round(x)}, ${Math.round(z)})`, DataView, Math, String };
vm.createContext(ctx);vm.runInContext(code, ctx);

// a JPEG with an EXIF block: GPS 41° 52' 55.2" N, 87° 37' 40.08" W (State & Madison), facing 123° true, 26 mm equivalent lens
function jpeg({ latRef = 'N', lat = [41, 52, 55.2], lonRef = 'W', lon = [87, 37, 40.08], dirRef = 'T', dir = 123, f35 = 26 }) {
  const b = Buffer.alloc(400); let p = 0; const w16 = v => { b.writeUInt16LE(v, p); p += 2; }, w32 = v => { b.writeUInt32LE(v, p); p += 4; };
  b.write('II', 0); p = 2; w16(42); w32(8);// TIFF header, IFD0 at 8
  const IFD0 = 8, EXIF = 40, GPS = 70, DATA = 150;
  p = IFD0; w16(2); w16(0x8825); w16(4); w32(1); w32(GPS); w16(0x8769); w16(4); w32(1); w32(EXIF); w32(0);
  p = EXIF; w16(1); w16(0xA405); w16(3); w32(1); w16(f35); w16(0); w32(0);
  let d = DATA; const rat = (arr) => { const at = d; for (const v of arr) { const den = 100; b.writeUInt32LE(Math.round(v * den), d); b.writeUInt32LE(den, d + 4); d += 8; } return at; };
  const la = rat(lat), lo = rat(lon), di = rat([dir]);
  const asc = (s) => Buffer.from(s + '\0\0\0').readUInt32LE(0);
  p = GPS; w16(6);
  w16(1); w16(2); w32(2); w32(asc(latRef)); w16(2); w16(5); w32(3); w32(la);
  w16(3); w16(2); w32(2); w32(asc(lonRef)); w16(4); w16(5); w32(3); w32(lo);
  w16(0x10); w16(2); w32(2); w32(asc(dirRef)); w16(0x11); w16(5); w32(1); w32(di); w32(0);
  const tiff = b.slice(0, d), app1 = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
  const out = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), len, app1, Buffer.from([0xFF, 0xDA, 0, 2, 0xFF, 0xD9])]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.length);
}
const G = c => vm.runInContext(c, ctx);ctx.buf = jpeg({});
const ex = G('exifOf(buf)');
assert(Math.abs(ex.lat - 41.882) < 1e-4 && Math.abs(ex.lon + 87.6278) < 1e-4, JSON.stringify(ex));
assert.strictEqual(ex.heading, 123);assert.strictEqual(ex.headingRef, 'T');assert.strictEqual(ex.focal35, 26);
// State & Madison is (110, -30) on the game grid; Lake & Michigan (310, -330); between streets it interpolates
let g = G('geoToGame(41.8820,-87.6278)');assert(Math.abs(g.x - 110) < .5 && Math.abs(g.z + 30) < .5, JSON.stringify(g));
g = G('geoToGame(41.8857,-87.6245)');assert(Math.abs(g.x - 310) < .5 && Math.abs(g.z + 330) < .5, JSON.stringify(g));
g = G('geoToGame(41.88385,-87.62695)');assert(g.x > 110 && g.x < 210 && g.z > -230 && g.z < -130, JSON.stringify(g));
// the pose: eye height, the heading, a vertical field of view from the lens (landscape 26 mm: about 50°)
let pose = G('photoPose(exifOf(buf),4032,3024)');
assert(pose.inside && Math.abs(pose.x - 110) < 1 && Math.abs(pose.z + 30) < 1 && Math.abs(pose.y - 1.76) < .05 && pose.heading === 123 && Math.abs(pose.fov - 50) <= 1, JSON.stringify(pose));
pose = G('photoPose(exifOf(buf),3024,4032)');assert(Math.abs(pose.fov - 69) <= 1, 'portrait: ' + pose.fov);
ctx.buf2 = jpeg({ dirRef: 'M', dir: 10 });pose = G('photoPose(exifOf(buf2),4000,3000)');assert.strictEqual(pose.heading, 7, 'magnetic to true: ' + pose.heading);
ctx.buf3 = jpeg({ dirRef: 'M', dir: 2 });assert.strictEqual(G('photoPose(exifOf(buf3),4000,3000)').heading, 359, 'wraps');
assert.strictEqual(G('exifOf(new ArrayBuffer(4))'), null);assert.strictEqual(G('photoPose(null,1,1)'), null);
ctx.png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).buffer;assert.strictEqual(G('exifOf(png)'), null);
// Markdown: the text is escaped; links only http(s); code fences kept
const h = G(`md('Hi **there** <img src=x onerror=alert(1)> [x](javascript:alert(1)) [ok](https://example.com)\\n- one\\n- two\\n\\n\`\`\`\\nconst a=1<2;\\n\`\`\`')`);
assert(!/<img/.test(h) && /&lt;img/.test(h), h);assert(!/href="javascript/.test(h), h);assert(/<a href="https:\/\/example\.com" target="_blank" rel="noopener">ok<\/a>/.test(h), h);
assert(/<ul><li>one<\/li><li>two<\/li><\/ul>/.test(h) && /<pre>const a=1&lt;2;\n<\/pre>/.test(h) && /<b>there<\/b>/.test(h), h);
console.log('test4 photos & markdown: all checks passed');
