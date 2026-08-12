import { state, dom } from '../state.js';
import { openDetail } from './detail.js';

export function handleSearch() {
    const q = dom.searchInput.value.toLowerCase().trim();
    if (q.length === 0) {
        dom.searchResults.classList.remove('active');
        return;
    }

    const filtered = state.allCoins.filter(c =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        dom.searchResults.innerHTML = '<div class="search-item empty">Sin resultados</div>';
    } else {
        dom.searchResults.innerHTML = filtered.map(c => `
            <div class="search-item" data-id="${c.id}">
                <img src="${c.image}" width="22" height="22" alt="${c.name}" loading="lazy" />
                <span>${c.name} <small>${c.symbol.toUpperCase()}</small></span>
            </div>
        `).join('');

        dom.searchResults.querySelectorAll('.search-item[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const coin = state.allCoins.find(c => c.id === el.dataset.id);
                if (coin) openDetail(coin);
                dom.searchResults.classList.remove('active');
                dom.searchInput.value = '';
            });
        });
    }

    dom.searchResults.classList.add('active');
}

export function initSearch() {
    dom.searchInput.addEventListener('input', handleSearch);
    dom.searchInput.addEventListener('focus', () => {
        if (dom.searchInput.value.length > 0) handleSearch();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            dom.searchResults.classList.remove('active');
        }
    });
}
