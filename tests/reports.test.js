import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInstance } from 'i18next';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createPdfDocument } from '../src/lib/pdfReport.js';
import { createShareSummary } from '../src/lib/shareSummary.js';

const fonts = await Promise.all(
  ['Regular', 'Bold'].map(async (style) =>
    (await readFile(new URL(`../src/assets/fonts/Amiri-${style}.ttf`, import.meta.url))).toString(
      'base64',
    ),
  ),
);
const i18n = createInstance();
await i18n.init({
  resources: Object.fromEntries(
    await Promise.all(
      ['en', 'ar'].map(async (language) => [
        language,
        {
          translation: JSON.parse(
            await readFile(new URL(`../src/locales/${language}.json`, import.meta.url)),
          ),
        },
      ]),
    ),
  ),
  lng: 'en',
  interpolation: { escapeValue: false },
});
const split = {
  savedAt: '2026-10-29T12:00:00.000Z',
  members: [
    { id: 'a', name: 'أحمد' },
    { id: 'b', name: 'Sara' },
  ],
  expenses: [
    {
      id: 'e',
      payerId: 'a',
      amount: 1025,
      description: 'Dinner / عشاء',
      createdAt: '2026-10-29T12:00:00.000Z',
    },
  ],
};

for (const language of ['en', 'ar'])
  test(`PDF ${language} embeds text, preserves exact amounts, and paginates long reports`, async () => {
    const expenses = Array.from({ length: 80 }, (_, index) => ({
      ...split.expenses[0],
      id: String(index),
      description: `${index + 1}. Dinner / عشاء مع الأصدقاء`,
    }));
    const document = createPdfDocument([{ ...split, expenses }], {
      language,
      t: i18n.getFixedT(language),
      fonts,
      now: new Date('2026-10-29T12:00:00Z'),
    });
    const data = new Uint8Array(document.output('arraybuffer'));
    assert.equal(Buffer.from(data).subarray(0, 5).toString(), '%PDF-');
    const task = getDocument({ data, useSystemFonts: false });
    const pdf = await task.promise;
    try {
      assert.ok(pdf.numPages >= 3);
      const strings = [];
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        strings.push(...(await page.getTextContent()).items.map((item) => item.str));
      }
      const text = strings.join(' ');
      if (language === 'ar') assert.ok(text.normalize('NFKC').includes('تقرير المصروفات'));
      assert.ok(text.includes('Qisma'));
      assert.ok(text.includes('Sara'));
      assert.ok(text.includes(language === 'en' ? '820.00' : '٨٢٠٫٠٠'));
      assert.ok(
        strings.length > 80,
        'Report contains selectable text rather than page screenshots.',
      );
    } finally {
      await task.destroy();
    }
  });

test('share summaries conserve piastres and do not contain private account or record links', () => {
  const summary = createShareSummary(split, { t: i18n.getFixedT('en'), language: 'en' });
  assert.ok(summary.includes('10.25 EGP'));
  assert.ok(summary.includes('Sara → أحمد: 5.12 EGP'));
  assert.ok(!summary.includes('#/history'));
});
