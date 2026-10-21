import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __penaltyTones: number;
  }
}

const storageKey = 'impossible-penalty:v1';

async function openGame(page: Page, random?: number) {
  if (random !== undefined)
    await page.addInitScript((value) => {
      // Preserve a varying random stream for Phaser's internal UUIDs while
      // keeping every gameplay result inside the selected probability bucket.
      const lower = value < 0.5 ? 0 : value < 0.75 ? 0.5 : value < 0.9 ? 0.75 : 0.9;
      const upper = value < 0.5 ? 0.5 : value < 0.75 ? 0.75 : value < 0.9 ? 0.9 : 1;
      let seed = Math.floor(value * 0xffffffff) | 0 || 1;
      Math.random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return lower + ((seed >>> 0) / 0x100000000) * (upper - lower);
      };
    }, random);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'IMPOSSIBLE PENALTY.' })).toBeVisible();
  await expect(page.locator('.game-stage canvas')).toHaveCount(1);
  await expect(page.locator('.game-stage canvas')).toBeVisible();
  // A canvas is inserted before Phaser boots its first scene on the next frame.
  await page.waitForTimeout(250);
}

async function score(page: Page) {
  return page
    .locator('.scoreboard dd')
    .evaluateAll((items) => items.map((item) => Number.parseInt(item.textContent ?? '0', 10)));
}

async function aimAndShoot(page: Page, x = 0.8, y = 0.25) {
  const canvas = page.locator('.game-stage canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Missing visible game canvas');
  const position = {
    x: ((226 + x * 508) / 960) * box.width,
    y: ((154 + y * 202) / 600) * box.height,
  };
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    await page.touchscreen.tap(box.x + position.x, box.y + position.y);
  } else {
    await canvas.click({ position });
  }
}

async function ready(page: Page) {
  await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Fail after each test if any browser exception or console error was observed.
  (page as Page & { browserErrors: string[] }).browserErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { browserErrors: string[] }).browserErrors).toEqual([]);
});

test('stadium renders cleanly at desktop and mobile sizes', async ({ page }, testInfo) => {
  await openGame(page);
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await expect
    .poll(() =>
      page.locator('.game-stage canvas').evaluate((source) => {
        const scratch = document.createElement('canvas');
        scratch.width = 96;
        scratch.height = 60;
        const context = scratch.getContext('2d');
        if (!context) return 0;
        context.imageSmoothingEnabled = false;
        context.drawImage(source as HTMLCanvasElement, 0, 0, 96, 60);
        const pixels = context.getImageData(0, 0, 96, 60).data;
        const colors = new Set<number>();
        for (let i = 0; i < pixels.length; i += 16) {
          if (pixels[i + 3]) colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
        }
        return colors.size;
      }),
    )
    .toBeGreaterThan(30);
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.width / canvas!.height).toBeCloseTo(960 / 600, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-stadium.png`,
    fullPage: true,
  });
});

test('pointer aiming ignores outside goal and gates rapid clicks until the next round', async ({
  page,
}) => {
  await openGame(page, 0.1);
  await page.locator('canvas').click({ position: { x: 15, y: 15 } });
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await aimAndShoot(page, 0.08, 0.1);
  await expect(page.locator('.phase-indicator')).not.toHaveText('YOUR SHOT.');
  for (let i = 0; i < 4; i++) await aimAndShoot(page, 0.92, 0.85);
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await ready(page);
  await aimAndShoot(page, 0.42, 0.7);
  await expect.poll(() => score(page)).toEqual([2, 0, 2, 2]);
  await ready(page);
});

for (const variant of [
  { label: 'predictor', random: 0.1, expected: [1, 0, 1, 1], remark: 'NICE TRY.' },
  { label: 'flash', random: 0.6, expected: [1, 0, 1, 1], remark: 'TOO EASY.' },
  { label: 'showoff', random: 0.8, expected: [1, 0, 1, 1], remark: 'ARE YOU EVEN TRYING?' },
  { label: 'lucky goal', random: 0.95, expected: [1, 1, 0, 0], remark: "WAIT. THAT'S ILLEGAL." },
]) {
  test(`resolves the ${variant.label} animation and returns to ready`, async ({
    page,
  }, testInfo) => {
    await openGame(page, variant.random);
    await aimAndShoot(page);
    await expect.poll(() => score(page)).toEqual(variant.expected);
    await expect(page.locator('.keeper-remark')).toContainText(variant.remark);
    await expect(page.locator('.phase-indicator')).toHaveText('ONE MORE?');
    if (testInfo.project.name === 'chromium')
      await page.screenshot({
        path: `test-results/${variant.label.replaceAll(' ', '-')}-result.png`,
        fullPage: true,
      });
    await ready(page);
  });
}

test('keyboard, settings, saved statistics and confirmed reset work', async ({ page }) => {
  await openGame(page, 0.1);
  const pitch = page.getByRole('group', { name: /Football pitch/ });
  await pitch.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await ready(page);
  await page.getByRole('button', { name: 'Enable sound' }).click();
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'STATS', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Longest save streak')).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Reduced motion/ }).check();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'STATS', exact: true })).toBeFocused();
  await page.reload();
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'STATS', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /Reduced motion/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Reset statistics' }).click();
  await dialog.getByRole('button', { name: 'Keep my record' }).click();
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await dialog.getByRole('button', { name: 'Reset statistics' }).click();
  await dialog.getByRole('button', { name: 'Yes, reset record' }).click();
  await dialog.getByRole('button', { name: /BACK TO THE SPOT/ }).click();
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await page.reload();
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
});

test('resize and orientation preserve playability and settings dialog blocks shots', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page, 0.1);
  await page.getByRole('button', { name: 'STATS', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Reduced motion/ })).toBeChecked();
  await page.keyboard.press('Enter');
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 844, height: 390 });
  await aimAndShoot(page, 0.9, 0.15);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('denied browser storage keeps an in-memory playable record', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage denied', 'SecurityError');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Storage denied', 'SecurityError');
    };
  });
  await openGame(page, 0.1);
  await expect(page.getByText(/Your browser has disabled storage/)).toBeVisible();
  await aimAndShoot(page);
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await ready(page);
});

test('corrupted stored data recovers to valid defaults', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{invalid-json'), storageKey);
  await openGame(page);
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await expect(page.getByRole('button', { name: 'Enable sound' })).toBeVisible();
});

test('keyboard focus stays inside statistics through reset confirmation and cancellation', async ({
  page,
}) => {
  await openGame(page);
  await page.getByRole('button', { name: 'STATS', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const reset = dialog.getByRole('button', { name: 'Reset statistics' });
  const keep = dialog.getByRole('button', { name: 'Keep my record' });
  const close = dialog.getByRole('button', { name: 'Close statistics' });
  const back = dialog.getByRole('button', { name: /BACK TO THE SPOT/ });

  await reset.focus();
  await page.keyboard.press('Enter');
  await expect(keep).toBeFocused();
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press('Enter');
  await expect(reset).toBeFocused();
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);

  await page.keyboard.press('Enter');
  await expect(keep).toBeFocused();
  await dialog.getByRole('button', { name: 'Yes, reset record' }).focus();
  await page.keyboard.press('Enter');
  await expect(reset).toBeFocused();
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);

  // Recover if a browser or external script removes focus from a modal control.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Shift+Tab');
  await expect(back).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'STATS', exact: true })).toBeFocused();
});

test('background pause resumes the accepted shot exactly once', async ({ page }) => {
  await openGame(page, 0.1);
  await aimAndShoot(page);
  await expect(page.locator('.phase-indicator')).toHaveText('HERE WE GO.');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(1500);
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
  await ready(page);
  await expect.poll(() => score(page)).toEqual([1, 0, 1, 1]);
});

test('enabled sound generates real Web Audio effects and stays unlocked after reload', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createOscillator;
    Object.defineProperty(window, '__penaltyTones', { value: 0, writable: true });
    AudioContext.prototype.createOscillator = function () {
      const state = window;
      state.__penaltyTones++;
      return original.call(this);
    };
  });
  await openGame(page, 0.95);
  await page.getByRole('button', { name: 'Enable sound' }).click();
  await aimAndShoot(page);
  await expect.poll(() => score(page)).toEqual([1, 1, 0, 0]);
  await expect.poll(() => page.evaluate(() => window.__penaltyTones)).toBeGreaterThanOrEqual(6);
  await ready(page);
  await page.reload();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(300);
  // A remembered ON preference must not create audio until the next gesture.
  expect(await page.evaluate(() => window.__penaltyTones)).toBe(0);
  await aimAndShoot(page);
  await expect.poll(() => score(page)).toEqual([2, 2, 0, 0]);
  await expect.poll(() => page.evaluate(() => window.__penaltyTones)).toBeGreaterThanOrEqual(6);
});
