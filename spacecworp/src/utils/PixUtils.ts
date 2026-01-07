export class PixUtils {
  static formatValue(input: string): string {
    let val = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const parts = val.split('.');
    let intPart = parts[0].replace(/^0+/, '');
    if (intPart === '') intPart = '0';
    let decPart = parts[1] || '';
    intPart = intPart.slice(0, 13);
    decPart = decPart.slice(0, 2);
    let formatted = intPart;
    if (val.includes('.') || decPart) {
      formatted += '.' + decPart;
    }
    if ((val.endsWith('.') || decPart.length < 2) && formatted.match(/^\d+\.$/)) {
      formatted += '00'.slice(0, 2 - decPart.length);
    }
    return formatted;
  }

  static readonly PIX_AMOUNT_REGEX = /^\d{1,13}(\.\d{1,2})?$/;
}