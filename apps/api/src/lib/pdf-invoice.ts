import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generic tax-invoice generator covering the four paid product surfaces of
 * Darshya: puja bookings (PB), astrology consultations (AC), wellness
 * sessions (WS), and store orders (SO). 80G donation receipts stay on
 * pdf-receipt.ts because their compliance contract is different.
 */

export type InvoiceInput =
  | {
      type: 'puja_booking';
      bookingNumber: string;
      devoteeName: string;
      pujaName: string;
      templeName: string;
      templeCity: string;
      amountInr: number;
      createdAt: string;
    }
  | {
      type: 'astrology_consultation';
      consultationId: string;
      devoteeName: string;
      astrologerName: string;
      durationMinutes: number;
      amountInr: number;
      createdAt: string;
    }
  | {
      type: 'wellness_session';
      sessionId: string;
      devoteeName: string;
      instructorName: string;
      sessionTitle: string;
      amountInr: number;
      createdAt: string;
    }
  | {
      type: 'store_order';
      orderNumber: string;
      customerName: string;
      items: Array<{ name: string; qty: number; priceInr: number }>;
      shippingAddress: string;
      totalInr: number;
      createdAt: string;
    };

const SAFFRON = rgb(0.918, 0.345, 0.047);
const TEXT = rgb(0.24, 0.18, 0.12);
const MUTED = rgb(0.45, 0.4, 0.35);
const RULE = rgb(0.85, 0.8, 0.7);

const TYPE_PREFIX: Record<InvoiceInput['type'], string> = {
  puja_booking: 'PB',
  astrology_consultation: 'AC',
  wellness_session: 'WS',
  store_order: 'SO',
};

function shortIdFor(input: InvoiceInput): string {
  switch (input.type) {
    case 'puja_booking':
      return input.bookingNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase();
    case 'astrology_consultation':
      return input.consultationId.replace(/-/g, '').slice(0, 8).toUpperCase();
    case 'wellness_session':
      return input.sessionId.replace(/-/g, '').slice(0, 8).toUpperCase();
    case 'store_order':
      return input.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase();
  }
}

function formatInr(n: number): string {
  return `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface LineItem {
  description: string;
  qty: number;
  unitInr: number;
  totalInr: number;
}

function lineItemsFor(input: InvoiceInput): LineItem[] {
  switch (input.type) {
    case 'puja_booking':
      return [
        {
          description: `${input.pujaName} at ${input.templeName}, ${input.templeCity}`,
          qty: 1,
          unitInr: input.amountInr,
          totalInr: input.amountInr,
        },
      ];
    case 'astrology_consultation':
      return [
        {
          description: `Astrology consultation with ${input.astrologerName} (${input.durationMinutes} min)`,
          qty: 1,
          unitInr: input.amountInr,
          totalInr: input.amountInr,
        },
      ];
    case 'wellness_session':
      return [
        {
          description: `${input.sessionTitle} — instructor ${input.instructorName}`,
          qty: 1,
          unitInr: input.amountInr,
          totalInr: input.amountInr,
        },
      ];
    case 'store_order':
      return input.items.map((it) => ({
        description: it.name,
        qty: it.qty,
        unitInr: it.priceInr,
        totalInr: it.priceInr * it.qty,
      }));
  }
}

function totalFor(input: InvoiceInput): number {
  return input.type === 'store_order' ? input.totalInr : input.amountInr;
}

function recipientFor(input: InvoiceInput): { name: string; address?: string } {
  switch (input.type) {
    case 'puja_booking':
      return { name: input.devoteeName };
    case 'astrology_consultation':
      return { name: input.devoteeName };
    case 'wellness_session':
      return { name: input.devoteeName };
    case 'store_order':
      return { name: input.customerName, address: input.shippingAddress };
  }
}

function referenceFor(input: InvoiceInput): string {
  switch (input.type) {
    case 'puja_booking':
      return `Booking #${input.bookingNumber}`;
    case 'astrology_consultation':
      return `Consultation #${input.consultationId}`;
    case 'wellness_session':
      return `Session #${input.sessionId}`;
    case 'store_order':
      return `Order #${input.orderNumber}`;
  }
}

export async function generateInvoice(input: InvoiceInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 50;
  const right = 545;
  let y = 800;

  const invoiceNumber = `INV-${TYPE_PREFIX[input.type]}-${shortIdFor(input)}`;

  // Brand bar
  page.drawRectangle({ x: 0, y: 822, width: 595, height: 20, color: SAFFRON });

  // Header
  page.drawText('Darshya', { x: left, y, size: 22, font: fontBold, color: SAFFRON });
  page.drawText("India's Devotional Super App", {
    x: left, y: y - 16, size: 9, font, color: MUTED,
  });
  page.drawText('https://darshya.online', {
    x: left, y: y - 28, size: 9, font, color: MUTED,
  });

  y -= 60;
  page.drawText('DARSHYA TAX INVOICE', { x: left, y, size: 14, font: fontBold, color: TEXT });

  // Invoice meta
  y -= 32;
  page.drawText(`Invoice No.:  ${invoiceNumber}`, { x: left, y, size: 10, font, color: TEXT });
  page.drawText(`Date:  ${input.createdAt}`, { x: 380, y, size: 10, font, color: TEXT });
  y -= 14;
  page.drawText(referenceFor(input), { x: left, y, size: 10, font, color: MUTED });

  // Divider
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: RULE });

  // Recipient
  const recipient = recipientFor(input);
  y -= 22;
  page.drawText('Bill to', { x: left, y, size: 9, font, color: MUTED });
  y -= 14;
  page.drawText(recipient.name, { x: left, y, size: 12, font: fontBold, color: TEXT });
  if (recipient.address) {
    const lines = wrap(recipient.address, 78);
    for (const line of lines) {
      y -= 12;
      page.drawText(line, { x: left, y, size: 10, font, color: TEXT });
    }
  }

  // Line items table
  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: RULE });
  y -= 16;
  page.drawText('Description', { x: left, y, size: 9, font: fontBold, color: MUTED });
  page.drawText('Qty', { x: 360, y, size: 9, font: fontBold, color: MUTED });
  page.drawText('Unit (INR)', { x: 405, y, size: 9, font: fontBold, color: MUTED });
  page.drawText('Total (INR)', { x: 478, y, size: 9, font: fontBold, color: MUTED });
  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.3, color: RULE });

  const items = lineItemsFor(input);
  for (const item of items) {
    y -= 16;
    const descLines = wrap(item.description, 56);
    page.drawText(descLines[0] ?? '', { x: left, y, size: 10, font, color: TEXT });
    page.drawText(String(item.qty), { x: 360, y, size: 10, font, color: TEXT });
    page.drawText(item.unitInr.toLocaleString('en-IN'), { x: 405, y, size: 10, font, color: TEXT });
    page.drawText(item.totalInr.toLocaleString('en-IN'), { x: 478, y, size: 10, font, color: TEXT });
    for (let i = 1; i < descLines.length; i++) {
      y -= 12;
      page.drawText(descLines[i] ?? '', { x: left, y, size: 9, font, color: MUTED });
    }
  }

  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.3, color: RULE });

  // Total
  y -= 22;
  page.drawText('Total', { x: 380, y, size: 12, font: fontBold, color: TEXT });
  page.drawText(formatInr(totalFor(input)), {
    x: 460, y, size: 12, font: fontBold, color: SAFFRON,
  });

  // Tax / GST disclaimer
  y -= 30;
  page.drawText('Amount inclusive of all applicable taxes where chargeable.', {
    x: left, y, size: 9, font, color: MUTED,
  });
  y -= 12;
  page.drawText('Retain this invoice for your records.', {
    x: left, y, size: 9, font, color: MUTED,
  });

  // Footer
  page.drawText('Computer-generated invoice — valid without signature when issued via Darshya.', {
    x: left, y: 40, size: 8, font, color: MUTED,
  });
  page.drawText('Generated at https://darshya.online   ·   support@darshya.online', {
    x: left, y: 28, size: 8, font, color: MUTED,
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
