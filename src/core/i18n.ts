export type Language = 'en' | 'ru';
export function defaultLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}
const remarks: Record<string, string> = {
  'GO ON. PICK A CORNER.': 'НУ ДАВАЙ. ВЫБИРАЙ УГОЛ.',
  'WHO LET YOU ON THE PITCH?!': 'КТО ТЕБЯ ПУСТИЛ НА ПОЛЕ?!',
  'THE GOAL IS THE WHITE THING.': 'ВОРОТА — ЭТО БЕЛОЕ.',
  'TRY THE OTHER STADIUM.': 'ПОПРОБУЙ СОСЕДНИЙ СТАДИОН.',
  'I DID NOT EVEN HAVE TO MOVE.': 'ДАЖЕ ДВИГАТЬСЯ НЕ ПРИШЛОСЬ.',
  'AIMING IS OPTIONAL, APPARENTLY.': 'ПРИЦЕЛИВАТЬСЯ НЕ ОБЯЗАТЕЛЬНО?',
  'NICE TRY.': 'НЕПЛОХАЯ ПОПЫТКА.',
  'I KNOW YOUR GAME.': 'Я ЗНАЮ ТВОИ ПРИЁМЫ.',
  'NOT TODAY.': 'НЕ СЕГОДНЯ.',
  'SAME TIME NEXT SHOT?': 'ТОТ ЖЕ УГОЛ ЕЩЁ РАЗ?',
  'I WAS ALREADY THERE.': 'Я УЖЕ БЫЛ ТАМ.',
  'TOO EASY.': 'СЛИШКОМ ЛЕГКО.',
  'BLINK AND YOU MISS IT.': 'МОРГНУЛ — И ПРОПУСТИЛ.',
  'SERIOUSLY?': 'СЕРЬЁЗНО?',
  'WAS THAT YOUR FAST ONE?': 'ЭТО БЫЛ ТВОЙ БЫСТРЫЙ?',
  'ARE YOU EVEN TRYING?': 'ТЫ ВООБЩЕ СТАРАЕШЬСЯ?',
  'MAYBE TRY ANOTHER WEBSITE.': 'МОЖЕТ, ПОПРОБУЕШЬ ДРУГОЙ САЙТ?',
  'ONE HAND. NO PROBLEM.': 'ОДНОЙ РУКОЙ. БЕЗ ПРОБЛЕМ.',
  'I COULD DO THIS ALL NIGHT.': 'МОГУ ТАК ВСЮ НОЧЬ.',
  "WAIT. THAT'S ILLEGAL.": 'СТОП. ТАК НЕЛЬЗЯ.',
  'NOBODY SAW THAT.': 'НИКТО ЭТОГО НЕ ВИДЕЛ.',
  'THE LIGHT WAS IN MY EYES.': 'ПРОЖЕКТОР СЛЕПИЛ.',
  'ENJOY IT. IT WON’T HAPPEN AGAIN.': 'НАСЛАЖДАЙСЯ. БОЛЬШЕ НЕ ПОВТОРИТСЯ.',
  'SAME CORNER. SAME RESULT.': 'ТОТ ЖЕ УГОЛ. ТОТ ЖЕ РЕЗУЛЬТАТ.',
  'HE IS NOT EVEN ON THE TEAM.': 'ОН ДАЖЕ НЕ ИЗ КОМАНДЫ!',
  'AIR DEFENCE: ONE. FOOTBALL: ZERO.': 'ПВО: ОДИН. ФУТБОЛ: НОЛЬ.',
  'THE REF IS ON MY SIDE.': 'СУДЬЯ ИГРАЕТ ЗА МЕНЯ.',
};
export function translateRemark(canonicalEnglish: string, language: Language): string {
  return language === 'ru' ? (remarks[canonicalEnglish] ?? canonicalEnglish) : canonicalEnglish;
}
