import { CACHE_TTL } from '../config.js';
import { state, dom } from '../state.js';
import { getCache, getStaleCache, setCache } from '../services/cache.js';
import { getGlobal } from '../services/api.js';
import { formatPrice } from '../utils/format.js';

function applyGlobalData(g) {
    document.getElementById('globalMarketCap').textContent = formatPrice(g.total_market_cap[state.currentMoneda]);
    document.getElementById('globalVolume').textContent = formatPrice(g.total_volume[state.currentMoneda]);
    document.getElementById('btcDominance').textContent = g.market_cap_percentage.btc
        ? `${g.market_cap_percentage.btc.toFixed(1)}%`
        : '--';
}

export async function loadGlobalData() {
    const cacheKey = `global_${state.currentMoneda}`;
    const cached = getCache(cacheKey, CACHE_TTL.global);
    if (cached) {
        applyGlobalData(cached);
        return;
    }

    try {
        const data = await getGlobal();
        if (data?.data) {
            setCache(cacheKey, data.data);
            applyGlobalData(data.data);
        } else {
            const stale = getStaleCache(cacheKey);
            if (stale) applyGlobalData(stale);
        }
    } catch (e) {
        console.error('Error loading global data:', e);
        const stale = getStaleCache(cacheKey);
        if (stale) applyGlobalData(stale);
    }
}
