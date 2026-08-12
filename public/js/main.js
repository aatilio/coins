import { state, dom } from './state.js';
import { initTheme } from './ui/theme.js';
import { loadGlobalData } from './ui/globalStats.js';
import { loadCoins } from './ui/cards.js';
import { initSearch } from './ui/search.js';
import { initDetailPanel } from './ui/detail.js';

document.getElementById('year').textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDetailPanel();
    initSearch();

    loadGlobalData();
    loadCoins();

    dom.moneda.addEventListener('change', (e) => {
        state.currentMoneda = e.target.value;
        loadCoins();
        loadGlobalData();
    });
});
