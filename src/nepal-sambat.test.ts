import { describe, expect, it } from 'vitest';

import { bsDateToJD, bsToNepalSambat, formatNepalSambat } from './nepal-sambat';

describe('Nepal Sambat conversion', () => {
  it('converts the documented reference date', () => {
    expect(bsToNepalSambat('2083-01-02')).toMatchObject({
      year: 1146,
      monthName: 'चौला',
      paksha: 'गा',
      month: 'चौलागा',
      tithi: 'त्रयोदशी',
      tithiNumber: 13,
      formatted: 'ने.सं. ११४६ चौलागा त्रयोदशी',
    });
  });

  it('uses the correct BS epoch', () => {
    expect(bsDateToJD('2000-01-01')).toBe(2430828.5);
  });

  it('rejects invalid and unsupported dates', () => {
    expect(() => bsToNepalSambat('2083-13-01')).toThrow('BS month 13');
    expect(() => bsToNepalSambat('1900-01-01')).toThrow(
      'not in the lookup table',
    );
  });

  it('formats an omitted date as an empty string', () => {
    expect(formatNepalSambat()).toBe('');
  });
});
