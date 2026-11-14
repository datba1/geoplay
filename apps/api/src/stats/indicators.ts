export type IndicatorGroup = 'people' | 'land' | 'money';

export interface IndicatorDef {
  slug: string;
  /** World Bank code. For derived indicators this is the source code. */
  code: string;
  group: IndicatorGroup;
  unit: 'people' | 'usd' | 'km2' | 'ha';
  name: { en: string; vi: string };
  /** Derived: share in % multiplied by total population. */
  percentOfPopulation?: boolean;
}

export const INDICATORS: IndicatorDef[] = [
  { slug: 'population', code: 'SP.POP.TOTL', group: 'people', unit: 'people', name: { en: 'Population', vi: 'Dân số' } },
  { slug: 'urban', code: 'SP.URB.TOTL', group: 'people', unit: 'people', name: { en: 'Urban population', vi: 'Dân số thành thị' } },
  { slug: 'rural', code: 'SP.RUR.TOTL', group: 'people', unit: 'people', name: { en: 'Rural population', vi: 'Dân số nông thôn' } },
  { slug: 'elderly', code: 'SP.POP.65UP.TO', group: 'people', unit: 'people', name: { en: 'People aged 65+', vi: 'Người từ 65 tuổi' } },
  { slug: 'internet', code: 'IT.NET.USER.ZS', group: 'people', unit: 'people', percentOfPopulation: true, name: { en: 'Internet users', vi: 'Người dùng Internet' } },
  { slug: 'gdp', code: 'NY.GDP.MKTP.CD', group: 'money', unit: 'usd', name: { en: 'GDP', vi: 'GDP' } },
  { slug: 'military', code: 'MS.MIL.XPND.CD', group: 'money', unit: 'usd', name: { en: 'Military spending', vi: 'Chi tiêu quân sự' } },
  { slug: 'agriculture', code: 'NV.AGR.TOTL.CD', group: 'money', unit: 'usd', name: { en: 'Agriculture output', vi: 'Giá trị nông nghiệp' } },
  { slug: 'forest', code: 'AG.LND.FRST.K2', group: 'land', unit: 'km2', name: { en: 'Forest area', vi: 'Diện tích rừng' } },
  { slug: 'arable', code: 'AG.LND.ARBL.HA', group: 'land', unit: 'ha', name: { en: 'Arable land', vi: 'Đất canh tác' } },
];
