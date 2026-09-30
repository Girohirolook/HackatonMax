import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SUGGEST_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';
const CLEAN_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/clean/address';

export interface AddressVariant {
  value: string;
  city: string | null;
  
}

@Injectable()
export class DadataService {
  private readonly logger = new Logger(DadataService.name);

  constructor(private readonly config: ConfigService) {}

  private headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.getOrThrow<string>('DADATA_API_KEY')}`,
    };
  }

  /**
   * Подсказки. При ЛЮБОМ сбое DaData (лимит, сеть, 4xx/5xx)
   * возвращаем пустой список + флаг degraded — без исключений.
   */
  async suggest(
    query: string,
  ): Promise<{ suggestions: AddressVariant[]; degraded: boolean }> {
    const q = (query ?? '').trim();
    if (q.length < 2) return { suggestions: [], degraded: false };

    try {
      const res = await fetch(SUGGEST_URL, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ query: q, count: 6 }),
      });
      if (!res.ok) {
        this.logger.warn(`DaData suggest upstream error: ${res.status}`);
        return { suggestions: [], degraded: true };
      }
      const json = await res.json();
      return {
        suggestions: (json.suggestions ?? []).map((s: any) =>
          this.mapVariant(s.value, s.data),
        ),
        degraded: false,
      };
    } catch (e) {
      this.logger.warn(`DaData suggest network error: ${String(e)}`);
      return { suggestions: [], degraded: true };
    }
  }

  /**
   * Валидация свободного текста. При сбое — address: null + degraded,
   * без исключений.
   */
  async clean(
    address: string,
  ): Promise<{ address: AddressVariant | null; degraded: boolean }> {
    const src = (address ?? '').trim();
    if (!src) return { address: null, degraded: false };

    try {
      const res = await fetch(CLEAN_URL, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ source: src }),
      });
      if (!res.ok) {
        this.logger.warn(`DaData clean upstream error: ${res.status}`);
        return { address: null, degraded: true };
      }
      const json = await res.json();
      const first = Array.isArray(json) ? json[0] : null;
      if (!first || !first.result) return { address: null, degraded: false };
      return { address: this.mapVariant(first.result, first), degraded: false };
    } catch (e) {
      this.logger.warn(`DaData clean network error: ${String(e)}`);
      return { address: null, degraded: true };
    }
  }

  private mapVariant(value: string, d: any): AddressVariant {
    return {
      value: value ?? '',
      city: d?.city ?? d?.settlement ?? d?.town ?? null,
    };
  }
}