import { CACHE_TTL } from '../config.js';

export function getCache(key, ttl = CACHE_TTL.coins) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > ttl) return null;
        return data;
    } catch {
        return null;
    }
}

export function getStaleCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw).data;
    } catch {
        return null;
    }
}

export function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
        localStorage.clear();
    }
}
