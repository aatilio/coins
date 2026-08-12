import { CONFIG } from '../config.js';
import { fetchWithRetry, queueFetch } from './http.js';

function apiUrl(path, params = {}) {
    const qs = new URLSearchParams(params);
    if (CONFIG.API_KEY) {
        qs.set('x_cg_demo_api_key', CONFIG.API_KEY);
    }
    const query = qs.toString();
    return `${CONFIG.COINGECKO_BASE}/${path}${query ? `?${query}` : ''}`;
}

export function fetchCoinGecko(path, params = {}) {
    return queueFetch(() => fetchWithRetry(apiUrl(path, params)));
}

export function getGlobal() {
    return fetchCoinGecko('global');
}

export function getMarkets(currency) {
    return fetchCoinGecko('coins/markets', {
        vs_currency: currency,
        order: 'market_cap_desc',
        per_page: 20,
        page: 1,
        sparkline: 'false',
        price_change_percentage: '1h,24h,7d',
    });
}

export function getCoinDetail(coinId) {
    return fetchCoinGecko(`coins/${coinId}`, {
        localization: 'false',
        tickers: 'false',
        community_data: 'false',
        developer_data: 'false',
    });
}

export function getMarketChart(coinId, currency, days) {
    return fetchCoinGecko(`coins/${coinId}/market_chart`, {
        vs_currency: currency,
        days,
    });
}
