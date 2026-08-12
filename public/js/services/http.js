import { CONFIG } from '../config.js';

const hasApiKey = () => Boolean(CONFIG.API_KEY);

let activeRequests = 0;
const MAX_CONCURRENT = () => (hasApiKey() ? 3 : 1);
const MIN_REQUEST_INTERVAL = () => (hasApiKey() ? 300 : 1500);
const requestQueue = [];
let lastRequestTime = 0;
let rateLimitUntil = 0;

function processQueue() {
    while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT()) {
        const { fn, resolve, reject } = requestQueue.shift();
        activeRequests++;
        fn().then(resolve).catch(reject).finally(() => {
            activeRequests--;
            processQueue();
        });
    }
}

export function queueFetch(fn) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ fn, resolve, reject });
        processQueue();
    });
}

async function waitForRateLimit() {
    const now = Date.now();
    const waitUntil = Math.max(lastRequestTime + MIN_REQUEST_INTERVAL(), rateLimitUntil);
    if (now < waitUntil) {
        await new Promise(r => setTimeout(r, waitUntil - now));
    }
    lastRequestTime = Date.now();
}

export async function fetchWithRetry(url, retries = 3, delay = 3000) {
    for (let i = 0; i <= retries; i++) {
        try {
            await waitForRateLimit();
            const res = await fetch(url);
            if (res.status === 429) {
                const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
                const cooldown = retryAfter > 0 ? retryAfter * 1000 : delay * Math.pow(2, i + 1);
                rateLimitUntil = Date.now() + cooldown;
                if (i < retries) {
                    await new Promise(r => setTimeout(r, cooldown));
                    continue;
                }
                return null;
            }
            if (!res.ok) throw new Error(String(res.status));
            return await res.json();
        } catch (e) {
            if (i < retries) {
                await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            } else {
                throw e;
            }
        }
    }
    return null;
}
