import { state } from '../state.js';
import { formatPrice } from '../utils/format.js';

export function renderChart(prices) {
    const ctx = document.getElementById('detailChart');
    if (!ctx) return;
    if (state.chart) state.chart.destroy();

    const labels = prices.map(p => {
        const d = new Date(p[0]);
        return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    });
    const values = prices.map(p => p[1]);

    const symbols = { usd: '$', mxn: 'MX$', eur: '\u20AC', gbp: '\u00A3' };
    const sym = symbols[state.currentMoneda] || '$';

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    state.chart = new Chart(ctx, {
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
                pointHoverBorderWidth: 2,
            }],
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
                        label: (c) => `${sym}${c.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    },
                },
            },
            scales: {
                x: {
                    ticks: { maxTicksLimit: 6, color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(100, 116, 139, 0.1)' },
                    border: { color: 'rgba(100, 116, 139, 0.2)' },
                },
                y: {
                    ticks: {
                        callback: (v) => `${sym}${v.toLocaleString()}`,
                        color: '#64748b',
                        font: { size: 10 },
                    },
                    grid: { color: 'rgba(100, 116, 139, 0.1)' },
                    border: { color: 'rgba(100, 116, 139, 0.2)' },
                },
            },
            interaction: { intersect: false, mode: 'index' },
        },
    });
}
