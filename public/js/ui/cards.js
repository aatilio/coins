import { CACHE_TTL } from '../config.js';
import { state, dom } from '../state.js';
import { getCache, getStaleCache, setCache } from '../services/cache.js';
import { getMarkets } from '../services/api.js';
import { formatPrice } from '../utils/format.js';
import { openDetail } from './detail.js';

function showCoinsError() {
    const stale = getStaleCache(`coins_${state.currentMoneda}`);
    if (stale) {
        state.allCoins = stale;
        renderCards(state.allCoins);
        return;
    }

    dom.cryptoGrid.innerHTML = `
        <div class="error-box">
            <p class="error-msg">Limite de la API alcanzado. Espera un momento e intenta de nuevo.</p>
            <button class="retry-btn" onclick="location.reload()">Reintentar</button>
        </div>
    `;
}

export function renderCards(coins) {
    dom.cryptoGrid.innerHTML = '';

    coins.forEach(coin => {
        const change24h = coin.price_change_percentage_24h || 0;
        const changeClass = change24h >= 0 ? 'up' : 'down';
        const arrow = change24h >= 0 ? '&#9650;' : '&#9660;';

        const card = document.createElement('div');
        card.className = 'crypto-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="card-top">
                <img src="${coin.image}" alt="${coin.name}" class="card-icon" loading="lazy" />
                <div class="card-info">
                    <h3 class="card-name">${coin.name}</h3>
                    <span class="card-symbol">${coin.symbol.toUpperCase()}</span>
                </div>
                <span class="card-rank">#${coin.market_cap_rank || '--'}</span>
            </div>
            <div class="card-price">${formatPrice(coin.current_price)}</div>
            <div class="card-bottom">
                <span class="card-change ${changeClass}">${arrow} ${Math.abs(change24h).toFixed(2)}%</span>
                <span class="card-cap">MCap: ${formatPrice(coin.market_cap)}</span>
            </div>
        `;

        card.addEventListener('click', (e) => {
            e.preventDefault();
            openDetail(coin);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail(coin);
            }
        });

        dom.cryptoGrid.appendChild(card);
    });
}

export async function loadCoins() {
    const cacheKey = `coins_${state.currentMoneda}`;
    const cached = getCache(cacheKey, CACHE_TTL.coins);
    if (cached) {
        state.allCoins = cached;
        renderCards(state.allCoins);
        return;
    }

    try {
        const data = await getMarkets(state.currentMoneda);
        if (Array.isArray(data)) {
            state.allCoins = data;
            setCache(cacheKey, state.allCoins);
            renderCards(state.allCoins);
        } else {
            showCoinsError();
        }
    } catch (e) {
        console.error('Error loading coins:', e);
        showCoinsError();
    }
}
