export const englishToNepali = (text?: string | number | null): string => {
  if (text === null || text === undefined) return '';

  const str = text.toString();

  const map: { [key: string]: string } = {
    '0': '०',
    '1': '१',
    '2': '२',
    '3': '३',
    '4': '४',
    '5': '५',
    '6': '६',
    '7': '७',
    '8': '८',
    '9': '९',
  };

  return str.replace(/[0-9]/g, (d) => map[d]);
};

export const nepaliToEnglish = (text?: string | number): string => {
  if (text === undefined || text === null) return '';

  const map: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };

  const str = String(text);

  return str.replace(/[०-९]/g, (d) => map[d]);
};

type OrdinalEnglish =
  | 'first'
  | 'second'
  | 'third'
  | 'fourth'
  | 'fifth'
  | 'sixth'
  | 'seventh'
  | 'eighth'
  | 'ninth'
  | 'tenth'
  | 'eleventh'
  | 'twelfth'
  | 'thirteenth'
  | 'fourteenth'
  | 'fifteenth'
  | 'sixteenth'
  | 'seventeenth'
  | 'eighteenth'
  | 'nineteenth'
  | 'twentieth';

const ordinalMap: Record<OrdinalEnglish, string> = {
  first: 'पहिलो',
  second: 'दोश्रो',
  third: 'तेश्रो',
  fourth: 'चौथो',
  fifth: 'पाँचौं',
  sixth: 'छैठौं',
  seventh: 'सातौं',
  eighth: 'आठौं',
  ninth: 'नौं',
  tenth: 'दशौं',
  eleventh: 'एघारौं',
  twelfth: 'बाह्रौं',
  thirteenth: 'तेह्रौं',
  fourteenth: 'चौधौं',
  fifteenth: 'पन्ध्रौं',
  sixteenth: 'सोह्रौं',
  seventeenth: 'सत्रौं',
  eighteenth: 'अठारौं',
  nineteenth: 'उन्नाइसौं',
  twentieth: 'बीसौं',
};

export function ordinalEnglishToNepali(ordinal: string): string {
  const key = ordinal.toLowerCase() as OrdinalEnglish;
  return ordinalMap[key] ?? ordinal;
}

export function formatIndianNumber(input?: string | number): string {
  if (input === undefined || input === null) return '';
  let str = String(input).trim();
  const negative = str.startsWith('-');
  if (negative) str = str.slice(1);
  // keep decimal if present
  const parts = str.split('.');
  let intPart = parts[0].replace(/\D/g, '');
  const decPart = parts[1] ?? '';

  if (intPart === '') intPart = '0';

  if (intPart.length <= 3) {
    return (
      (negative ? '-' : '') + (decPart ? `${intPart}.${decPart}` : intPart)
    );
  }

  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);

  // group rest from right in 2s
  const rev = rest.split('').reverse().join('');
  const chunks = rev.match(/.{1,2}/g) || [];
  const groupedRest = chunks
    .map((c) => c.split('').reverse().join(''))
    .reverse()
    .join(',');

  const formatted = groupedRest ? `${groupedRest},${last3}` : last3;
  return (
    (negative ? '-' : '') + (decPart ? `${formatted}.${decPart}` : formatted)
  );
}
