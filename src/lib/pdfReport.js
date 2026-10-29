import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { calculateResults, formatMoney } from './expenses.js';

const fontUrls = [
  new URL('../assets/fonts/Amiri-Regular.ttf', import.meta.url),
  new URL('../assets/fonts/Amiri-Bold.ttf', import.meta.url),
];
let fontsPromise;
async function loadFonts() {
  fontsPromise ??= Promise.all(
    fontUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Font unavailable.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let index = 0; index < bytes.length; index += 32768)
        binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
      return btoa(binary);
    }),
  ).catch((error) => {
    fontsPromise = undefined;
    throw error;
  });
  return fontsPromise;
}

// Text stays selectable. Font embedding and Arabic shaping happen on this device.
export function createPdfDocument(splits, { language, t, fonts, now = new Date() }) {
  if (!splits.length) throw new Error('No splits to export.');
  const doc = new jsPDF({ compress: true, putOnlyUsedFonts: true });
  fonts.forEach((data, index) => {
    const name = index ? 'Qisma-Bold.ttf' : 'Qisma-Regular.ttf';
    doc.addFileToVFS(name, data);
    doc.addFont(name, 'Qisma', index ? 'bold' : 'normal');
  });
  doc.setProperties({
    title: `Qisma — ${t('pdf.title')}`,
    author: 'Qisma',
    subject: t('pdf.subtitle'),
    creator: 'Qisma',
  });
  const rtl = language === 'ar';
  doc.setR2L(false);
  // Reorder each shaped line once, preserving Latin names and the order of digits.
  const bidi = new jsPDF.__bidiEngine__({
    isInputVisual: false,
    isOutputVisual: true,
    isOutputRtl: false,
  });
  const visual = (value) => bidi.doBidiReorder(doc.processArabic(String(value)));
  const align = rtl ? 'right' : 'left';
  const x = rtl ? 194 : 16;
  const date = (value) =>
    new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' }).format(
      new Date(value),
    );
  const money = (amount) => formatMoney(amount, language);
  let y = 0;
  const text = (value, top, size = 10, bold = false, color = '#343a40') => {
    doc
      .setFont('Qisma', bold ? 'bold' : 'normal')
      .setFontSize(size)
      .setTextColor(color);
    doc.text([visual(value)], x, top, {
      align,
      R2L: false,
      isInputVisual: true,
      isOutputVisual: true,
      isInputRtl: false,
      isOutputRtl: false,
    });
  };
  function table(headers, rows, widths) {
    const order = (values) => (rtl ? [...values].reverse() : values);
    const columnStyles = Object.fromEntries(
      order(widths).map((width, index) => [index, { cellWidth: width }]),
    );
    autoTable(doc, {
      startY: y,
      margin: { top: 22, right: 16, bottom: 20, left: 16 },
      head: [order(headers)],
      body: rows.map(order),
      tableWidth: 178,
      styles: {
        font: 'Qisma',
        fontStyle: 'normal',
        fontSize: 9,
        halign: align,
        cellPadding: 3,
        overflow: 'linebreak',
        textColor: '#343a40',
        lineColor: '#e3e8ee',
        lineWidth: 0.1,
      },
      headStyles: { fillColor: '#4a6fa5', textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#f3f6fa' },
      columnStyles,
      rowPageBreak: 'avoid',
      willDrawCell: (data) => {
        data.cell.text = data.cell.text.map(visual);
      },
    });
    y = doc.lastAutoTable.finalY + 12;
  }
  function section(label) {
    if (y > 255) {
      doc.addPage();
      y = 26;
    }
    text(label, y, 12, true, '#166088');
    y += 7;
  }
  splits.forEach((split, index) => {
    const results = calculateResults(split.members, split.expenses);
    if (index) doc.addPage();
    doc.setFillColor('#4a6fa5').rect(0, 0, 210, 4, 'F');
    text(t('appTitle'), 22, 22, true, '#4a6fa5');
    text(t('pdf.title'), 33, 15, true);
    text(`${t('pdf.exported')}: ${date(now)}`, 43, 9, false, '#626c75');
    text(
      split.savedAt ? `${t('pdf.saved')}: ${date(split.savedAt)}` : t('pdf.current'),
      50,
      9,
      false,
      '#626c75',
    );
    y = 63;
    section(t('pdf.totals'));
    table(
      [t('membersCountText'), t('expensesCountText'), t('totalExpensesText')],
      [
        [
          String(split.members.length),
          String(split.expenses.length),
          `${money(results.total)} ${t('currency')}`,
        ],
      ],
      [48, 48, 82],
    );
    section(t('pdf.balances'));
    table(
      [t('pdf.member'), t('pdf.paid'), t('pdf.share'), t('pdf.balance')],
      results.balances.map((member) => [
        member.name,
        money(member.paid),
        money(member.share),
        `${member.balance > 0 ? '+' : ''}${money(member.balance)}`,
      ]),
      [64, 38, 38, 38],
    );
    section(t('pdf.settlements'));
    const names = new Map(split.members.map((member) => [member.id, member.name]));
    if (results.transactions.length)
      table(
        [t('pdf.from'), t('pdf.to'), t('pdf.amount')],
        results.transactions.map((item) => [
          names.get(item.fromId),
          names.get(item.toId),
          money(item.amount),
        ]),
        [64, 64, 50],
      );
    else {
      text(t('pdf.noTransfers'), y + 2, 10);
      y += 15;
    }
    section(t('pdf.expenses'));
    table(
      [t('pdf.description'), t('pdf.payer'), t('pdf.amount'), t('pdf.date')],
      split.expenses.map((expense) => [
        expense.description || t('unnamedExpense'),
        names.get(expense.payerId) ?? t('unknownMember'),
        money(expense.amount),
        date(expense.createdAt),
      ]),
      [70, 43, 30, 35],
    );
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor('#dbe1e8').line(16, 281, 194, 281);
    text(t('pdf.note'), 287, 8, false, '#626c75');
    text(`${t('pdf.page')} ${page} / ${pages} · Qisma`, 292, 8, false, '#626c75');
  }
  return doc;
}

export async function downloadReport(splits, options) {
  const fonts = await loadFonts();
  const doc = createPdfDocument(splits, { ...options, fonts });
  doc.save(`qisma-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
