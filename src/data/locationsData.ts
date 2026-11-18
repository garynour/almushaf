// Curated countries and cities directory with coordinates, standard UTC offsets, and default calculation methods

export interface CityOption {
  id: string;
  nameAr: string;
  lat: number;
  lng: number;
  timezoneOffset: number; // Standard UTC offset (without DST)
  ianaTimezone?: string;
}

export interface CountryOption {
  id: string;
  nameAr: string;
  defaultMethod: string;
  ianaTimezone: string;
  cities: CityOption[];
}

export const COUNTRIES_DATA: CountryOption[] = [
  {
    id: 'eg',
    nameAr: 'مصر',
    defaultMethod: 'egypt',
    ianaTimezone: 'Africa/Cairo',
    cities: [
      { id: 'eg_marg', nameAr: 'القاهرة (المرج)', lat: 30.158, lng: 31.339, timezoneOffset: 2 },
      { id: 'eg_cairo', nameAr: 'القاهرة (وسط البلد)', lat: 30.0444, lng: 31.2357, timezoneOffset: 2 },
      { id: 'eg_giza', nameAr: 'الجيزة', lat: 30.0131, lng: 31.2089, timezoneOffset: 2 },
      { id: 'eg_alex', nameAr: 'الإسكندرية', lat: 31.2001, lng: 29.9187, timezoneOffset: 2 },
      { id: 'eg_mansoura', nameAr: 'المنصورة', lat: 31.0409, lng: 31.3785, timezoneOffset: 2 },
      { id: 'eg_tanta', nameAr: 'طنطا', lat: 30.7865, lng: 31.0004, timezoneOffset: 2 },
      { id: 'eg_zagazig', nameAr: 'الزقازيق', lat: 30.5877, lng: 31.502, timezoneOffset: 2 },
      { id: 'eg_ismailia', nameAr: 'الإسماعيلية', lat: 30.5965, lng: 32.2715, timezoneOffset: 2 },
      { id: 'eg_suez', nameAr: 'السويس', lat: 29.9668, lng: 32.5498, timezoneOffset: 2 },
      { id: 'eg_portsaid', nameAr: 'بورسعيد', lat: 31.2653, lng: 32.3019, timezoneOffset: 2 },
      { id: 'eg_asyut', nameAr: 'أسيوط', lat: 27.1809, lng: 31.1837, timezoneOffset: 2 },
      { id: 'eg_sohag', nameAr: 'سوهاج', lat: 26.559, lng: 31.6957, timezoneOffset: 2 },
      { id: 'eg_qena', nameAr: 'قنا', lat: 26.1551, lng: 32.716, timezoneOffset: 2 },
      { id: 'eg_luxor', nameAr: 'الأقصر', lat: 25.6872, lng: 32.6396, timezoneOffset: 2 },
      { id: 'eg_aswan', nameAr: 'أسوان', lat: 24.0889, lng: 32.8998, timezoneOffset: 2 },
      { id: 'eg_matrouh', nameAr: 'مرسى مطروح', lat: 31.3543, lng: 27.2373, timezoneOffset: 2 },
      { id: 'eg_sharm', nameAr: 'شرم الشيخ', lat: 27.9158, lng: 34.33, timezoneOffset: 2 },
    ],
  },
  {
    id: 'sa',
    nameAr: 'المملكة العربية السعودية',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Riyadh',
    cities: [
      { id: 'sa_makkah', nameAr: 'مكة المكرمة', lat: 21.4225, lng: 39.8262, timezoneOffset: 3 },
      { id: 'sa_madinah', nameAr: 'المدينة المنورة', lat: 24.4672, lng: 39.6112, timezoneOffset: 3 },
      { id: 'sa_riyadh', nameAr: 'الرياض', lat: 24.7136, lng: 46.6753, timezoneOffset: 3 },
      { id: 'sa_jeddah', nameAr: 'جدة', lat: 21.4858, lng: 39.1925, timezoneOffset: 3 },
      { id: 'sa_dammam', nameAr: 'الدمام', lat: 26.4207, lng: 50.0888, timezoneOffset: 3 },
      { id: 'sa_abha', nameAr: 'أبها', lat: 18.2164, lng: 42.5053, timezoneOffset: 3 },
      { id: 'sa_tabuk', nameAr: 'تبوك', lat: 28.3835, lng: 36.5662, timezoneOffset: 3 },
    ],
  },
  {
    id: 'ae',
    nameAr: 'الإمارات العربية المتحدة',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Dubai',
    cities: [
      { id: 'ae_dubai', nameAr: 'دبي', lat: 25.2048, lng: 55.2708, timezoneOffset: 4 },
      { id: 'ae_abudhabi', nameAr: 'أبوظبي', lat: 24.4539, lng: 54.3773, timezoneOffset: 4 },
      { id: 'ae_sharjah', nameAr: 'الشارقة', lat: 25.3463, lng: 55.4209, timezoneOffset: 4 },
      { id: 'ae_alain', nameAr: 'العين', lat: 24.1302, lng: 55.8023, timezoneOffset: 4 },
    ],
  },
  {
    id: 'kw',
    nameAr: 'الكويت',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Kuwait',
    cities: [
      { id: 'kw_city', nameAr: 'مدينة الكويت', lat: 29.3759, lng: 47.9774, timezoneOffset: 3 },
      { id: 'kw_hawalli', nameAr: 'حولي', lat: 29.3328, lng: 48.0286, timezoneOffset: 3 },
    ],
  },
  {
    id: 'qa',
    nameAr: 'قطر',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Qatar',
    cities: [
      { id: 'qa_doha', nameAr: 'الدوحة', lat: 25.2854, lng: 51.531, timezoneOffset: 3 },
    ],
  },
  {
    id: 'bh',
    nameAr: 'البحرين',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Bahrain',
    cities: [
      { id: 'bh_manama', nameAr: 'المنامة', lat: 26.2285, lng: 50.586, timezoneOffset: 3 },
    ],
  },
  {
    id: 'om',
    nameAr: 'عُمان',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Muscat',
    cities: [
      { id: 'om_muscat', nameAr: 'مسقط', lat: 23.588, lng: 58.3829, timezoneOffset: 4 },
      { id: 'om_salalah', nameAr: 'صلالة', lat: 17.0151, lng: 54.0924, timezoneOffset: 4 },
    ],
  },
  {
    id: 'jo',
    nameAr: 'الأردن',
    defaultMethod: 'mwl',
    ianaTimezone: 'Asia/Amman',
    cities: [
      { id: 'jo_amman', nameAr: 'عمّان', lat: 31.9454, lng: 35.9284, timezoneOffset: 3 },
      { id: 'jo_irbid', nameAr: 'إربد', lat: 32.5568, lng: 35.8469, timezoneOffset: 3 },
      { id: 'jo_aqaba', nameAr: 'العقبة', lat: 29.5321, lng: 35.0063, timezoneOffset: 3 },
    ],
  },
  {
    id: 'ps',
    nameAr: 'فلسطين',
    defaultMethod: 'mwl',
    ianaTimezone: 'Asia/Gaza',
    cities: [
      { id: 'ps_quds', nameAr: 'القدس الشريف', lat: 31.7683, lng: 35.2137, timezoneOffset: 2 },
      { id: 'ps_gaza', nameAr: 'غزة', lat: 31.5017, lng: 34.4668, timezoneOffset: 2 },
      { id: 'ps_ramallah', nameAr: 'رام الله', lat: 31.9038, lng: 35.2034, timezoneOffset: 2 },
    ],
  },
  {
    id: 'lb',
    nameAr: 'لبنان',
    defaultMethod: 'egypt',
    ianaTimezone: 'Asia/Beirut',
    cities: [
      { id: 'lb_beirut', nameAr: 'بيروت', lat: 33.8938, lng: 35.5018, timezoneOffset: 2 },
      { id: 'lb_tripoli', nameAr: 'طرابلس', lat: 34.4367, lng: 35.8497, timezoneOffset: 2 },
    ],
  },
  {
    id: 'sy',
    nameAr: 'سوريا',
    defaultMethod: 'egypt',
    ianaTimezone: 'Asia/Damascus',
    cities: [
      { id: 'sy_damascus', nameAr: 'دمشق', lat: 33.5138, lng: 36.2765, timezoneOffset: 3 },
      { id: 'sy_aleppo', nameAr: 'حلب', lat: 36.2021, lng: 37.1343, timezoneOffset: 3 },
    ],
  },
  {
    id: 'iq',
    nameAr: 'العراق',
    defaultMethod: 'egypt',
    ianaTimezone: 'Asia/Baghdad',
    cities: [
      { id: 'iq_baghdad', nameAr: 'بغداد', lat: 33.3152, lng: 44.3661, timezoneOffset: 3 },
      { id: 'iq_basra', nameAr: 'البصرة', lat: 30.5081, lng: 47.7835, timezoneOffset: 3 },
      { id: 'iq_erbil', nameAr: 'أربيل', lat: 36.1911, lng: 44.0092, timezoneOffset: 3 },
    ],
  },
  {
    id: 'ma',
    nameAr: 'المغرب',
    defaultMethod: 'mwl',
    ianaTimezone: 'Africa/Casablanca',
    cities: [
      { id: 'ma_rabat', nameAr: 'الرباط', lat: 34.0209, lng: -6.8416, timezoneOffset: 1 },
      { id: 'ma_casablanca', nameAr: 'الدار البيضاء', lat: 33.5731, lng: -7.5898, timezoneOffset: 1 },
      { id: 'ma_marrakesh', nameAr: 'مراكش', lat: 31.6295, lng: -7.9811, timezoneOffset: 1 },
      { id: 'ma_tangier', nameAr: 'طنجة', lat: 35.7595, lng: -5.834, timezoneOffset: 1 },
    ],
  },
  {
    id: 'dz',
    nameAr: 'الجزائر',
    defaultMethod: 'mwl',
    ianaTimezone: 'Africa/Algiers',
    cities: [
      { id: 'dz_algiers', nameAr: 'الجزائر العاصمة', lat: 36.7538, lng: 3.0588, timezoneOffset: 1 },
      { id: 'dz_oran', nameAr: 'وهران', lat: 35.6971, lng: -0.6308, timezoneOffset: 1 },
      { id: 'dz_constantine', nameAr: 'قسنطينة', lat: 36.365, lng: 6.6147, timezoneOffset: 1 },
    ],
  },
  {
    id: 'tn',
    nameAr: 'تونس',
    defaultMethod: 'mwl',
    ianaTimezone: 'Africa/Tunis',
    cities: [
      { id: 'tn_tunis', nameAr: 'تونس العاصمة', lat: 36.8065, lng: 10.1815, timezoneOffset: 1 },
      { id: 'tn_sfax', nameAr: 'صفاقس', lat: 34.7406, lng: 10.7603, timezoneOffset: 1 },
    ],
  },
  {
    id: 'ly',
    nameAr: 'ليبيا',
    defaultMethod: 'egypt',
    ianaTimezone: 'Africa/Tripoli',
    cities: [
      { id: 'ly_tripoli', nameAr: 'طرابلس', lat: 32.8872, lng: 13.1913, timezoneOffset: 2 },
      { id: 'ly_benghazi', nameAr: 'بنغازي', lat: 32.1194, lng: 20.0868, timezoneOffset: 2 },
    ],
  },
  {
    id: 'sd',
    nameAr: 'السودان',
    defaultMethod: 'egypt',
    ianaTimezone: 'Africa/Khartoum',
    cities: [
      { id: 'sd_khartoum', nameAr: 'الخرطوم', lat: 15.5007, lng: 32.5599, timezoneOffset: 2 },
    ],
  },
  {
    id: 'ye',
    nameAr: 'اليمن',
    defaultMethod: 'makkah',
    ianaTimezone: 'Asia/Aden',
    cities: [
      { id: 'ye_sanaa', nameAr: 'صنعاء', lat: 15.3694, lng: 44.191, timezoneOffset: 3 },
      { id: 'ye_aden', nameAr: 'عدن', lat: 12.7855, lng: 45.0187, timezoneOffset: 3 },
    ],
  },
  {
    id: 'tr',
    nameAr: 'تركيا',
    defaultMethod: 'mwl',
    ianaTimezone: 'Europe/Istanbul',
    cities: [
      { id: 'tr_istanbul', nameAr: 'إسطنبول', lat: 41.0082, lng: 28.9784, timezoneOffset: 3 },
      { id: 'tr_ankara', nameAr: 'أنقرة', lat: 39.9334, lng: 32.8597, timezoneOffset: 3 },
    ],
  },
  {
    id: 'my',
    nameAr: 'ماليزيا',
    defaultMethod: 'mwl',
    ianaTimezone: 'Asia/Kuala_Lumpur',
    cities: [
      { id: 'my_kl', nameAr: 'كوالالمبور', lat: 3.139, lng: 101.6869, timezoneOffset: 8 },
    ],
  },
  {
    id: 'id',
    nameAr: 'إندونيسيا',
    defaultMethod: 'mwl',
    ianaTimezone: 'Asia/Jakarta',
    cities: [
      { id: 'id_jakarta', nameAr: 'جاكرتا', lat: -6.2088, lng: 106.8456, timezoneOffset: 7 },
    ],
  },
  {
    id: 'uk',
    nameAr: 'المملكة المتحدة',
    defaultMethod: 'mwl',
    ianaTimezone: 'Europe/London',
    cities: [
      { id: 'uk_london', nameAr: 'لندن', lat: 51.5072, lng: -0.1276, timezoneOffset: 0 },
      { id: 'uk_birmingham', nameAr: 'برمنغهام', lat: 52.4862, lng: -1.8904, timezoneOffset: 0 },
    ],
  },
  {
    id: 'fr',
    nameAr: 'فرنسا',
    defaultMethod: 'mwl',
    ianaTimezone: 'Europe/Paris',
    cities: [
      { id: 'fr_paris', nameAr: 'باريس', lat: 48.8566, lng: 2.3522, timezoneOffset: 1 },
    ],
  },
  {
    id: 'de',
    nameAr: 'ألمانيا',
    defaultMethod: 'mwl',
    ianaTimezone: 'Europe/Berlin',
    cities: [
      { id: 'de_berlin', nameAr: 'برلين', lat: 52.52, lng: 13.405, timezoneOffset: 1 },
    ],
  },
  {
    id: 'us',
    nameAr: 'الولايات المتحدة',
    defaultMethod: 'isna',
    ianaTimezone: 'America/New_York',
    cities: [
      { id: 'us_ny', nameAr: 'نيويورك', lat: 40.7128, lng: -74.006, timezoneOffset: -5, ianaTimezone: 'America/New_York' },
      { id: 'us_chicago', nameAr: 'شيكاغو', lat: 41.8781, lng: -87.6298, timezoneOffset: -6, ianaTimezone: 'America/Chicago' },
      { id: 'us_la', nameAr: 'لوس أنجلوس', lat: 34.0522, lng: -118.2437, timezoneOffset: -8, ianaTimezone: 'America/Los_Angeles' },
    ],
  },
  {
    id: 'ca',
    nameAr: 'كندا',
    defaultMethod: 'isna',
    ianaTimezone: 'America/Toronto',
    cities: [
      { id: 'ca_toronto', nameAr: 'تورونتو', lat: 43.6532, lng: -79.3832, timezoneOffset: -5, ianaTimezone: 'America/Toronto' },
      { id: 'ca_montreal', nameAr: 'مونتريال', lat: 45.5017, lng: -73.5673, timezoneOffset: -5, ianaTimezone: 'America/Toronto' },
    ],
  },
];

export const TIMEZONE_OPTIONS: { value: number; labelAr: string }[] = [
  { value: -8, labelAr: 'UTC-8 (توقيت المحيط الهادئ)' },
  { value: -6, labelAr: 'UTC-6 (التوقيت المركزي الأمريكي)' },
  { value: -5, labelAr: 'UTC-5 (التوقيت الشرقي الأمريكي)' },
  { value: 0, labelAr: 'UTC+0 (غرينتش / لندن)' },
  { value: 1, labelAr: 'UTC+1 (المغرب / الجزائر / تونس / أوروبا)' },
  { value: 2, labelAr: 'UTC+2 (مصر / فلسطين / ليبيا / السودان)' },
  { value: 3, labelAr: 'UTC+3 (السعودية / الكويت / قطر / العراق / الأردن)' },
  { value: 3.5, labelAr: 'UTC+3:30' },
  { value: 4, labelAr: 'UTC+4 (الإمارات / عُمان)' },
  { value: 5, labelAr: 'UTC+5 (باكستان)' },
  { value: 6, labelAr: 'UTC+6 (بنغلاديش)' },
  { value: 7, labelAr: 'UTC+7 (إندونيسيا)' },
  { value: 8, labelAr: 'UTC+8 (ماليزيا)' },
];
