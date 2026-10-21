import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultLanguage, translateRemark } from './i18n';
import { planShot } from './model';
describe('Russian localization', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    ['ru-RU', 'ru'],
    ['ru', 'ru'],
    ['en-US', 'en'],
    ['fr-FR', 'en'],
  ] as const)('uses %s browser default', (locale, expected) => {
    vi.stubGlobal('navigator', { language: locale });
    expect(defaultLanguage()).toBe(expected);
  });
  it('translates all regular outcome remarks including capped-memory sequences', () => {
    for (const value of [0.1, 0.6, 0.8, 0.95])
      for (let index = 0; index < 12; index++) {
        const values = [value, 0.8];
        const shot = planShot({ x: 0.2, y: 0.3 }, [], () => values.shift()!, index);
        expect(translateRemark(shot.remark, 'en')).toBe(shot.remark);
        expect(translateRemark(shot.remark, 'ru')).toMatch(/[А-ЯЁ]/);
      }
  });
  it.each([
    'GO ON. PICK A CORNER.',
    'WHO LET YOU ON THE PITCH?!',
    'HE IS NOT EVEN ON THE TEAM.',
    'SAME CORNER. SAME RESULT.',
    'AIR DEFENCE: ONE. FOOTBALL: ZERO.',
    'THE REF IS ON MY SIDE.',
  ])('translates %s', (remark) => expect(translateRemark(remark, 'ru')).toMatch(/[А-ЯЁ]/));
  it('keeps empty thoughts empty', () => expect(translateRemark('', 'ru')).toBe(''));
});
