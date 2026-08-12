import { CACHE_TTL, CHART_DAYS } from '../config.js';
import { state, dom } from '../state.js';
import { getCache, getStaleCache, setCache } from '../services/cache.js';
import { getCoinDetail, getMarketChart } from '../services/api.js';
import { formatPrice, filterPricesByDays } from '../utils/format.js';
import { renderChart } from './chart.js';

const CLOSE_BTN = '<button class="close-detail" type="button" aria-label="Cerrar">&times;</button>';

function setDetailContent(html) {
    dom.detailContent.innerHTML = CLOSE_BTN + html;
}

export function closeDetailPanel() {
    dom.detailPanel.classList.remove('active');
    document.body.classList.remove('no-scroll');
    if (state.chart) {
        state.chart.destroy();
        state.chart = null;
    }
}

export async function openDetail(coin) {
    setDetailContent('<div class="detail-loading">Cargando datos...</div>');
    dom.detailPanel.classList.add('active');
    document.body.classList.add('no-scroll');

    try {
        const detailKey = `detail_${coin.id}_${state.currentMoneda}`;
        const chartKey = `chart_${coin.id}_${state.currentMoneda}`;

        let chartData = getCache(chartKey, CACHE_TTL.chart);
        let detail = getCache(detailKey, CACHE_TTL.detail);

        const fetches = [];
        if (!chartData) {
            fetches.push(
                getMarketChart(coin.id, state.currentMoneda, CHART_DAYS).then(res => {
                    if (res) {
                        chartData = res;
                        setCache(chartKey, chartData);
                    }
                })
            );
        }
        if (!detail) {
            fetches.push(
                getCoinDetail(coin.id).then(res => {
                    if (res) {
                        detail = res;
                        setCache(detailKey, detail);
                    }
                })
            );
        }
        if (fetches.length) await Promise.all(fetches);

        if (!chartData) chartData = getStaleCache(chartKey);
        if (!detail) detail = getStaleCache(detailKey);

        if (!chartData || !detail) {
            setDetailContent(`
                <p class="error-msg">Limite de peticiones alcanzado.</p>
                <p class="error-msg" style="font-size:13px;margin-top:8px;">CoinGecko limita las consultas gratuitas. Espera 1 minuto e intenta de nuevo.</p>
                <button class="retry-btn" id="retryDetailBtn" style="margin-top:16px">Reintentar</button>
            `);
            document.getElementById('retryDetailBtn')?.addEventListener('click', () => openDetail(coin));
            return;
        }

        const md = detail.market_data;
        const position24h = md.high_24h[state.currentMoneda] !== md.low_24h[state.currentMoneda]
            ? ((md.current_price[state.currentMoneda] - md.low_24h[state.currentMoneda])
                / (md.high_24h[state.currentMoneda] - md.low_24h[state.currentMoneda])) * 100
            : 50;

        const athPct = md.ath_change_percentage[state.currentMoneda] || 0;
        const atlPct = md.atl_change_percentage[state.currentMoneda] || 0;

        setDetailContent(`
            <div class="detail-header">
                <img src="${coin.image}" alt="${coin.name}" class="detail-icon" />
                <div>
                    <h2 class="detail-name">${coin.name} <span class="detail-symbol">${coin.symbol.toUpperCase()}</span></h2>
                    <span class="detail-rank">Rank #${coin.market_cap_rank}</span>
                </div>
            </div>

            <div class="detail-price">${formatPrice(md.current_price[state.currentMoneda])}</div>
            <div class="detail-change ${md.price_change_percentage_24h >= 0 ? 'up' : 'down'}">
                ${md.price_change_percentage_24h >= 0 ? '&#9650;' : '&#9660;'}
                ${Math.abs(md.price_change_percentage_24h || 0).toFixed(2)}% (24h)
            </div>

            <div class="range-bar">
                <span class="range-label">Posicion 24h</span>
                <div class="range-track">
                    <div class="range-fill" style="width: ${Math.min(100, Math.max(0, position24h))}%"></div>
                    <div class="range-thumb" style="left: ${Math.min(100, Math.max(0, position24h))}%"></div>
                </div>
                <div class="range-labels">
                    <span>${formatPrice(md.low_24h[state.currentMoneda])}</span>
                    <span>${formatPrice(md.high_24h[state.currentMoneda])}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-stat">
                    <span class="detail-stat-label">Maximo 24h</span>
                    <span class="detail-stat-value">${formatPrice(md.high_24h[state.currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Minimo 24h</span>
                    <span class="detail-stat-value">${formatPrice(md.low_24h[state.currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Volumen 24h</span>
                    <span class="detail-stat-value">${formatPrice(md.total_volume[state.currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Market Cap</span>
                    <span class="detail-stat-value">${formatPrice(md.market_cap[state.currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Supply Circulante</span>
                    <span class="detail-stat-value">${md.circulating_supply ? md.circulating_supply.toLocaleString() : '--'}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Supply Max</span>
                    <span class="detail-stat-value">${md.max_supply ? md.max_supply.toLocaleString() : 'Ilimitado'}</span>
                </div>
            </div>

            <div class="ath-atl-section">
                <h4 class="section-title">Analisis Historico</h4>
                <div class="ath-atl-grid">
                    <div class="ath-card">
                        <span class="ath-label">ATH (Tope historico)</span>
                        <span class="ath-value">${formatPrice(md.ath[state.currentMoneda])}</span>
                        <span class="ath-change ${athPct >= 0 ? 'up' : 'down'}">${athPct >= 0 ? '+' : ''}${athPct.toFixed(1)}% desde ATH</span>
                        <span class="ath-date">${new Date(md.ath_date[state.currentMoneda]).toLocaleDateString('es')}</span>
                    </div>
                    <div class="atl-card">
                        <span class="ath-label">ATL (Fondo historico)</span>
                        <span class="ath-value">${formatPrice(md.atl[state.currentMoneda])}</span>
                        <span class="ath-change up">+${atlPct.toFixed(1)}% desde ATL</span>
                        <span class="ath-date">${new Date(md.atl_date[state.currentMoneda]).toLocaleDateString('es')}</span>
                    </div>
                </div>
            </div>

            <div class="chart-section">
                <div class="chart-header">
                    <h4 class="section-title">Evolucion de Precio</h4>
                    <div class="chart-buttons">
                        <button class="chart-btn active" data-days="7">7d</button>
                        <button class="chart-btn" data-days="30">30d</button>
                        <button class="chart-btn" data-days="90">90d</button>
                        <button class="chart-btn" data-days="365">1a</button>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="detailChart"></canvas>
                </div>
            </div>
        `);

        renderChart(filterPricesByDays(chartData.prices, 7));

        dom.detailContent.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                dom.detailContent.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const days = parseInt(e.target.dataset.days, 10);
                renderChart(filterPricesByDays(chartData.prices, days));
            });
        });
    } catch (e) {
        console.error(e);
        setDetailContent('<p class="error-msg">Error al cargar detalles.</p>');
    }
}

export function initDetailPanel() {
    dom.detailPanel.addEventListener('click', (e) => {
        if (e.target === dom.detailPanel || e.target.closest('.close-detail')) {
            closeDetailPanel();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.detailPanel.classList.contains('active')) {
            closeDetailPanel();
        }
    });
}
