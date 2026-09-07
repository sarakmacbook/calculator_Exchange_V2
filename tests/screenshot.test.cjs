const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
let html;
before(async () => {
  html = await readFile(path.join(__dirname, '..', 'index.html'), 'utf8');
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: JSON.parse(process.env.CHROMIUM_ARGS || '[]')
  });
});
after(async () => { await browser?.close(); });

async function calculator(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => {
    await context.close();
    assert.deepEqual(errors, [], 'No uncaught browser errors');
  });
  // Serve the real, self-contained page without a separate server or external assets.
  await page.route('https://calculator.test/**', route => route.fulfill({
    status: route.request().url() === 'https://calculator.test/' ? 200 : 404,
    contentType: 'text/html',
    body: route.request().url() === 'https://calculator.test/' ? html : ''
  }));
  await page.addInitScript(() => {
    window.drawnText = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      window.drawnText.push(String(args[0]));
      return fillText.apply(this, args);
    };
    window.revokedUrls = [];
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = url => { window.revokedUrls.push(url); revoke.call(URL, url); };
  });
  await page.goto('https://calculator.test/');
  await page.clock.install({ time: new Date('2026-09-07T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-07T00:00:01Z'));
  return page;
}

async function setValues(page, rate = '1.05', amount = '1000') {
  await page.fill('#rate', rate);
  await page.fill('#amt', amount);
}

async function openScreenshot(page) {
  await page.click('#screenshotBtn');
  await page.waitForSelector('#screenshotDialog[open]');
  await page.locator('#screenshotImage').evaluate(image => image.decode());
}

async function pngBytes(page) {
  const bytes = await page.locator('#screenshotImage').evaluate(async image =>
    Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())));
  return Buffer.from(bytes);
}

async function pointer(page, type, extra = {}, selector = '#resulttap') {
  await page.dispatchEvent(selector, type, {
    pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0,
    clientX: 100, clientY: 100, bubbles: true, ...extra
  });
}

const conversions = [
  { currency: 'usd', mode: 'send', rate: '1.05', amount: '1000', label: 'RECEIVE', result: '952.38', unit: 'USDT', pair: 'USD → USDT', input: '1,000 USD' },
  { currency: 'usd', mode: 'receive', rate: '1.05', amount: '100', label: 'SEND', result: '105.00', unit: 'USD', pair: 'USDT → USD', input: '100 USDT' },
  { currency: 'iqd', mode: 'send', rate: '1500', amount: '1500000', label: 'RECEIVE', result: '1,000.00', unit: 'USDT', pair: 'IQD → USDT', input: '1,500,000 IQD' },
  { currency: 'iqd', mode: 'receive', rate: '1500', amount: '100', label: 'SEND', result: '150,000', unit: 'IQD', pair: 'USDT → IQD', input: '100 USDT' }
];

for (const conversion of conversions) {
  test(`PNG download has the correct ${conversion.currency.toUpperCase()} ${conversion.mode} result`, async t => {
    const page = await calculator(t);
    if (conversion.currency !== 'usd') await page.click('[data-currency="iqd"]');
    if (conversion.mode !== 'send') await page.click('[data-mode="receive"]');
    await setValues(page, conversion.rate, conversion.amount);
    await openScreenshot(page);
    const drawn = await page.evaluate(() => window.drawnText);
    const rate = Number(conversion.rate).toLocaleString('en-US') + ' ' + conversion.currency.toUpperCase() + '/USDT';
    assert.deepEqual(drawn, [
      'EXCHANGE CALCULATOR', conversion.pair, conversion.label, conversion.result, conversion.unit,
      await page.locator('#outsub').textContent(), 'Unit price', rate,
      conversion.mode === 'send' ? 'Amount sent' : 'Amount to receive', conversion.input
    ]);
    const downloadPromise = page.waitForEvent('download');
    await page.click('#screenshotDownload');
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), `exchange-result-${conversion.currency}-${conversion.mode}.png`);
    const png = await readFile(await download.path());
    assert.deepEqual(png.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 840);
    assert.deepEqual(png, await pngBytes(page));
  });
}

test('all profit panels are excluded, remain unchanged, and export works offline', async t => {
  const page = await calculator(t);
  await setValues(page);
  await openScreenshot(page);
  const baseline = await pngBytes(page);
  await page.click('#screenshotClose');
  await page.click('#profitToggle');
  await page.fill('#prBuy', '0.8');
  await page.fill('#prSell', '1.4');
  await page.fill('#prAmt', '2345');
  await page.click('#pctBtn');
  await page.fill('#pctInput', '37');
  const privateState = () => ['profitPanel', 'prBuy', 'prSell', 'prAmt', 'prResult', 'profitRow', 'pctPanel', 'pctInput'].map(id => {
    const element = document.getElementById(id);
    return [id, element.innerHTML, element.value, element.className, element.getAttribute('style')];
  });
  const beforeCapture = await page.evaluate(privateState);
  await page.context().setOffline(true);
  await openScreenshot(page);
  assert.deepEqual(await pngBytes(page), baseline, 'Private values and open panels must not change any PNG bytes');
  assert.deepEqual(await page.evaluate(privateState), beforeCapture);
  assert.doesNotMatch((await page.evaluate(() => window.drawnText)).join('\n'), /profit|revenue|cost|percentage|%/i);
  await page.click('#screenshotClose');
  assert.deepEqual(await page.evaluate(privateState), beforeCapture);
});

test('mouse hold captures once after 650ms, with a visible hold indicator', async t => {
  const page = await calculator(t);
  await setValues(page);
  const box = await page.locator('#resulttap').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  assert.equal(await page.locator('#resulttap').evaluate(el => el.classList.contains('is-holding')), true);
  await page.clock.runFor(600);
  assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  await page.clock.runFor(100);
  await page.waitForSelector('#screenshotDialog[open]');
  await page.clock.runFor(2000);
  assert.equal(await page.evaluate(() => window.drawnText.length), 10);
  await page.mouse.up();
  assert.equal(await page.locator('#resulttap').evaluate(el => el.classList.contains('is-holding')), false);
});

const cancellations = {
  'short tap': page => pointer(page, 'pointerup'),
  'drag or scroll gesture': page => pointer(page, 'pointermove', { clientY: 115 }),
  'leaving the result': page => pointer(page, 'pointerleave'),
  'pointer cancellation': page => pointer(page, 'pointercancel'),
  'lost pointer capture': page => pointer(page, 'lostpointercapture'),
  'second finger': page => pointer(page, 'pointerdown', { pointerId: 2, isPrimary: false }),
  'scroll event': page => page.dispatchEvent('.main-content', 'scroll'),
  'tab visibility change': page => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))),
  'window blur': page => page.evaluate(() => window.dispatchEvent(new Event('blur'))),
  'Escape': page => page.keyboard.press('Escape'),
  'changed input': page => page.fill('#amt', '2000')
};
for (const [reason, cancel] of Object.entries(cancellations)) {
  test(`${reason} cancels a pending screenshot`, async t => {
    const page = await calculator(t);
    await setValues(page);
    await pointer(page, 'pointerdown');
    await page.clock.runFor(100);
    await cancel(page);
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
    assert.equal(await page.locator('#resulttap').evaluate(el => el.classList.contains('is-holding')), false);
    assert.equal(await page.evaluate(() => window.drawnText.length), 0);
  });
}

test('right-click and holding profit results do not export', async t => {
  const page = await calculator(t);
  await setValues(page);
  for (const selector of ['#resulttap', '#profitRow', '#prProfit', '#pctResult']) {
    await pointer(page, 'pointerdown', selector === '#resulttap' ? { button: 2 } : {}, selector);
    await page.clock.runFor(700);
    await pointer(page, 'pointerup', {}, selector);
    assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  }
  assert.equal(await page.evaluate(() => document.getElementById('resulttap').dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }))), false);
});

test('missing, invalid, zero, negative and non-finite results cannot be exported', async t => {
  const page = await calculator(t);
  assert.equal(await page.locator('#screenshotBtn').isDisabled(), true);
  for (const [rate, amount] of [['1', ''], ['0', '100'], ['-1', '100'], ['abc', '100'], ['1', '0'], ['1', '-10'], ['1', 'NaN'], ['1e-300', '1e300'], ['1e300', '1e-300']]) {
    await setValues(page, rate, amount);
    assert.equal(await page.locator('#screenshotBtn').isDisabled(), true, `${rate}, ${amount}`);
    await pointer(page, 'pointerdown');
    await page.clock.runFor(700);
    await pointer(page, 'pointerup');
    assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  }
  await setValues(page);
  assert.equal(await page.locator('#screenshotBtn').isEnabled(), true);
});

test('keyboard activation, Escape, focus return and URL cleanup work', async t => {
  const page = await calculator(t);
  await setValues(page);
  for (const key of ['Enter', 'Space']) {
    await page.focus('#screenshotBtn');
    await page.keyboard.press(key);
    await page.waitForSelector('#screenshotDialog[open]');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'screenshotClose');
    const url = await page.locator('#screenshotImage').getAttribute('src');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('screenshotImage').hasAttribute('src'));
    await page.clock.runFor(1100);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'screenshotBtn');
    assert.ok((await page.evaluate(() => window.revokedUrls)).includes(url));
    assert.equal(await page.locator('#screenshotDownload').getAttribute('href'), null);
  }
});

test('real touch hold works and the preview fits small phones and landscape', async t => {
  const page = await calculator(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await setValues(page);
  await page.locator('#resulttap').scrollIntoViewIfNeeded();
  const box = await page.locator('#resulttap').boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await page.clock.runFor(700);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForSelector('#screenshotDialog[open]');
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const dialog = await page.locator('#screenshotDialog').boundingBox();
    assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= viewport.width);
    assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= viewport.height);
    await page.locator('#screenshotDownload').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#screenshotDownload').isVisible(), true);
  }
});

test('file sharing is optional and shares only the generated PNG', async t => {
  const page = await calculator(t);
  await setValues(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await openScreenshot(page);
  assert.equal(await page.locator('#screenshotShare').isHidden(), true);
  await page.click('#screenshotClose');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files.length === 1 && files[0].type === 'image/png' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files, title }) => {
      window.shared = { name: files[0].name, type: files[0].type, bytes: Array.from(new Uint8Array(await files[0].arrayBuffer())), title };
    } });
  });
  await openScreenshot(page);
  assert.equal(await page.locator('#screenshotShare').isVisible(), true);
  await page.click('#screenshotShare');
  await page.waitForFunction(() => !!window.shared);
  const shared = await page.evaluate(() => window.shared);
  assert.equal(shared.name, 'exchange-result-usd-send.png');
  assert.equal(shared.type, 'image/png');
  assert.equal(shared.title, 'Exchange result');
  assert.deepEqual(Buffer.from(shared.bytes), await pngBytes(page));
  for (const name of ['AbortError', 'NotAllowedError']) {
    await page.evaluate(name => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled or unavailable', name); } }), name);
    await page.click('#screenshotShare');
    const status = await page.locator('#screenshotStatus').textContent();
    assert.equal(status, name === 'AbortError' ? 'Screenshot shared.' : 'Could not share. Use Save PNG instead.');
    assert.equal(await page.locator('#screenshotDownload').isVisible(), true);
  }
});

test('PNG export failure gives feedback and can be retried', async t => {
  const page = await calculator(t);
  await setValues(page);
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = callback => callback(null);
  });
  await page.click('#screenshotBtn');
  assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('#toast').textContent(), 'Could not create screenshot. Please try again.');
  assert.equal(await page.locator('#screenshotBtn').getAttribute('aria-busy'), 'false');
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  await openScreenshot(page);
  assert.equal(await page.locator('#screenshotImage').evaluate(image => image.naturalWidth), 1200);
});
