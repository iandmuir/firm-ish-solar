/**
 * ISO3 codes for the 193 UN member states + 2 permanent observers
 * (VAT = Holy See, PSE = State of Palestine).
 * Used to filter the raw city dataset to sovereign states recognized by the UN.
 */
export const UN_MEMBERS_AND_OBSERVERS = new Set([
  // A
  'AFG', 'ALB', 'DZA', 'AND', 'AGO', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT', 'AZE',
  // B
  'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BTN', 'BOL', 'BIH',
  'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI',
  // C
  'CPV', 'KHM', 'CMR', 'CAN', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG',
  'COD', 'CRI', 'CIV', 'HRV', 'CUB', 'CYP', 'CZE',
  // D
  'PRK', 'COD', 'DNK', 'DJI', 'DMA', 'DOM',
  // E
  'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'SWZ', 'ETH',
  // F
  'FJI', 'FIN', 'FRA',
  // G
  'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM', 'GIN', 'GNB', 'GUY',
  // H
  'HTI', 'HND', 'HUN',
  // I
  'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'ISR', 'ITA',
  // J
  'JAM', 'JPN', 'JOR',
  // K
  'KAZ', 'KEN', 'KIR', 'KWT', 'KGZ',
  // L
  'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU', 'LUX',
  // M
  'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MRT', 'MUS', 'MEX', 'FSM',
  'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR',
  // N
  'NAM', 'NRU', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'MKD', 'NOR',
  // O
  'OMN',
  // P
  'PAK', 'PLW', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT',
  // Q
  'QAT',
  // R
  'KOR', 'ROU', 'RUS', 'RWA',
  // S
  'KNA', 'LCA', 'VCT', 'WSM', 'SMR', 'STP', 'SAU', 'SEN', 'SRB', 'SYC', 'SLE',
  'SGP', 'SVK', 'SVN', 'SLB', 'SOM', 'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR',
  'SWE', 'CHE', 'SYR',
  // T
  'TJK', 'TZA', 'THA', 'TLS', 'TGO', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TUV',
  // U
  'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB',
  // V
  'VUT', 'VEN', 'VNM',
  // Y
  'YEM',
  // Z
  'ZMB', 'ZWE',
  // Observers
  'VAT', 'PSE',
])

/**
 * Territories, dependencies, and SARs whose PVGIS data we've already fetched.
 * Each maps to its de facto administering UN member ("parent") and a display
 * suffix shown after the city name in the picker, e.g. "Les Abymes (Guadeloupe)".
 *
 * Taiwan (TWN) is intentionally not listed: treating it as part of any other
 * country is politically contentious, and our rule of record is UN members
 * plus the two permanent observers.
 */
export const TERRITORY_PARENTS = {
  ABW: { parent: 'NLD', label: 'Aruba' },
  AIA: { parent: 'GBR', label: 'Anguilla' },
  ALA: { parent: 'FIN', label: 'Åland Islands' },
  ASM: { parent: 'USA', label: 'American Samoa' },
  ATF: { parent: 'FRA', label: 'French Southern Territories' },
  BES: { parent: 'NLD', label: 'Caribbean Netherlands' },
  BLM: { parent: 'FRA', label: 'Saint Barthélemy' },
  BMU: { parent: 'GBR', label: 'Bermuda' },
  CCK: { parent: 'AUS', label: 'Cocos Islands' },
  COK: { parent: 'NZL', label: 'Cook Islands' },
  CUW: { parent: 'NLD', label: 'Curaçao' },
  CXR: { parent: 'AUS', label: 'Christmas Island' },
  CYM: { parent: 'GBR', label: 'Cayman Islands' },
  ESH: { parent: 'MAR', label: 'Western Sahara' },
  FLK: { parent: 'GBR', label: 'Falkland Islands' },
  FRO: { parent: 'DNK', label: 'Faroe Islands' },
  GGY: { parent: 'GBR', label: 'Guernsey' },
  GIB: { parent: 'GBR', label: 'Gibraltar' },
  GLP: { parent: 'FRA', label: 'Guadeloupe' },
  GRL: { parent: 'DNK', label: 'Greenland' },
  GUF: { parent: 'FRA', label: 'French Guiana' },
  GUM: { parent: 'USA', label: 'Guam' },
  HKG: { parent: 'CHN', label: 'Hong Kong' },
  IMN: { parent: 'GBR', label: 'Isle of Man' },
  JEY: { parent: 'GBR', label: 'Jersey' },
  MAC: { parent: 'CHN', label: 'Macao' },
  MAF: { parent: 'FRA', label: 'Saint Martin' },
  MNP: { parent: 'USA', label: 'Northern Mariana Islands' },
  MSR: { parent: 'GBR', label: 'Montserrat' },
  MTQ: { parent: 'FRA', label: 'Martinique' },
  MYT: { parent: 'FRA', label: 'Mayotte' },
  NCL: { parent: 'FRA', label: 'New Caledonia' },
  NIU: { parent: 'NZL', label: 'Niue' },
  PCN: { parent: 'GBR', label: 'Pitcairn Islands' },
  PRI: { parent: 'USA', label: 'Puerto Rico' },
  PYF: { parent: 'FRA', label: 'French Polynesia' },
  REU: { parent: 'FRA', label: 'Réunion' },
  SGS: { parent: 'GBR', label: 'South Georgia' },
  SHN: { parent: 'GBR', label: 'Saint Helena' },
  SPM: { parent: 'FRA', label: 'Saint Pierre & Miquelon' },
  SXM: { parent: 'NLD', label: 'Sint Maarten' },
  TCA: { parent: 'GBR', label: 'Turks & Caicos Islands' },
  VGB: { parent: 'GBR', label: 'British Virgin Islands' },
  VIR: { parent: 'USA', label: 'U.S. Virgin Islands' },
  WLF: { parent: 'FRA', label: 'Wallis & Futuna' },
}
