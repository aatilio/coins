export const state = {
    allCoins: [],
    chart: null,
    currentMoneda: 'usd',
};

export const dom = {
    cryptoGrid: document.getElementById('cryptoGrid'),
    detailPanel: document.getElementById('detailPanel'),
    detailContent: document.getElementById('detailContent'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    moneda: document.getElementById('moneda'),
};
