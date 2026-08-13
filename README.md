# Nepal Sambat Package

A dependency-free TypeScript package for converting Bikram Sambat (BS) dates to
Nepal Sambat (NS), plus Nepali numeral helpers.

The converter supports BS years **2000–2110** (approximately AD 1943–2053). It
calculates the tithi at Kathmandu sunrise; close to a tithi boundary, the result
may differ by one tithi from an official printed calendar.

## Install

```bash
pnpm add nepal-sambat-package
```

## Usage

```ts
import {
  bsToNepalSambat,
  formatNepalSambat,
  englishToNepali,
  nepaliToEnglish,
} from 'nepal-sambat-package';

const date = bsToNepalSambat('2083-01-02');
// {
//   year: 1146,
//   monthName: "चौला",
//   paksha: "गा",
//   month: "चौलागा",
//   tithi: "त्रयोदशी",
//   tithiNumber: 13,
//   formatted: "NS ११४६ चौलागा त्रयोदशी (१३)"
// }

formatNepalSambat('2083-01-02');
// "NS ११४६ चौलागा त्रयोदशी (१३)"

englishToNepali('2083'); // "२०८३"
nepaliToEnglish('२०७९'); // "2079"
```

`bsToNepalSambat` and `bsDateToJD` throw an `Error` for malformed, invalid, or
out-of-range BS dates. `formatNepalSambat()` returns an empty string when called
without a date.

## Development

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

The build emits tree-shakeable ESM, CommonJS, declaration files, and source maps
to `dist/` using tsup.

## License

MIT
