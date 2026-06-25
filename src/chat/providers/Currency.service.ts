import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface CurrencyApiResponse {
    data: Record<string, number>;
}

@Injectable()
export class CurrencyService {
    private readonly baseUrl = 'https://api.freecurrencyapi.com/v1/latest';
    private readonly apiKey = process.env.CURRENCY_API_KEY;

    private cache: { data: Record<string, number>; base: string; timestamp: number } | null = null;
    private readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora


    async getExchangeRate(from: string, to: string): Promise<number | null> {
        from = from.toUpperCase();
        to = to.toUpperCase();

        if (from === to) return 1;

        try {
            const rates = await this.fetchRates(from);
            return rates[to] ?? null;
        } catch (error: any) {
            console.error('Error al obtener tasa de cambio:', error.message);
            return null;
        }
    }

    async convert(amount: number, from: string, to: string): Promise<number | null> {
        const rate = await this.getExchangeRate(from, to);
        if (rate === null) return null;
        return Math.round(amount * rate * 100) / 100;
    }

    private async fetchRates(base: string): Promise<Record<string, number>> {
        const now = Date.now();

        if (
            this.cache &&
            this.cache.base === base &&
            now - this.cache.timestamp < this.CACHE_TTL_MS
        ) {
            return this.cache.data;
        }

        if (!this.apiKey) {
            throw new Error(
                'CURRENCY_API_KEY no está definida. Agregala a tu archivo .env',
            );
        }

        const response = await axios.get<CurrencyApiResponse>(this.baseUrl, {
            params: {
                apikey: this.apiKey,
                base_currency: base,
            },
        });

        this.cache = {
            data: response.data.data,
            base,
            timestamp: now,
        };

        return response.data.data;
    }
}