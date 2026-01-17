// Test PDF bez API
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';

function sanitizeForPDF(text) {
  const polishMap = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
    'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
    '─': '-', '│': '|', '┌': '+', '┐': '+', '└': '+', '┘': '+',
    '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
    '═': '=', '•': '*', '–': '-', '—': '-',
  };
  
  let result = '';
  for (const char of text) {
    if (polishMap[char]) result += polishMap[char];
    else if (char.charCodeAt(0) < 128) result += char;
    else result += ' ';
  }
  return result;
}

async function test() {
  console.log('Tworzę testowy PDF...');
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  let y = 800;
  
  // Testowe dane z polskimi znakami
  const testContent = `MEMORANDUM INFORMACYJNE
  
RENDER CUBE SPÓŁKA AKCYJNA

I. WSTĘP

Niniejsze memorandum informacyjne zostało sporządzone zgodnie z art. 37a ustawy o ofercie publicznej.

Dane Emitenta:
- Nazwa: RENDER CUBE SPÓŁKA AKCYJNA  
- KRS: 0000860872
- NIP: 7282824878
- Siedziba: ul. Piotrkowska 295/7, Łódź

II. CZYNNIKI RYZYKA

1. Ryzyko związane ze zmianami gospodarczymi
2. Ryzyko finansowe związane z działalnością
3. Ryzyko płynności instrumentów

III. OSOBY ODPOWIEDZIALNE

Za informacje zawarte w memorandum odpowiada Zarząd Spółki.

┌─────────────┬────────────┐
│ Pozycja     │ Wartość    │
├─────────────┼────────────┤
│ Przychody   │ 12,119,801 │
│ Zysk        │  4,830,854 │
└─────────────┴────────────┘

Dokument wygenerowany automatycznie.`;

  const safeContent = sanitizeForPDF(testContent);
  const lines = safeContent.split('\n');
  
  for (const line of lines) {
    if (y < 50) break;
    
    const isHeader = /^[IVX]+\.\s/.test(line.trim()) || line.includes('MEMORANDUM');
    const useFont = isHeader ? fontBold : font;
    const size = isHeader ? 14 : 10;
    
    page.drawText(line, {
      x: 50, y, size, font: useFont, color: rgb(0, 0, 0),
    });
    y -= 16;
  }
  
  const pdfBytes = await pdfDoc.save();
  writeFileSync('test-memorandum.pdf', pdfBytes);
  console.log('✅ PDF zapisany jako test-memorandum.pdf');
}

test().catch(console.error);
