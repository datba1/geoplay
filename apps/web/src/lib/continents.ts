/**
 * The 195 countries of the passport (193 UN members + Vatican City + Palestine),
 * grouped by continent. Territories collected in games appear under "other".
 */
export type ContinentId = 'asia' | 'europe' | 'africa' | 'north-america' | 'south-america' | 'oceania';

export const CONTINENTS: { id: ContinentId; name: { en: string; vi: string }; codes: string[] }[] = [
  {
    id: 'asia',
    name: { en: 'Asia', vi: 'Châu Á' },
    codes: ('AF AM AZ BH BD BT BN KH CN CY GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS ' +
      'PH QA SA SG KR LK SY TJ TH TL TR TM AE UZ VN YE').split(' '),
  },
  {
    id: 'europe',
    name: { en: 'Europe', vi: 'Châu Âu' },
    codes: ('AL AD AT BY BE BA BG HR CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT MD MC ME NL MK NO PL PT RO ' +
      'RU SM RS SK SI ES SE CH UA GB VA').split(' '),
  },
  {
    id: 'africa',
    name: { en: 'Africa', vi: 'Châu Phi' },
    codes: ('DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR ' +
      'MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW').split(' '),
  },
  {
    id: 'north-america',
    name: { en: 'North America', vi: 'Bắc Mỹ' },
    codes: 'AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US'.split(' '),
  },
  {
    id: 'south-america',
    name: { en: 'South America', vi: 'Nam Mỹ' },
    codes: 'AR BO BR CL CO EC GY PY PE SR UY VE'.split(' '),
  },
  {
    id: 'oceania',
    name: { en: 'Oceania', vi: 'Châu Đại Dương' },
    codes: 'AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU'.split(' '),
  },
];

export const PASSPORT_COUNTRIES = new Set(CONTINENTS.flatMap((c) => c.codes));
export const TOTAL_COUNTRIES = PASSPORT_COUNTRIES.size; // 195
