import { test, expect, type Page, type TestInfo } from '@playwright/test';

const storageKey = 'impossible-penalty:v1';
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function openGame(page: Page) {
  await page.goto('/');
  const canvas = page.locator('.game-stage canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  // Wait for the first painted pitch, rather than the canvas's pre-boot insertion.
  await expect
    .poll(() =>
      canvas.evaluate((source) => {
        const probe = document.createElement('canvas');
        probe.width = 1;
        probe.height = 1;
        const context = probe.getContext('2d');
        if (!context) return false;
        context.drawImage(source as HTMLCanvasElement, 10, 580, 1, 1, 0, 0, 1, 1);
        const [red, green] = context.getImageData(0, 0, 1, 1).data;
        return green > 30 && green > red;
      }),
    )
    .toBe(true);
  await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
}

async function score(page: Page) {
  return page
    .locator('.scoreboard dd')
    .evaluateAll((items) => items.map((item) => Number.parseInt(item.textContent ?? '0', 10)));
}

async function storedAchievements(page: Page): Promise<string[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}').achievements ?? [],
    storageKey,
  );
}

async function forceGoal(page: Page, fan: boolean) {
  await page.addInitScript(
    (cosmetic) => {
      const original = Math.random.bind(Math);
      let pending: number[] = [];
      Math.random = () => pending.shift() ?? original();
      const arm = (event: Event) => {
        if (event.target instanceof HTMLCanvasElement) pending = [0.95, cosmetic];
      };
      for (const name of ['pointerdown', 'mousedown', 'touchstart'])
        document.addEventListener(name, arm, { capture: true });
    },
    fan ? 0.1 : 0.95,
  );
}

async function shoot(page: Page) {
  const canvas = page.locator('.game-stage canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing game canvas');
  const x = bounds.x + (632 / 960) * bounds.width;
  const y = bounds.y + (204 / 600) * bounds.height;
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function seedRecord(page: Page, stats: Record<string, number>) {
  await page.addInitScript(
    ({ key, stats }) => {
      if (sessionStorage.getItem('features:seeded')) return;
      sessionStorage.setItem('features:seeded', 'yes');
      // Deliberately omit achievements: this is also a migration integration check.
      localStorage.setItem(
        key,
        JSON.stringify({ stats, sound: false, language: 'en', reducedMotion: true }),
      );
    },
    { key: storageKey, stats },
  );
}

async function expectUnlocked(page: Page, ids: string[]) {
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-achievement]')).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator('[data-achievement][data-unlocked="true"]')
        .evaluateAll((items) => items.map((item) => item.getAttribute('data-achievement'))),
    )
    .toEqual(ids);
}

async function assertPitchFits(page: Page) {
  const canvas = page.locator('.game-stage canvas');
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return box ? Math.abs(box.width / box.height - 960 / 600) : 1;
    })
    .toBeLessThan(0.025);
  const geometry = await page.locator('.match-section').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.right - geometry.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.bottom - geometry.height)).toBeLessThanOrEqual(1);
}

async function noteFullscreenMode(page: Page, testInfo: TestInfo) {
  const mode = await page.evaluate(() => {
    const legacy = document as Document & { webkitFullscreenElement?: Element | null };
    const active = document.fullscreenElement ?? legacy.webkitFullscreenElement ?? null;
    return {
      mode: active ? 'native' : 'expanded-fallback',
      actualTarget: active?.classList.contains('match-section') ?? false,
      fullscreenEnabled: document.fullscreenEnabled ?? false,
      standardApi: typeof document.documentElement.requestFullscreen === 'function',
    };
  });
  testInfo.annotations.push({ type: 'fullscreen-mode', description: mode.mode });
  await testInfo.attach('fullscreen-mode.json', {
    body: JSON.stringify(mode, null, 2),
    contentType: 'application/json',
  });
  // No native API is stubbed in this test. A native result must be the real target.
  if (mode.mode === 'native') expect(mode.actualTarget).toBe(true);
  else
    await expect(page.locator('.fullscreen-feedback')).toContainText('Expanded game view enabled.');
}

test('real fullscreen request keeps the pitch, statistics and keyboard shot usable', async ({
  page,
}, testInfo) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  const exit = page.getByRole('button', { name: 'Exit fullscreen', exact: true });
  await expect(exit).toHaveAttribute('aria-pressed', 'true');
  await noteFullscreenMode(page, testInfo);
  await assertPitchFits(page);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-fullscreen.png` });

  const match = page.locator('.match-section');
  await match.getByRole('button', { name: 'STATS', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Achievements', exact: true })).toBeVisible();
  await expectUnlocked(page, []);
  await dialog.getByRole('checkbox').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0, 0]);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close statistics' }).click();
  await expect(dialog).toBeHidden();
  await expect(exit).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('group', { name: /Football pitch/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.locator('.phase-indicator')).not.toHaveText('YOUR SHOT.');
  // Leaving while the shot is active exercises resizing without restarting it.
  await exit.click();
  await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const legacy = document as Document & { webkitFullscreenElement?: Element | null };
        return (document.fullscreenElement ?? legacy.webkitFullscreenElement ?? null) === null;
      }),
    )
    .toBe(true);
  await expect(page.locator('.match-section')).not.toHaveClass(/is-fullscreen/);
  await expect.poll(async () => (await score(page))[0]).toBe(1);
  await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
});

for (const failure of ['missing', 'rejected'] as const) {
  test(`fullscreen ${failure} API uses an escapable expanded view without browser errors`, async ({
    page,
  }) => {
    await page.addInitScript((failure) => {
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        value:
          failure === 'missing'
            ? undefined
            : () =>
                Promise.reject(new DOMException('Fullscreen denied for test', 'NotAllowedError')),
      });
      Object.defineProperty(HTMLElement.prototype, 'webkitRequestFullscreen', {
        configurable: true,
        value: undefined,
      });
    }, failure);
    await openGame(page);
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Exit fullscreen', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.fullscreen-feedback')).toHaveText(
      failure === 'missing'
        ? 'Fullscreen is unavailable in this browser. Expanded game view enabled.'
        : 'Fullscreen could not open. Expanded game view enabled.',
    );
    expect(await page.evaluate(() => document.fullscreenElement ?? null)).toBeNull();
    await assertPitchFits(page);

    await page
      .locator('.match-section')
      .getByRole('button', { name: 'STATS', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Enter fullscreen', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.match-section')).not.toHaveClass(/is-fullscreen/);
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');
    await shoot(page);
    await expect.poll(async () => (await score(page))[0]).toBe(1);
    await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
  });
}

test('first fan goal unlocks two achievements, persists without repeat toasts and resets both', async ({
  page,
}) => {
  await forceGoal(page, true);
  await openGame(page);
  await shoot(page);
  await expect.poll(() => score(page)).toEqual([1, 1, 0, 0, 0]);
  await expect.poll(() => storedAchievements(page)).toEqual(['first-goal', 'fan-goal']);
  await expect(page.locator('[data-achievement-toast="first-goal"]')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss achievement notification' }).click();
  await expect(page.locator('[data-achievement-toast="fan-goal"]')).toBeVisible();
  await expect(page.locator('[data-achievement-toast="fan-goal"]')).toContainText(
    'Pitch accomplice',
  );
  await page.getByRole('button', { name: 'Dismiss achievement notification' }).click();
  await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
  await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
  await page.getByRole('button', { name: 'STATS', exact: true }).click();
  await expectUnlocked(page, ['first-goal', 'fan-goal']);
  await page.getByRole('button', { name: 'Close statistics' }).click();

  await page.reload();
  await expect(page.locator('.game-stage canvas')).toBeVisible();
  await expect.poll(() => storedAchievements(page)).toEqual(['first-goal', 'fan-goal']);
  await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch to Russian' }).click();
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expectUnlocked(page, ['first-goal', 'fan-goal']);
  await expect(page.getByRole('heading', { name: 'Достижения', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Лёд тронулся', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить статистику' }).click();
  await page.getByRole('button', { name: 'Да, сбросить' }).click();
  await expectUnlocked(page, []);
  await expect.poll(() => score(page)).toEqual([0, 0, 0, 0, 0]);
  await expect.poll(() => storedAchievements(page)).toEqual([]);
  await page.reload();
  await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
  await expect.poll(() => storedAchievements(page)).toEqual([]);
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expectUnlocked(page, []);
});

for (const goals of [5, 10]) {
  test(`legacy ${goals}-goal records migrate milestones without inventing special achievements`, async ({
    page,
  }) => {
    await seedRecord(page, { shots: goals + 12, goals, saves: 12, streak: 0, bestStreak: 12 });
    await openGame(page);
    const expected =
      goals === 5 ? ['first-goal', 'five-goals'] : ['first-goal', 'five-goals', 'ten-goals'];
    await expect.poll(() => storedAchievements(page)).toEqual(expected);
    await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
    await page.getByRole('button', { name: 'STATS', exact: true }).click();
    await expectUnlocked(page, expected);
    await expect(page.locator('[data-achievement="comeback"]')).toHaveAttribute(
      'data-unlocked',
      'false',
    );
    await expect(page.locator('[data-achievement="fan-goal"]')).toHaveAttribute(
      'data-unlocked',
      'false',
    );
    await page.reload();
    await expect.poll(() => storedAchievements(page)).toEqual(expected);
    await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
  });
}

for (const streak of [9, 10]) {
  test(`a goal after ${streak} saves uses the current streak for the comeback boundary`, async ({
    page,
  }) => {
    await seedRecord(page, {
      shots: streak + 14,
      goals: 4,
      saves: streak + 10,
      misses: 0,
      streak,
      bestStreak: Math.max(10, streak),
    });
    await forceGoal(page, false);
    await openGame(page);
    await expect.poll(() => storedAchievements(page)).toEqual(['first-goal']);
    await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
    await shoot(page);
    await expect.poll(() => score(page)).toEqual([streak + 15, 5, streak + 10, 0, 0]);
    const expected =
      streak === 10 ? ['first-goal', 'five-goals', 'comeback'] : ['first-goal', 'five-goals'];
    await expect.poll(() => storedAchievements(page)).toEqual(expected);
    await expect(page.locator('[data-achievement-toast="five-goals"]')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss achievement notification' }).click();
    if (streak === 10) {
      await expect(page.locator('[data-achievement-toast="comeback"]')).toBeVisible();
      await page.getByRole('button', { name: 'Dismiss achievement notification' }).click();
    }
    await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
    await expect(page.locator('.phase-indicator')).toHaveText('YOUR SHOT.');
    await page.getByRole('button', { name: 'STATS', exact: true }).click();
    await expectUnlocked(page, expected);
    await page.reload();
    await expect.poll(() => storedAchievements(page)).toEqual(expected);
    await expect(page.locator('[data-achievement-toast]')).toHaveCount(0);
  });
}
