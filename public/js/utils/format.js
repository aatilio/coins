import { state } from '../state.js';

export function formatPrice(n, currency) {
    const cur = currency || state.currentMoneda;
    const symbols = { usd: '$', mxn: 'MX$', eur: '\u20AC', gbp: '\u00A3' };
    const sym = symbols[cur] || '$';

    if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) {
        return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export function filterPricesByDays(prices, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return prices.filter(p => p[0] >= cutoff);
}
