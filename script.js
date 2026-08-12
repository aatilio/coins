const cryptoGrid = document.getElementById('cryptoGrid');
const detailPanel = document.getElementById('detailPanel');
const detailContent = document.getElementById('detailContent');
const closeDetail = document.getElementById('closeDetail');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const moneda = document.getElementById('moneda');

let allCoins = [];
let chart = null;
let currentMoneda = 'usd';
const CACHE_TTL = 120000;

document.getElementById('year').textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadGlobalData();
    loadCoins();

    closeDetail.addEventListener('click', closeDetailPanel);
    detailPanel.addEventListener('click', (e) => {
        if (e.target === detailPanel) closeDetailPanel();
    });

    moneda.addEventListener('change', (e) => {
        currentMoneda = e.target.value;
        loadCoins();
        loadGlobalData();
    });

    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length > 0) handleSearch();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) searchResults.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailPanel.classList.contains('active')) {
            closeDetailPanel();
        }
    });
});

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.body.classList.add('light');
        document.querySelector('meta[name="theme-color"]').content = '#f8fafc';
    }
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        document.querySelector('meta[name="theme-color"]').content = isLight ? '#f8fafc' : '#0a0a0f';
    });
}

function getCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch { return null; }
}

function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { localStorage.clear(); }
}

let activeRequests = 0;
const MAX_CONCURRENT = 2;
let requestQueue = [];

function processQueue() {
    while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
        const { fn, resolve, reject } = requestQueue.shift();
        activeRequests++;
        fn().then(resolve).catch(reject).finally(() => {
            activeRequests--;
            processQueue();
        });
    }
}

function queueFetch(fn) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ fn, resolve, reject });
        processQueue();
    });
}

async function fetchWithRetry(url, retries = 3, delay = 3000) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                if (i < retries) {
                    await new Promise(r => setTimeout(r, delay * (i + 1)));
                    continue;
                }
                return null;
            }
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch (e) {
            if (i < retries) {
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            } else {
                throw e;
            }
        }
    }
    return null;
}

function fmt(n, currency) {
    const cur = currency || currentMoneda;
    const symbols = { usd: '$', mxn: 'MX$', eur: '\u20AC', gbp: '\u00A3' };
    const sym = symbols[cur] || '$';
    if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

async function loadGlobalData() {
    const cacheKey = `global_${currentMoneda}`;
    const cached = getCache(cacheKey);
    if (cached) {
        applyGlobalData(cached);
        return;
    }
    try {
        const data = await fetchWithRetry('https://api.coingecko.com/api/v3/global');
        if (data && data.data) {
            setCache(cacheKey, data.data);
            applyGlobalData(data.data);
        }
    } catch (e) {
        console.error('Error loading global data:', e);
    }
}

function applyGlobalData(g) {
    document.getElementById('globalMarketCap').textContent = fmt(g.total_market_cap[currentMoneda]);
    document.getElementById('globalVolume').textContent = fmt(g.total_volume[currentMoneda]);
    document.getElementById('btcDominance').textContent = g.market_cap_percentage[currentMoneda]
        ? g.market_cap_percentage[currentMoneda].toFixed(1) + '%'
        : '--';
}

async function loadCoins() {
    const cacheKey = `coins_${currentMoneda}`;
    const cached = getCache(cacheKey);
    if (cached) {
        allCoins = cached;
        renderCards(allCoins);
        return;
    }
    try {
        const data = await fetchWithRetry(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currentMoneda}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d`
        );
        if (data && Array.isArray(data)) {
            allCoins = data;
            setCache(cacheKey, allCoins);
            renderCards(allCoins);
        } else {
            showCoinsError();
        }
    } catch (e) {
        console.error('Error loading coins:', e);
        showCoinsError();
    }
}

function showCoinsError() {
    const cachedAny = getCache(`coins_${currentMoneda}`);
    if (cachedAny) {
        allCoins = cachedAny;
        renderCards(allCoins);
    } else {
        cryptoGrid.innerHTML = `
            <div class="error-box">
                <p class="error-msg">Error al cargar datos.</p>
                <button class="retry-btn" onclick="location.reload()">Reintentar</button>
            </div>
        `;
    }
}

function renderCards(coins) {
    cryptoGrid.innerHTML = '';
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
            <div class="card-price">${fmt(coin.current_price)}</div>
            <div class="card-bottom">
                <span class="card-change ${changeClass}">${arrow} ${Math.abs(change24h).toFixed(2)}%</span>
                <span class="card-cap">MCap: ${fmt(coin.market_cap)}</span>
            </div>
        `;

        const openHandler = (e) => {
            e.preventDefault();
            openDetail(coin);
        };

        card.addEventListener('click', openHandler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail(coin);
            }
        });

        cryptoGrid.appendChild(card);
    });
}

function handleSearch() {
    const q = searchInput.value.toLowerCase().trim();
    if (q.length === 0) {
        searchResults.classList.remove('active');
        return;
    }
    const filtered = allCoins.filter(c =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
    if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="search-item empty">Sin resultados</div>';
    } else {
        searchResults.innerHTML = filtered.map(c => `
            <div class="search-item" data-id="${c.id}">
                <img src="${c.image}" width="22" height="22" alt="${c.name}" loading="lazy" />
                <span>${c.name} <small>${c.symbol.toUpperCase()}</small></span>
            </div>
        `).join('');
        searchResults.querySelectorAll('.search-item[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const coin = allCoins.find(c => c.id === el.dataset.id);
                if (coin) openDetail(coin);
                searchResults.classList.remove('active');
                searchInput.value = '';
            });
        });
    }
    searchResults.classList.add('active');
}

async function openDetail(coin) {
    detailContent.innerHTML = '<div class="detail-loading">Cargando datos...</div>';
    detailPanel.classList.add('active');
    document.body.classList.add('no-scroll');

    try {
        const cacheKey = `detail_${coin.id}_${currentMoneda}`;
        const cached = getCache(cacheKey);

        let chartData, detail;
        if (cached) {
            chartData = cached.chartData;
            detail = cached.detail;
        } else {
            const chartRes = await queueFetch(() =>
                fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=${currentMoneda}&days=30`)
            );
            const detailRes = await queueFetch(() =>
                fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`)
            );
            chartData = chartRes;
            detail = detailRes;
            if (chartData && detail) {
                setCache(cacheKey, { chartData, detail });
            }
        }

        if (!chartData || !detail) {
            detailContent.innerHTML = '<p class="error-msg">Error al cargar detalles. Intenta de nuevo.</p>';
            return;
        }

        const md = detail.market_data;
        const position24h = md.high_24h[currentMoneda] !== md.low_24h[currentMoneda]
            ? ((md.current_price[currentMoneda] - md.low_24h[currentMoneda]) / (md.high_24h[currentMoneda] - md.low_24h[currentMoneda])) * 100
            : 50;

        const athPct = md.ath_change_percentage[currentMoneda] || 0;
        const atlPct = md.atl_change_percentage[currentMoneda] || 0;

        detailContent.innerHTML = `
            <div class="detail-header">
                <img src="${coin.image}" alt="${coin.name}" class="detail-icon" />
                <div>
                    <h2 class="detail-name">${coin.name} <span class="detail-symbol">${coin.symbol.toUpperCase()}</span></h2>
                    <span class="detail-rank">Rank #${coin.market_cap_rank}</span>
                </div>
            </div>

            <div class="detail-price">${fmt(md.current_price[currentMoneda])}</div>
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
                    <span>${fmt(md.low_24h[currentMoneda])}</span>
                    <span>${fmt(md.high_24h[currentMoneda])}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-stat">
                    <span class="detail-stat-label">Maximo 24h</span>
                    <span class="detail-stat-value">${fmt(md.high_24h[currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Minimo 24h</span>
                    <span class="detail-stat-value">${fmt(md.low_24h[currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Volumen 24h</span>
                    <span class="detail-stat-value">${fmt(md.total_volume[currentMoneda])}</span>
                </div>
                <div class="detail-stat">
                    <span class="detail-stat-label">Market Cap</span>
                    <span class="detail-stat-value">${fmt(md.market_cap[currentMoneda])}</span>
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
                        <span class="ath-value">${fmt(md.ath[currentMoneda])}</span>
                        <span class="ath-change ${athPct >= 0 ? 'up' : 'down'}">${athPct >= 0 ? '+' : ''}${athPct.toFixed(1)}% desde ATH</span>
                        <span class="ath-date">${new Date(md.ath_date[currentMoneda]).toLocaleDateString('es')}</span>
                    </div>
                    <div class="atl-card">
                        <span class="ath-label">ATL (Fondo historico)</span>
                        <span class="ath-value">${fmt(md.atl[currentMoneda])}</span>
                        <span class="ath-change up">+${atlPct.toFixed(1)}% desde ATL</span>
                        <span class="ath-date">${new Date(md.atl_date[currentMoneda]).toLocaleDateString('es')}</span>
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
        `;

        renderChart(chartData.prices);

        detailContent.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                detailContent.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                try {
                    const r = await queueFetch(() =>
                        fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=${currentMoneda}&days=${e.target.dataset.days}`)
                    );
                    if (r && r.prices) renderChart(r.prices);
                } catch (err) { console.error(err); }
            });
        });
    } catch (e) {
        console.error(e);
        detailContent.innerHTML = '<p class="error-msg">Error al cargar detalles.</p>';
    }
}

function closeDetailPanel() {
    detailPanel.classList.remove('active');
    document.body.classList.remove('no-scroll');
    if (chart) {
        chart.destroy();
        chart = null;
    }
}

function renderChart(prices) {
    const ctx = document.getElementById('detailChart');
    if (!ctx) return;
    if (chart) chart.destroy();

    const labels = prices.map(p => {
        const d = new Date(p[0]);
        return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    });
    const values = prices.map(p => p[1]);

    const symbols = { usd: '$', mxn: 'MX$', eur: '\u20AC', gbp: '\u00A3' };
    const sym = symbols[currentMoneda] || '$';

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 25, 0.95)',
                    titleColor: '#a5b4fc',
                    bodyColor: '#fff',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (c) => `${sym}${c.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxTicksLimit: 6, color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(100, 116, 139, 0.1)' },
                    border: { color: 'rgba(100, 116, 139, 0.2)' }
                },
                y: {
                    ticks: {
                        callback: (v) => `${sym}${v.toLocaleString()}`,
                        color: '#64748b',
                        font: { size: 10 }
                    },
                    grid: { color: 'rgba(100, 116, 139, 0.1)' },
                    border: { color: 'rgba(100, 116, 139, 0.2)' }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}
