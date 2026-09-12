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
  await page.focus('#resulttap');
  await page.keyboard.press('Enter');
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

test('the standalone screenshot button is removed; the result itself is the only trigger', async t => {
  const page = await calculator(t);
  assert.equal(html.includes('screenshotBtn'), false, 'No screenshot button markup may remain');
  assert.equal(await page.locator('.screenshot-btn').count(), 0);
  assert.equal(await page.locator('#resulttap').getAttribute('role'), 'button');
  assert.equal(await page.locator('#resulttap').getAttribute('tabindex'), '0');
  assert.equal(await page.locator('#screenshotHint').textContent(), 'Tap to copy · Hold to screenshot · Profit excluded');
});

test('USD and IQD are one Currency dropdown on the left, with Send/Receive on the right', async t => {
  const page = await calculator(t);
  assert.equal(html.includes('class="tabs"'), false, 'The two separate USD/IQD tab buttons are gone');
  assert.equal(await page.locator('#currency').evaluate(el => el.tagName), 'SELECT', 'Currency is a real dropdown');
  assert.equal(await page.locator('#currency').evaluate(el => el.options.length), 2);
  assert.deepEqual(await page.locator('#currency').evaluate(el => Array.from(el.options).map(o => o.value)), ['usd', 'iqd']);
  assert.deepEqual(await page.locator('#currency').evaluate(el => Array.from(el.options).map(o => o.textContent.trim())), ['USD', 'IQD']);
  assert.equal((await page.locator('.currency-caption label').textContent()).trim(), 'Currency');
  assert.equal(await page.locator('#currency').evaluate(el => !!el.closest('.topbar') && !!el.closest('.topbar').querySelector('#modeswitch')), true, 'Dropdown and Send/Receive share one topbar row');

  const picker = await page.locator('.currency-picker').boundingBox();
  const modeSwitch = await page.locator('#modeswitch').boundingBox();
  const frame = await page.locator('.main-content').boundingBox();
  assert.ok(picker.x <= frame.x + 2, `currency dropdown starts on the left (x=${picker.x}, frame=${frame.x})`);
  assert.ok(modeSwitch.x > picker.x + picker.width / 2, 'Send/Receive sits to the right of the currency dropdown');
  assert.ok(Math.abs((picker.y + picker.height) - (modeSwitch.y + modeSwitch.height)) < 24, 'both controls share the same row');
  assert.ok(frame.x + frame.width - (modeSwitch.x + modeSwitch.width) < 56, 'Send/Receive is right-aligned');
});

test('the merged topbar still fits a 320px phone', async t => {
  const page = await calculator(t, { viewport: { width: 320, height: 720 } });
  const picker = await page.locator('.currency-picker').boundingBox();
  const modeSwitch = await page.locator('#modeswitch').boundingBox();
  const frame = await page.locator('.app-frame').boundingBox();
  assert.ok(picker.width > 90, `the currency dropdown keeps a usable width (${picker.width}px)`);
  assert.ok(modeSwitch.width > 90, `the Send/Receive switcher keeps a usable width (${modeSwitch.width}px)`);
  assert.ok(picker.x + picker.width <= frame.x + frame.width + 1, 'the dropdown stays inside the screen');
  assert.ok(modeSwitch.x + modeSwitch.width <= frame.x + frame.width + 1, 'Send/Receive stays inside the screen');
  assert.equal(await page.locator('#currency').isVisible(), true);
  assert.equal(await page.locator('#modeswitch .mode-btn').first().isVisible(), true);
});

test('the Currency dropdown drives the whole calculator and keeps Send/Receive independent', async t => {
  const page = await calculator(t);
  assert.equal(await page.locator('#rate').inputValue(), '1', 'USD default rate');
  assert.equal(await page.locator('#ratecur').textContent(), 'USD per 1 USDT');
  assert.equal(await page.locator('#currencyName').textContent(), 'US Dollar');

  await page.selectOption('#currency', 'iqd');
  assert.equal(await page.locator('#rate').inputValue(), '14', 'the IQD default rate is restored on switch');
  assert.equal(await page.locator('#ratecur').textContent(), 'IQD per 1 USDT');
  assert.equal(await page.locator('#amtcur').textContent(), 'IQD');
  assert.equal(await page.locator('#currencyName').textContent(), 'Iraqi Dinar');
  assert.deepEqual(await page.locator('#chips .chip').allTextContents(), ['500K', '1M', '1.5M', '2M']);
  assert.equal(await page.locator('#modeswitch .mode-btn.active').textContent(), 'Send', 'the direction is untouched by a currency change');

  await page.fill('#rate', '1500');
  await page.fill('#amt', '1500000');
  assert.equal(await page.locator('#out').textContent(), '1,000.00');
  assert.equal(await page.locator('#outunit').textContent(), 'USDT');

  await page.click('[data-mode="receive"]');
  assert.equal(await page.locator('#currency').inputValue(), 'iqd', 'the currency stays IQD when the direction changes');
  assert.equal(await page.locator('#resultlabel').textContent(), 'Send');
  await page.fill('#amt', '100');
  assert.equal(await page.locator('#out').textContent(), '150,000');
  assert.equal(await page.locator('#outunit').textContent(), 'IQD');

  await page.selectOption('#currency', 'usd');
  assert.equal(await page.locator('#modeswitch .mode-btn.active').textContent(), 'Receive');
  assert.equal(await page.locator('#rate').inputValue(), '1', 'USD default rate returns');
  assert.equal(await page.locator('#ratecur').textContent(), 'USD per 1 USDT');
});

test('the currency dropdown is keyboard accessible', async t => {
  const page = await calculator(t);
  await page.focus('#currency');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#currency').inputValue(), 'iqd');
  assert.equal(await page.locator('#ratecur').textContent(), 'IQD per 1 USDT');
  assert.equal(await page.locator('#rate').inputValue(), '14');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#currency').inputValue(), 'usd');
  assert.equal(await page.locator('#rate').inputValue(), '1');
});

test('the calculator has no deploy demo and still supports conversion and screenshots', async t => {
  const page = await calculator(t);
  assert.equal(await page.locator('#deployDemoPanel, #deployDemoBtn, .deploy-demo').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Deploy to GitHub' }).count(), 0);
  await setValues(page, '1500', '1500000');
  assert.equal(await page.locator('#out').textContent(), '1,000.00');
  await openScreenshot(page);
  assert.equal(await page.evaluate(() => window.drawnText.length), 11);
});

const conversions = [
  { currency: 'usd', mode: 'send', rate: '1.05', amount: '1000', label: 'RECEIVE', result: '952.38', unit: 'USDT', pair: 'USD → USDT', input: '1,000 USD' },
  { currency: 'usd', mode: 'receive', rate: '1.05', amount: '100', label: 'SEND', result: '105.00', unit: 'USD', pair: 'USDT → USD', input: '100 USDT' },
  { currency: 'iqd', mode: 'send', rate: '1500', amount: '1500000', label: 'RECEIVE', result: '1,000.00', unit: 'USDT', pair: 'IQD → USDT', input: '1,500,000 IQD' },
  { currency: 'iqd', mode: 'receive', rate: '1500', amount: '100', label: 'SEND', result: '150,000', unit: 'IQD', pair: 'USDT → IQD', input: '100 USDT' }
];

for (const conversion of conversions) {
  test(`PNG download has the correct ${conversion.currency.toUpperCase()} ${conversion.mode} result`, async t => {
    const page = await calculator(t);
    if (conversion.currency !== 'usd') await page.selectOption('#currency', conversion.currency);
    if (conversion.mode !== 'send') await page.click('[data-mode="receive"]');
    await setValues(page, conversion.rate, conversion.amount);
    await openScreenshot(page);
    const drawn = await page.evaluate(() => window.drawnText);
    const rate = Number(conversion.rate).toLocaleString('en-US') + ' ' + conversion.currency.toUpperCase() + '/USDT';
    assert.deepEqual(drawn, [
      'EXCHANGE CALCULATOR', conversion.pair, conversion.label, conversion.result, conversion.unit,
      await page.locator('#outsub').textContent(), 'Unit price', rate,
      conversion.mode === 'send' ? 'Amount sent' : 'Amount to receive', conversion.input,
      new URL(page.url()).origin
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

test('the PNG footer prints the site URL, falling back to the public site for local files', async t => {
  const page = await calculator(t);
  await setValues(page);
  await openScreenshot(page);
  const drawn = await page.evaluate(() => window.drawnText);
  assert.equal(drawn[drawn.length - 1], new URL(page.url()).origin, 'the last thing drawn is the site URL');
  assert.doesNotMatch(drawn.slice(0, -1).join('\n'), /https?:\/\//, 'the URL is printed once, in the footer only');

  const cases = await page.evaluate(() => [
    siteUrlFor('https://sarakmacbook.github.io', '/calculator_Exchange_V2/index.html', 'sarakmacbook.github.io'),
    siteUrlFor('https://calc.example.com', '/deeper/', 'calc.example.com'),
    siteUrlFor('http://localhost:8080', '/', 'localhost'),
    siteUrlFor('http://192.168.1.5:80', '/', '192.168.1.5'),
    siteUrlFor('https://8080-demo.e2b.app', '/', '8080-demo.e2b.app'),
    siteUrlFor('null', '/home/user/index.html', '')
  ]);
  const brand = 'https://sarakmacbook.github.io/calculator_Exchange_V2';
  assert.deepEqual(cases, [
    brand, 'https://calc.example.com/deeper', brand, brand, brand, brand
  ], 'real hosts are printed as-is; file://, localhost, IPs and preview hosts use the public URL');
});

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
  assert.equal(await page.evaluate(() => window.drawnText.length), 11);
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
  const ready = () => page.locator('#resulttap').evaluate(el => el.classList.contains('screenshot-ready'));
  assert.equal(await ready(), false);
  for (const [rate, amount] of [['1', ''], ['0', '100'], ['-1', '100'], ['abc', '100'], ['1', '0'], ['1', '-10'], ['1', 'NaN'], ['1e-300', '1e300'], ['1e300', '1e-300']]) {
    await setValues(page, rate, amount);
    assert.equal(await ready(), false, `${rate}, ${amount}`);
    await pointer(page, 'pointerdown');
    await page.clock.runFor(700);
    await pointer(page, 'pointerup');
    assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  }
  await setValues(page);
  assert.equal(await ready(), true);
});

test('keyboard activation, Escape, focus return and URL cleanup work', async t => {
  const page = await calculator(t);
  await setValues(page);
  for (const key of ['Enter', 'Space']) {
    await page.focus('#resulttap');
    await page.keyboard.press(key);
    await page.waitForSelector('#screenshotDialog[open]');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'screenshotClose');
    const url = await page.locator('#screenshotImage').getAttribute('src');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('screenshotImage').hasAttribute('src'));
    await page.clock.runFor(1100);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'resulttap');
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
  await page.focus('#resulttap');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('#toast').textContent(), 'Could not create screenshot. Please try again.');
  assert.equal(await page.locator('#resulttap').getAttribute('aria-busy'), 'false');
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  await openScreenshot(page);
  assert.equal(await page.locator('#screenshotImage').evaluate(image => image.naturalWidth), 1200);
});

// ===== TAP TO COPY RESULT =====
async function tapResult(page) {
  await pointer(page, 'pointerdown');
  await pointer(page, 'pointerup');
}

// Record clipboard writes deterministically, independent of OS/CI clipboard focus.
async function recordClipboard(page) {
  await page.evaluate(() => {
    window.__copied = [];
    const cp = navigator.clipboard;
    if (cp && cp.writeText) {
      const original = cp.writeText.bind(cp);
      cp.writeText = text => { window.__copied.push(String(text)); return original(text); };
    }
  });
}

const copies = [
  { currency: 'usd', mode: 'send', rate: '1.05', amount: '1000', copied: '952.38' },
  { currency: 'usd', mode: 'receive', rate: '1.05', amount: '100', copied: '105.00' },
  { currency: 'iqd', mode: 'send', rate: '1500', amount: '1500000', copied: '1000.00' },
  { currency: 'iqd', mode: 'receive', rate: '1500', amount: '100', copied: '150000' }
];

for (const c of copies) {
  test(`tapping the result copies the ${c.currency.toUpperCase()} ${c.mode} result number, not a screenshot`, async t => {
    const page = await calculator(t);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await recordClipboard(page);
    if (c.currency !== 'usd') await page.selectOption('#currency', c.currency);
    if (c.mode !== 'send') await page.click('[data-mode="receive"]');
    await setValues(page, c.rate, c.amount);
    await tapResult(page);
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
    assert.equal(await page.locator('#toast').textContent(), 'Copied');
    assert.deepEqual(await page.evaluate(() => window.__copied), [c.copied]);
    assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
    assert.deepEqual(await page.evaluate(() => window.drawnText), [], 'A tap must not draw a screenshot');
  });
}

test('copy gives a toast and keeps the result area unchanged', async t => {
  const page = await calculator(t);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await recordClipboard(page);
  await setValues(page, '1.05', '1000');
  const before = await page.locator('#out').textContent();
  await tapResult(page);
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
  assert.equal(await page.locator('#out').textContent(), before);
  assert.equal(await page.locator('#resulttap').evaluate(el => el.classList.contains('is-holding')), false);
  assert.equal(await page.locator('#resulttap').getAttribute('aria-busy'), 'false');
});

test('dragging or scrolling the result does not copy or screenshot', async t => {
  const page = await calculator(t);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await recordClipboard(page);
  await setValues(page, '1.05', '1000');
  await pointer(page, 'pointerdown');
  await pointer(page, 'pointermove', { clientY: 115 });
  await pointer(page, 'pointerup');
  await page.clock.runFor(1000);
  assert.deepEqual(await page.evaluate(() => window.__copied), []);
  assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
});

test('invalid, zero or missing results are not copied', async t => {
  const page = await calculator(t);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await recordClipboard(page);
  for (const [rate, amount] of [['1', ''], ['0', '100'], ['-1', '100'], ['abc', '100'], ['1', '0']]) {
    await setValues(page, rate, amount);
    await tapResult(page);
    await page.clock.runFor(700);
  }
  assert.deepEqual(await page.evaluate(() => window.__copied), []);
  assert.equal(await page.locator('#screenshotDialog').evaluate(el => el.open), false);
});

test('the amount calculator adds, subtracts, multiplies, and divides the entered amount', async t => {
  const page = await calculator(t);
  await page.fill('#amt', '10');
  assert.equal(await page.locator('#amountCalcToggle').isEnabled(), true);
  await page.click('#amountCalcToggle');
  assert.equal(await page.locator('#amountCalcPanel').isVisible(), true);

  const calculate = async (operation, operand, total) => {
    await page.click(`[data-amount-operation="${operation}"]`);
    await page.fill('#amountCalcOperand', operand);
    assert.equal(await page.locator('#amountCalcResult').textContent(), `${total} USD`);
    await page.click('#amountCalcApply');
    assert.equal(await page.locator('#amt').inputValue(), total);
  };

  await calculate('+', '10', '20');
  await calculate('-', '5', '15');
  await calculate('*', '2', '30');
  await calculate('/', '3', '10');
  assert.equal(await page.locator('#out').textContent(), '10.00');
});

test('the % panel shows the entered percentage of the base profit', async t => {
  const page = await calculator(t);
  await setValues(page, '1.05', '1000');
  assert.equal(await page.locator('#s1').textContent(), '+47.62 USD', 'base profit in the profit row');
  await page.click('#pctBtn');
  assert.equal(await page.locator('#pctPanel').isVisible(), true);
  assert.equal(await page.locator('#pctBase').textContent(), '+47.62 USD', 'base profit shown in the % panel');
  assert.equal(await page.locator('#pctInput').inputValue(), '40', 'default percentage is 40');
  assert.equal(await page.locator('#pctResult').textContent(), '19.05 USD', '40% of the base profit');
  await page.fill('#pctInput', '10');
  assert.equal(await page.locator('#pctResult').textContent(), '4.76 USD', '10% of the base profit');
  await page.fill('#pctInput', '100');
  assert.equal(await page.locator('#pctResult').textContent(), '47.62 USD', '100% of the base profit');
});

test('the % panel shows the percentage of the profit in receive mode too', async t => {
  const page = await calculator(t);
  await page.click('[data-mode="receive"]');
  await setValues(page, '1.05', '100');
  assert.equal(await page.locator('#s1').textContent(), '+5.00 USD', 'base profit in receive mode');
  await page.click('#pctBtn');
  assert.equal(await page.locator('#pctResult').textContent(), '2.00 USD', '40% of the base profit');
});

test('the amount calculator refuses a zero divisor and non-positive total', async t => {
  const page = await calculator(t);
  await page.fill('#amt', '10');
  await page.click('#amountCalcToggle');
  await page.click('[data-amount-operation="/"]');
  await page.fill('#amountCalcOperand', '0');
  assert.equal(await page.locator('#amountCalcResult').textContent(), 'Cannot divide by zero');
  assert.equal(await page.locator('#amountCalcApply').isDisabled(), true);
  await page.click('[data-amount-operation="-"]');
  await page.fill('#amountCalcOperand', '10');
  assert.equal(await page.locator('#amountCalcResult').textContent(), 'Total must be greater than zero');
  assert.equal(await page.locator('#amountCalcApply').isDisabled(), true);
});
