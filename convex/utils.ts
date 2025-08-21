/**
 * Türkiye saati için timestamp oluştur
 * @returns Türkiye saati ile timestamp (milisaniye)
 */
export function getTurkeyTimestamp(): number {
  const now = new Date();
  // Türkiye saati için +3 saat ekle (3 * 60 * 60 * 1000 = 10800000 ms)
  return now.getTime() + (3 * 60 * 60 * 1000);
}

/**
 * Türkiye saati ile Date objesi oluştur
 * @returns Türkiye saati ile Date objesi
 */
export function getTurkeyDate(): Date {
  const now = new Date();
  // Türkiye saati için +3 saat ekle
  return new Date(now.getTime() + (3 * 60 * 60 * 1000));
}

/**
 * Türkiye saati ile ISO string oluştur
 * @returns Türkiye saati ile ISO string
 */
export function getTurkeyISOString(): string {
  return getTurkeyDate().toISOString();
}

/**
 * Bugünün Türkiye saati ile YYYY-MM-DD formatında string'ini al
 * @returns Bugünün tarihi YYYY-MM-DD formatında
 */
export function getTurkeyDateString(): string {
  const turkeyDate = getTurkeyDate();
  return turkeyDate.toISOString().split('T')[0];
}

/**
 * Yarının Türkiye saati ile YYYY-MM-DD formatında string'ini al
 * @returns Yarının tarihi YYYY-MM-DD formatında
 */
export function getTurkeyTomorrowString(): string {
  const turkeyDate = getTurkeyDate();
  const tomorrow = new Date(turkeyDate.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().split('T')[0];
}
