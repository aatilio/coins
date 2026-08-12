export function initTheme() {
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
