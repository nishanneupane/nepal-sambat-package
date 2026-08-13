/**
 * Nepal Sambat (NS) Calendar Utility
 * ====================================
 * Converts a Bikram Sambat (BS) date (`YYYY-MM-DD`) into a Nepal Sambat date.
 *
 * VERIFIED: BS 2083-01-02 → NS 1146 चौलागा त्रयोदशी (13)
 *
 * Algorithm:
 *  1. BS → Julian Day Number (JD) via the standard BS month-length lookup table
 *  2. Compute sunrise time at Kaal Bhairab, Kathmandu (27.7051°N, 85.3142°E)
 *  3. Moon–Sun elongation at sunrise → Tithi (lunar day, 0–29)
 *  4. Previous new moon → NS month name (via sun longitude at that new moon)
 *  5. NS year = (Gregorian year of the Kartik new moon that opened this NS year) − 878
 *
 * Key rule: Whichever tithi the moon is in AT SUNRISE governs the entire day,
 * matching the official NS calendar convention (Kaal Bhairab as reference point).
 *
 * References:
 *  - Spiralogics NS Algorithm whitepaper (Saunak Ranjitkar, spiralogics.net)
 *  - Jean Meeus, "Astronomical Algorithms", 2nd ed.
 *  - Standard BS month-length data used by Hamro Patro, Nepali Patro, etc.
 *
 * Supported range: BS 2000–2110 (AD ~1943–2053)
 * Accuracy: ±1 tithi possible near tithi crossings at sunrise.
 */

import { englishToNepali } from './eng-to-nep';

// ─────────────────────────────────────────────────────────────────────────────
// 1.  BS month-length lookup table  (BS 2000–2110)
// ─────────────────────────────────────────────────────────────────────────────

/** Each entry: 12 month-lengths for Baisakh…Chaitra of that BS year. */
const BS_MONTH_LENGTHS: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2054: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2081: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2084: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2088: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2091: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2092: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2093: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2094: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2095: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2096: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2097: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2098: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2099: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2100: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2101: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2102: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2103: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2104: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2105: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2106: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2107: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2108: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2109: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2110: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

/**
 * JD of 1943-04-13 at 0h UT — the day *before* Baisakh 1, 2000 BS, because the
 * day counter below is 1-based (Baisakh 1 adds 1 → 1943-04-14, which is what
 * `@zener/nepali-date` also returns for BS 2000-01-01).
 */
const BS_EPOCH_JD = 2430827.5;
const BS_EPOCH_YEAR = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// 2.  BS → Julian Day Number
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a BS "YYYY-MM-DD" to the Julian Day Number of that Gregorian date at
 * 0h UT (JD fractions of .5 are midnight UT, i.e. 05:45 Nepal time the same day).
 */
export function bsDateToJD(bsDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) {
    throw new Error(
      `Invalid BS date "${bsDate}" (expected YYYY-MM-DD within supported BS range).`,
    );
  }

  const [bsYear, bsMonth, bsDay] = bsDate.split('-').map(Number);

  if (Number.isNaN(bsYear) || Number.isNaN(bsMonth) || Number.isNaN(bsDay)) {
    throw new Error(
      `Invalid BS date "${bsDate}" (expected YYYY-MM-DD within supported BS range).`,
    );
  }

  if (!BS_MONTH_LENGTHS[bsYear]) {
    throw new Error(
      `BS year ${bsYear} is not in the lookup table (supported: 2000–2110).`,
    );
  }

  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`BS month ${bsMonth} is invalid for date "${bsDate}".`);
  }

  const maxDay = BS_MONTH_LENGTHS[bsYear][bsMonth - 1];
  if (bsDay < 1 || bsDay > maxDay) {
    throw new Error(
      `BS day ${bsDay} is invalid for ${bsYear}-${String(bsMonth).padStart(2, '0')}.`,
    );
  }

  let days = 0;
  for (let y = BS_EPOCH_YEAR; y < bsYear; y++) {
    const ml = BS_MONTH_LENGTHS[y];
    if (!ml) throw new Error(`BS year ${y} missing from lookup table.`);
    days += ml.reduce((a, b) => a + b, 0);
  }
  const ml = BS_MONTH_LENGTHS[bsYear];
  for (let m = 0; m < bsMonth - 1; m++) days += ml[m];
  days += bsDay;

  return BS_EPOCH_JD + days;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  JD ↔ Gregorian helpers
// ─────────────────────────────────────────────────────────────────────────────

function jdToGregorianYear(jd: number): number {
  const Z = Math.floor(jd + 0.5);
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const month = E < 14 ? E - 1 : E - 13;
  return month > 2 ? C - 4716 : C - 4715;
}

function gregorianToJD(year: number, month: number, day: number): number {
  let Y = year,
    M = month;
  if (M <= 2) {
    Y--;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    day +
    B -
    1524.5
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  Sunrise at Kathmandu (Kaal Bhairab, Hanuman Dhoka)
// ─────────────────────────────────────────────────────────────────────────────

const KTM_LAT = 27.7172; // degrees N
const KTM_LON = 85.324; // degrees E

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Returns the Julian Day of sunrise at Kathmandu for the date given by `jdNoon`.
 * Based on the Meeus/Wikipedia sunrise equation (accurate to ±2 min).
 *
 * The result is an **absolute instant** (JD is UT-based), which is what the
 * elongation/longitude functions below expect. Do not add a UTC+5:45 offset to
 * "make it local" — that would move the instant 5h45m past sunrise and shift the
 * tithi on any day whose boundary falls in that window (~17% of days).
 */
export function sunriseJD(jdNoon: number): number {
  const n = Math.round(jdNoon - 2451545.0 + 0.0009);
  const Jstar = n - KTM_LON / 360;

  const M = (((357.5291 + 0.98560028 * Jstar) % 360) + 360) % 360;
  const Mrad = toRad(M);

  const C =
    1.9148 * Math.sin(Mrad) +
    0.02 * Math.sin(2 * Mrad) +
    0.0003 * Math.sin(3 * Mrad);

  const lam = (((M + C + 180 + 102.9372) % 360) + 360) % 360;
  const lamR = toRad(lam);

  const sinDec = Math.sin(lamR) * Math.sin(toRad(23.4397));
  const dec = Math.asin(sinDec);
  const latR = toRad(KTM_LAT);

  const cosH =
    (Math.sin(toRad(-0.833)) - Math.sin(latR) * sinDec) /
    (Math.cos(latR) * Math.cos(dec));

  const H = (Math.acos(Math.max(-1, Math.min(1, cosH))) * 180) / Math.PI;

  const Jtransit =
    2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lamR);

  return Jtransit - H / 360;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  Moon–Sun elongation  (Meeus Ch.47 low-precision, ~1° accuracy)
// ─────────────────────────────────────────────────────────────────────────────

function moonSunElongation(jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  // Sun
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  const Msun =
    (((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) + 360) % 360;
  const Mr = toRad(Msun);
  const Cs =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const sunLon = (((L0 + Cs) % 360) + 360) % 360;

  // Moon
  const Lm =
    (((218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360) + 360) %
    360;
  const Dm =
    (((297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) % 360) + 360) %
    360;
  const Mm =
    (((134.9633964 + 477198.8676313 * T + 0.008997 * T * T) % 360) + 360) % 360;
  const F =
    (((93.272095 + 483202.0175233 * T - 0.0036539 * T * T) % 360) + 360) % 360;

  const DmR = toRad(Dm),
    MmR = toRad(Mm),
    FR = toRad(F);
  const moonLon =
    (((Lm +
      6.2888 * Math.sin(MmR) +
      1.274 * Math.sin(2 * DmR - MmR) +
      0.6583 * Math.sin(2 * DmR) +
      0.2136 * Math.sin(2 * MmR) -
      0.1851 * Math.sin(Mr) -
      0.1143 * Math.sin(2 * FR) +
      0.0588 * Math.sin(2 * DmR - 2 * MmR) +
      0.0572 * Math.sin(2 * DmR - Mr - MmR) +
      0.0533 * Math.sin(2 * DmR + MmR) +
      0.0458 * Math.sin(2 * DmR - Mr) -
      0.0409 * Math.sin(2 * Mr - MmR) -
      0.0347 * Math.sin(Mr + MmR)) %
      360) +
      360) %
    360;

  return (((moonLon - sunLon) % 360) + 360) % 360;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  Sun longitude  (for month/year determination)
// ─────────────────────────────────────────────────────────────────────────────

function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  const M = (((357.52911 + 35999.05029 * T) % 360) + 360) % 360;
  const Mr = toRad(M);
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(Mr) +
    0.019993 * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  return (((L0 + C) % 360) + 360) % 360;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.  New moon finder
// ─────────────────────────────────────────────────────────────────────────────

/** JD of the new moon on January 6, 2000 AD (accurate reference). */
const KNOWN_NM_JD = 2451550.1;
const SYNODIC_MONTH = 29.530588853; // days

/** Most recent *mean* new moon at or before `jd`. */
function prevNewMoon(jd: number): number {
  const k = Math.floor((jd - KNOWN_NM_JD) / SYNODIC_MONTH);
  let nm = KNOWN_NM_JD + k * SYNODIC_MONTH;
  while (nm > jd) nm -= SYNODIC_MONTH;
  while (nm + SYNODIC_MONTH <= jd) nm += SYNODIC_MONTH;
  return nm;
}

/** Mean daily Moon–Sun elongation rate (deg/day) = 360 / synodic month. */
const MEAN_ELONGATION_RATE = 360 / SYNODIC_MONTH;

/**
 * Refine a rough new-moon guess to the instant of *true* conjunction, using the
 * same full-term elongation the tithi is computed from. Newton step: elongation
 * grows ~12.19°/day, so an elongation of `e` (signed, −180…180) means the exact
 * new moon is `e / rate` days away.
 */
function refineNewMoon(guess: number): number {
  let x = guess;
  for (let i = 0; i < 6; i++) {
    let e = moonSunElongation(x);
    if (e > 180) e -= 360; // signed distance from exact conjunction
    x -= e / MEAN_ELONGATION_RATE;
    if (Math.abs(e) < 1e-4) break;
  }
  return x;
}

/**
 * The *true* new moon at or before `jd` — the one that actually opened the lunar
 * month containing `jd`, consistent with the tithi.
 *
 * The mean new moon ({@link prevNewMoon}) can lag or lead the true conjunction by
 * up to ~15h. On the day right after a new moon (shukla pratipada) that lag makes
 * `prevNewMoon` skip back to the *previous* month's new moon, naming the month one
 * behind — visibly wrong when that earlier new moon sits on the far side of a
 * rashi boundary (e.g. दिल्ला shown for a गुंला day). Refining to true conjunction
 * keeps the month name aligned with the tithi.
 */
function trueNewMoon(jd: number): number {
  let nm = refineNewMoon(prevNewMoon(jd));
  while (nm > jd) nm = refineNewMoon(nm - SYNODIC_MONTH);
  while (nm + SYNODIC_MONTH <= jd) nm = refineNewMoon(nm + SYNODIC_MONTH);
  return nm;
}

/**
 * Find the Kartik new moon for a given AD year.
 * The Kartik new moon is the one that opens Kachhala — i.e. the new moon whose
 * *sidereal* sun sits in Libra. Tested through the same month-naming rule the
 * rest of the module uses, so the year boundary can never disagree with the
 * month names. Search window: around October of `adYear`.
 */
function kartikNewMoon(adYear: number): number {
  const opensKachhala = (nm: number) =>
    siderealLonToNsMonthIndex(toSidereal(sunLongitude(nm), nm)) === 0;

  // Start slightly before Oct 1, using the true conjunction so the sidereal-sign
  // test is applied to the actual new moon (not the mean one, which can fall on
  // the wrong side of the Libra boundary and mis-place the year start).
  let nm = trueNewMoon(gregorianToJD(adYear, 9, 25));
  for (let i = 0; i < 5; i++) {
    if (opensKachhala(nm)) return nm;
    nm = refineNewMoon(nm + SYNODIC_MONTH);
  }
  // Fallback: try walking backward
  nm = trueNewMoon(gregorianToJD(adYear, 9, 25));
  for (let i = 0; i < 3; i++) {
    nm = refineNewMoon(nm - SYNODIC_MONTH);
    if (opensKachhala(nm)) return nm;
  }
  return trueNewMoon(gregorianToJD(adYear, 10, 15));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  NS month names & mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nepal Sambat month names (index 0 = Kachhala).
 * The NS year begins at Kachhala (Kartik new moon, ~Oct/Nov).
 *
 * The lunar month is named after the **sidereal** solar month (राशि) the sun
 * occupies at the new moon that opened it — the amanta rule the Nepali solar
 * calendar also follows:
 *
 *   sidereal sign        Nepali solar month   NS month
 *   Mesh    (Aries)      Baisakh              6  Bachhala
 *   Vrish   (Taurus)     Jestha               7  Tachhala
 *   Mithun  (Gemini)     Ashadh               8  Dilla
 *   Karkat  (Cancer)     Shrawan              9  Gunla
 *   Simha   (Leo)        Bhadra              10  Yanla
 *   Kanya   (Virgo)      Ashwin              11  Kaula
 *   Tula    (Libra)      Kartik               0  Kachhala
 *   Vrischik(Scorpio)    Marga                1  Thinla
 *   Dhanu   (Sagittarius)Poush                2  Pohela
 *   Makar   (Capricorn)  Magh                 3  Silla
 *   Kumbha  (Aquarius)   Falgun               4  Chilla
 *   Meen    (Pisces)     Chaitra              5  Chaula
 */
export const NS_MONTH_NAMES = [
  'कछला', // 0  Kachhala
  'थिंला', // 1  Thinla
  'पोहेला', // 2  Pohela
  'सिल्ला', // 3  Silla
  'चिल्ला', // 4  Chilla
  'चौला', // 5  Chaula
  'बछला', // 6  Bachhala
  'तछला', // 7  Tachhala
  'दिल्ला', // 8  Dilla
  'गुंला', // 9  Gunla
  'याँला', // 10 Yanla
  'कौला', // 11 Kaula
];

/** Paksha (half-month) suffixes in Newari */
export const PAKSHA_THWA = 'थ्व'; // Shukla / waxing
export const PAKSHA_GA = 'गा'; // Krishna / waning

/**
 * Lahiri (Chitrapaksha) ayanamsa in degrees — the offset between the tropical
 * longitude the almanac formulas above produce and the sidereal longitude the
 * Nepali calendar is defined against. ~23.85° at J2000, drifting ~50.29″/year.
 *
 * Without this the sun reads a full sign too far for most of each sign, which
 * named roughly half of all lunar months one month ahead.
 */
export function ayanamsa(jd: number): number {
  return 23.85 + (0.0139689 * (jd - 2451545.0)) / 365.25;
}

/** Tropical → sidereal (nirayana) longitude, normalised to 0–360. */
export function toSidereal(tropicalLon: number, jd: number): number {
  return (((tropicalLon - ayanamsa(jd)) % 360) + 360) % 360;
}

/**
 * Sidereal sun longitude → NS month index. Signs are a clean 30° each; the
 * NS year starts at Kartik (Libra, sign 6), hence the +6 rotation.
 */
function siderealLonToNsMonthIndex(siderealLon: number): number {
  const sign = Math.floor((((siderealLon % 360) + 360) % 360) / 30);
  return (sign + 6) % 12;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9.  Tithi names
// ─────────────────────────────────────────────────────────────────────────────

export const TITHI_NAMES = [
  'प्रतिपदा', // 1
  'द्वितीया', // 2
  'तृतीया', // 3
  'चतुर्थी', // 4
  'पञ्चमी', // 5
  'षष्ठी', // 6
  'सप्तमी', // 7
  'अष्टमी', // 8
  'नवमी', // 9
  'दशमी', // 10
  'एकादशी', // 11
  'द्वादशी', // 12
  'त्रयोदशी', // 13
  'चतुर्दशी', // 14
  'पूर्णिमा', // 15 – Shukla paksha only
];
export const AMAVASYA = 'अमावस्या'; // Krishna tithi 15

// ─────────────────────────────────────────────────────────────────────────────
// 10.  Result type
// ─────────────────────────────────────────────────────────────────────────────

export interface NepalSambatDate {
  /** NS year, e.g. 1146 */
  year: number;
  /** Month name without paksha, e.g. "चौला" */
  monthName: string;
  /** "थ्व" (waxing/Shukla) or "गा" (waning/Krishna) */
  paksha: string;
  /** Combined month + paksha, e.g. "चौलागा" */
  month: string;
  /** Tithi name, e.g. "त्रयोदशी" */
  tithi: string;
  /** Tithi number within the paksha, 1–15 */
  tithiNumber: number;
  /** Full formatted string, e.g. "NS 1146 चौलागा त्रयोदशी (13)" */
  formatted: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11.  Main conversion function
// ─────────────────────────────────────────────────────────────────────────────

export function bsToNepalSambat(bsDate: string): NepalSambatDate {
  const jdNoon = bsDateToJD(bsDate);

  // 2. Sunrise JD at Kathmandu
  const jdSunrise = sunriseJD(jdNoon);

  // 3. Elongation at sunrise → tithi index 0–29
  const elongation = moonSunElongation(jdSunrise);
  const normalized = ((elongation % 360) + 360) % 360;
  const tithiIndex = Math.min(29, Math.floor((normalized + 1e-6) / 12));

  // 4. Paksha & tithi name
  let paksha: string, tithiNumber: number, tithi: string;
  if (tithiIndex < 15) {
    paksha = PAKSHA_THWA;
    tithiNumber = tithiIndex + 1; // 1–15
    tithi = TITHI_NAMES[tithiIndex]; // includes "पूर्णिमा" at index 14
  } else {
    paksha = PAKSHA_GA;
    tithiNumber = tithiIndex - 14; // 1–15  (index15→1 … index29→15)
    tithi = tithiNumber === 15 ? AMAVASYA : TITHI_NAMES[tithiIndex - 15];
  }

  // 5. NS month: the sidereal sign the sun occupied at the new moon that
  //    started this lunar month (amanta naming rule).
  const prevNM = trueNewMoon(jdSunrise);
  const slAtNM = toSidereal(sunLongitude(prevNM), prevNM);
  const monthIdx = siderealLonToNsMonthIndex(slAtNM);
  const monthName = NS_MONTH_NAMES[monthIdx];
  const month = monthName + paksha;

  // 6. NS year
  //    NS year n runs: Kartik-NM of AD year (n+878)  →  Kartik-NM of AD year (n+879)
  //    So: nsYear = gregorianYear(that Kartik NM) − 878
  const adYear = jdToGregorianYear(jdSunrise);
  let kNM = kartikNewMoon(adYear);
  if (kNM > jdSunrise) kNM = kartikNewMoon(adYear - 1); // date is before this year's Kartik NM
  const nsYear = jdToGregorianYear(kNM) - 879;

  const formatted = englishToNepali(
    `NS ${nsYear} ${month} ${tithi} (${tithiNumber})`,
  );

  return {
    year: nsYear,
    monthName,
    paksha,
    month,
    tithi,
    tithiNumber,
    formatted,
  };
}

export function formatNepalSambat(bsDate?: string): string {
  if (!bsDate) return '';
  return bsToNepalSambat(bsDate).formatted;
}
