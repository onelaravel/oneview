/**
 * Store Service - V2 TypeScript
 * V1 Architecture: StoreDep (internal engine) + StoreService (public wrapper)
 * Avoids conflicts with dynamic properties
 */

interface TTLInfo {
    ttl: number; // minutes
    ttlMs: number;
    createdAt: number;
    expiresAt: number;
}

interface StoreListener {
    keys: Set<string>;
    callback: (values: Record<string, any>) => void;
    called: boolean;
}

/**
 * StoreDep - Internal storage engine
 * Handles all core logic: data, TTL, subscriptions, batching
 */
class StoreDep {
    // @ts-ignore - Used for dynamic property definition on parent service
    private service: StoreService;
    // Core API methods to protect from being overwritten by user keys
    private ownProps = ['__dep__', 'set', 'get', 'has', 'subscribe', 'unsubscribe', 'remove', 'onExpire', 'destroy'];
    private existsKeys: Set<string> = new Set();
    private data: Record<string, any> = {};
    private ttlMap: Map<string, TTLInfo> = new Map();
    private changedKeys: Set<string> = new Set();
    private listeners: Map<string, Array<(value: any) => void>> = new Map();
    private multiKeyListeners: StoreListener[] = [];
    private expirationListeners: Map<string, Array<(value: any) => void>> = new Map();
    private hasPendingFlush: boolean = false;
    private batchCleanupTimer: ReturnType<typeof setInterval> | null = null;
    private readonly batchCleanupInterval: number = 60000; // 1 minute

    constructor(service: StoreService) {
        this.service = service;
        this.startBatchCleanupTimer();
    }

    /**
     * Set value với TTL tùy chọn
     */
    set<T = any>(key: string, value: T, ttl: number | null = null): void {
        if (this.ownProps.includes(key)) {
            return;
        }
        this.data[key] = value;

        // Set TTL (in minutes)
        if (ttl !== null && typeof ttl === 'number' && ttl > 0) {
            const ttlMs = ttl * 60 * 1000;
            const expirationTime = Date.now() + ttlMs;
            this.ttlMap.set(key, {
                ttl,
                ttlMs,
                createdAt: Date.now(),
                expiresAt: expirationTime,
            });
        } else {
            this.ttlMap.delete(key);
        }

        // Queue change notification
        this.emitChange(key, value);

        // Optimization: Dynamic property access
        if (!Object.prototype.hasOwnProperty.call(this, key)) {
            Object.defineProperty(this, key, {
                get: () => this.get<T>(key),
                set: (newValue: T) => this.set<T>(key, newValue, ttl),
                enumerable: true,
                configurable: true,
            });
        }
    }

    /**
     * Get value with lazy expiration check
     * Optimization: Check and expire on access (lazy cleanup)
     */
    get<T = any>(key: string): T | null {
        // Lazy cleanup: Check expiration
        if (this.checkAndExpireIfNeeded(key)) {
            return null;
        }

        return (this.data[key] as T) ?? null;
    }

    /**
     * Check if key exists and not expired
     */
    has(key: string): boolean {
        if (this.checkAndExpireIfNeeded(key)) {
            return false;
        }
        return key in this.data;
    }

    /**
     * Remove key (V1 compatible alias for delete)
     * @returns Giá trị đã xóa hoặc null
     */
    remove(key: string): any {
        if (!(key in this.data)) {
            return null;
        }

        const removedValue = this.data[key];

        delete this.data[key];
        this.ttlMap.delete(key);
        this.listeners.delete(key);
        this.expirationListeners.delete(key);

        this.emitChange(key, null);

        return removedValue;
    }

    /**
     * Delete key (alias for remove)
     */
    delete(key: string): void {
        this.remove(key);
    }

    /**
     * Clear all data
     */
    clear(): void {
        const keys = Array.from(this.existsKeys);
        this.data = {};
        this.existsKeys.clear();
        this.ttlMap.clear();
        this.listeners.clear();
        this.expirationListeners.clear();
        this.multiKeyListeners = [];
        this.changedKeys.clear();
        this.hasPendingFlush = false;

        // Notify all cleared keys
        keys.forEach(key => this.emitChange(key, null));
    }

    /**
     * Subscribe to key changes
     * V1 compatible:
     * - Single key: subscribe('user', value => {})
     * - Multiple keys: subscribe(['user', 'token'], values => {}) where values = {user: ..., token: ...}
     */
    subscribe(
        key: string | string[],
        callback: (value: any) => void
    ): () => void {
        if (Array.isArray(key)) {
            const keys = new Set(key);
            const listener: StoreListener = { keys, callback: callback as any, called: false };
            this.multiKeyListeners.push(listener);

            return () => {
                const index = this.multiKeyListeners.indexOf(listener);
                if (index !== -1) {
                    this.multiKeyListeners.splice(index, 1);
                }
            };
        }

        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(callback);

        return () => this.unsubscribe(key, callback);
    }

    /**
     * Unsubscribe from key changes
     */
    unsubscribe(key: string, callback: (value: any) => void): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            const filtered = keyListeners.filter(cb => cb !== callback);
            if (filtered.length > 0) {
                this.listeners.set(key, filtered);
            } else {
                this.listeners.delete(key);
            }
        }
    }

    /**
     * Subscribe to key expiration
     */
    onExpire(key: string, callback: (value: any) => void): () => void {
        if (!this.expirationListeners.has(key)) {
            this.expirationListeners.set(key, []);
        }
        this.expirationListeners.get(key)!.push(callback);

        return () => {
            const listeners = this.expirationListeners.get(key);
            if (listeners) {
                const filtered = listeners.filter(cb => cb !== callback);
                if (filtered.length > 0) {
                    this.expirationListeners.set(key, filtered);
                } else {
                    this.expirationListeners.delete(key);
                }
            }
        };
    }

    /**
     * Get all keys
     */
    keys(): string[] {
        return Array.from(this.existsKeys).filter(key => !this.checkAndExpireIfNeeded(key));
    }

    /**
     * Get all values
     */
    values<T = any>(): T[] {
        return this.keys().map(key => this.get<T>(key)!);
    }

    /**
     * Get all entries
     */
    entries<T = any>(): Array<[string, T]> {
        return this.keys().map(key => [key, this.get<T>(key)!]);
    }

    /**
     * Get TTL info for a key (V1 compatible)
     * @returns { ttl, createdAt, expiresAt, remainingTime, isExpired } hoặc null
     */
    getTTL(key: string): { ttl: number; createdAt: number; expiresAt: number; remainingTime: number; isExpired: boolean } | null {
        if (!this.ttlMap.has(key)) {
            return null;
        }

        const ttlInfo = this.ttlMap.get(key)!;
        const remainingTime = ttlInfo.expiresAt - Date.now();

        return {
            ttl: ttlInfo.ttl,
            createdAt: ttlInfo.createdAt,
            expiresAt: ttlInfo.expiresAt,
            remainingTime: Math.max(0, remainingTime),
            isExpired: remainingTime <= 0
        };
    }

    /**
     * Refresh TTL of a key (V1 compatible)
     * @param key - Key cần refresh
     * @param ttl - TTL mới (phút), nếu null sẽ dùng TTL hiện tại, nếu < 0 sẽ xóa TTL
     */
    refreshTTL(key: string, ttl: number | null = null): void {
        if (!(key in this.data)) {
            return;
        }

        // Nếu ttl = null, dùng TTL hiện tại (refresh)
        const finalTTL = ttl !== null && typeof ttl === 'number' && ttl > 0 
            ? ttl 
            : (this.ttlMap.has(key) ? this.ttlMap.get(key)!.ttl : null);

        if (finalTTL !== null && typeof finalTTL === 'number' && finalTTL > 0) {
            const ttlMs = finalTTL * 60 * 1000;
            const expirationTime = Date.now() + ttlMs;
            this.ttlMap.set(key, {
                ttl: finalTTL,
                ttlMs,
                createdAt: Date.now(),
                expiresAt: expirationTime
            });
        } else if (typeof ttl === 'number' && ttl < 0) {
            // Xóa TTL nếu ttl < 0
            this.ttlMap.delete(key);
        }
    }

    /**
     * Remove TTL from a key (V1 compatible)
     * Key sẽ không bao giờ hết hạn
     */
    removeTTL(key: string): void {
        this.ttlMap.delete(key);
    }

    /**
     * Check if a key is expired (V1 compatible)
     * @returns true nếu key hết hạn hoặc không tồn tại, false nếu còn hạn
     */
    isExpired(key: string): boolean {
        if (!(key in this.data)) {
            return true;
        }

        if (!this.ttlMap.has(key)) {
            return false; // Không có TTL = không hết hạn
        }

        const ttlInfo = this.ttlMap.get(key)!;
        return Date.now() > ttlInfo.expiresAt;
    }

    /**
     * Clear all expired keys manually (V1 compatible)
     * @returns Số lượng keys đã xóa
     */
    clearExpired(): number {
        const expiredKeys: string[] = [];

        this.ttlMap.forEach((ttlInfo, key) => {
            if (Date.now() > ttlInfo.expiresAt) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => this.expireKey(key));

        return expiredKeys.length;
    }

    /**
     * Emit change notification (batched) - V1 uses Promise.resolve()
     * @private
     */
    private emitChange(key: string, _value?: any): void {
        this.changedKeys.add(key);

        if (!this.hasPendingFlush) {
            this.hasPendingFlush = true;
            Promise.resolve().then(() => this.flushChanges());
        }
    }

    /**
     * Flush batched changes
     * V1 compatible: Multi-key listeners receive object with all changed values
     * @private
     */
    private flushChanges(): void {
        // Make copy before clearing
        const changedKeys = [...this.changedKeys];
        this.changedKeys.clear();
        this.hasPendingFlush = false;

        // Reset multi-key listener flags
        this.multiKeyListeners.forEach(l => (l.called = false));

        // Notify listeners
        for (const key of changedKeys) {
            const value = this.get(key);  // V1: use get() to respect TTL

            // Single-key listeners
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.forEach(callback => {
                    try {
                        callback(value);
                    } catch (error) {
                        console.error(`[StoreService] Error in listener for key "${key}":`, error);
                    }
                });
            }

            // Multi-key listeners (call once per batch with all changed values)
            for (const listener of this.multiKeyListeners) {
                if (listener.keys.has(key) && !listener.called) {
                    listener.called = true;
                    // V1 behavior: collect all changed values for subscribed keys
                    const values: Record<string, any> = {};
                    listener.keys.forEach(k => {
                        if (changedKeys.includes(k)) {
                            values[k] = this.get(k);
                        }
                    });
                    try {
                        listener.callback(values);
                    } catch (error) {
                        console.error(`[StoreService] Error in multi-key listener:`, error);
                    }
                }
            }
        }
    }

    /**
     * Check if key expired and expire if needed (lazy cleanup)
     * @private
     */
    private checkAndExpireIfNeeded(key: string): boolean {
        if (!this.ttlMap.has(key)) {
            return false;
        }

        const ttlInfo = this.ttlMap.get(key)!;
        if (Date.now() > ttlInfo.expiresAt) {
            this.expireKey(key);
            return true;
        }

        return false;
    }

    /**
     * Expire key - called by lazy cleanup or batch cleanup
     * @private
     */
    private expireKey(key: string): void {
        if (!(key in this.data)) {
            return;
        }

        const value = this.data[key];

        // Call expiration listeners
        const expirationCallbacks = this.expirationListeners.get(key);
        if (expirationCallbacks) {
            expirationCallbacks.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`[StoreService] Error in expiration listener for key "${key}":`, error);
                }
            });
        }

        // Remove key
        delete this.data[key];
        this.existsKeys.delete(key);
        this.ttlMap.delete(key);
        this.listeners.delete(key);
        this.expirationListeners.delete(key);

        // Notify change listeners
        this.emitChange(key, null);
    }

    /**
     * Start batch cleanup timer (Hybrid TTL mechanism)
     * Optimization: One timer for all keys instead of individual setTimeout
     * @private
     */
    private startBatchCleanupTimer(): void {
        if (this.batchCleanupTimer) {
            return;
        }

        this.batchCleanupTimer = setInterval(() => {
            this.executeBatchCleanup();
        }, this.batchCleanupInterval);
    }

    /**
     * Stop batch cleanup timer
     * @private
     */
    private stopBatchCleanupTimer(): void {
        if (this.batchCleanupTimer) {
            clearInterval(this.batchCleanupTimer);
            this.batchCleanupTimer = null;
        }
    }

    /**
     * Execute batch cleanup for all expired keys
     * @private
     */
    private executeBatchCleanup(): void {
        const expiredKeys: string[] = [];

        this.ttlMap.forEach((ttlInfo, key) => {
            if (Date.now() > ttlInfo.expiresAt) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => this.expireKey(key));
    }

    /**
     * Destroy cleanup
     */
    destroyStoreCleanup(): void {
        this.stopBatchCleanupTimer();
        this.data = {};
        this.existsKeys.clear();
        this.ttlMap.clear();
        this.changedKeys.clear();
        this.listeners.clear();
        this.multiKeyListeners = [];
        this.expirationListeners.clear();
        this.hasPendingFlush = false;
    }
}

/**
 * StoreService - Public wrapper (V1 Architecture)
 * Minimalist API: Only core methods exposed to avoid property conflicts
 * 
 * Core API (8 methods):
 * - set(), get(), has() - CRUD operations
 * - subscribe(), unsubscribe() - Reactive updates
 * - remove() - Delete key
 * - onExpire() - TTL expiration callback
 * - destroy() - Cleanup instance
 * 
 * Advanced features access via Object methods:
 * - Object.keys(store) - Get all keys
 * - Object.values(store) - Get all values  
 * - Object.entries(store) - Get [key, value] pairs
 * - JSON.stringify(store) - Serialize
 */
export class StoreService {
    private static instances: Map<string, StoreService> = new Map();
    
    /**
     * Internal storage engine (non-enumerable, hidden from Object.keys/for...in)
     * Access internal methods via: store.__dep__.methodName()
     */
    public __dep__!: StoreDep;
    
    /**
     * Dynamic properties set by user (store.user, store.token, etc.)
     * These ARE enumerable and will appear in Object.keys/for...in
     */
    [key: string]: any;

    static getInstance(name: string = 'default'): StoreService {
        if (!this.instances.has(name)) {
            this.instances.set(name, new StoreService());
        }
        return this.instances.get(name)!;
    }

    static removeInstance(name: string): void {
        const instance = this.instances.get(name);
        if (instance) {
            instance.destroy();
            this.instances.delete(name);
        }
    }

    static clearInstances(): void {
        this.instances.forEach(instance => instance.destroy());
        this.instances.clear();
    }

    constructor() {
        const dep = new StoreDep(this);
        Object.defineProperty(this, '__dep__', {
            value: dep,
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }

    // ========== CORE API (8 methods) ==========

    /**
     * Set value with optional TTL
     */
    set<T = any>(name: string, value: T, ttl: number | null = null): void {
        this.__dep__.set(name, value, ttl);
    }

    /**
     * Get value (returns null if expired or not exists)
     */
    get<T = any>(name: string): T | null {
        return this.__dep__.get<T>(name);
    }

    /**
     * Check if key exists and not expired
     */
    has(name: string): boolean {
        return this.__dep__.has(name);
    }

    /**
     * Subscribe to key changes
     * - Single: subscribe('user', value => {})
     * - Multi: subscribe(['user', 'token'], values => {})
     */
    subscribe(name: string | string[], callback: (value: any) => void): () => void {
        return this.__dep__.subscribe(name, callback);
    }

    /**
     * Unsubscribe from key changes
     */
    unsubscribe(name: string, callback: (value: any) => void): void {
        this.__dep__.unsubscribe(name, callback);
    }

    /**
     * Remove key and return its value
     */
    remove(name: string): any {
        return this.__dep__.remove(name);
    }

    /**
     * Subscribe to key expiration (TTL expired)
     */
    onExpire(name: string, callback: (value: any) => void): () => void {
        return this.__dep__.onExpire(name, callback);
    }

    /**
     * Destroy instance (cleanup timers and data)
     */
    destroy(): void {
        this.__dep__.destroyStoreCleanup();
    }

    // ========== DEPRECATED: Use __dep__ for advanced features ==========
    
    /**
     * @deprecated Use store.__dep__.getTTL(key) instead
     */
    getTTL(name: string): ReturnType<StoreDep['getTTL']> {
        return this.__dep__.getTTL(name);
    }

    /**
     * @deprecated Use store.__dep__.refreshTTL(key, ttl) instead
     */
    refreshTTL(name: string, ttl?: number | null): void {
        this.__dep__.refreshTTL(name, ttl);
    }
}

export default StoreService;
