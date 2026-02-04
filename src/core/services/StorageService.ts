/**
 * StorageService - V2 TypeScript
 * localStorage wrapper with Event System, TTL support, and optional Encryption
 * V1 Architecture: StorageDep (internal engine) + StorageService (public wrapper)
 * Avoids conflicts with dynamic properties
 */

interface DataItem {
    value: any;
    timestamp: number;
    ttl?: number; // milliseconds
}

interface BackupData {
    timestamp: number;
    key: string;
    data: Record<string, any>;
}

type EventCallback = (data?: any) => void;

/**
 * StorageDep - Internal storage engine (dependency injection pattern)
 * Handles all core logic: data, TTL, subscriptions, encryption
 * Keeps namespace clean by isolating internal state
 */
class StorageDep {
    // @ts-ignore - Used for dynamic property definition on self
    private service: StorageService;
    
    // Core API methods to protect from being overwritten by user keys
    private ownProps = [
        '__dep__', 'set', 'get', 'remove', 'clear', 'getAll', 'has', 'getAllKeys',
        'size', 'isEmpty', 'getInfo', 'export', 'import', 'backup', 'restore',
        'on', 'off', 'getEvents', 'getListenerCount'
    ];
    
    private __key: string;
    private __isSupport: boolean;
    private __data: Record<string, DataItem | any> = {};
    private __listeners: Map<string, EventCallback[]> = new Map();
    private __isUpdating: boolean = false;
    
    // Dynamic properties tracking
    private dynamicProperties: string[] = [];

    constructor(service: StorageService, key: string = 'onejs_storage') {
        this.service = service;
        this.__key = key || 'onejs_storage';
        this.__isSupport = typeof localStorage !== 'undefined';
        this.__data = {};
        this.__listeners = new Map();
        this.__isUpdating = false;
        this.dynamicProperties = [];
        
        if (this.__isSupport) {
            this.__loadData();
        }
    }

    // ==========================================
    // CORE STORAGE OPERATIONS
    // ==========================================

    /**
     * Set value with optional TTL
     */
    set(key: string | Record<string, any>, value?: any, ttl?: number | null): boolean {
        if (!this.__isSupport) return false;
        
        if (key === null || key === undefined) {
            throw new Error('Key cannot be null or undefined');
        }
        
        // If key is object, set multiple keys
        if (typeof key === 'object' && key !== null) {
            let success = true;
            for (const [k, v] of Object.entries(key)) {
                if (!this.set(k, v, ttl as number | null)) {
                    success = false;
                }
            }
            return success;
        }
        
        if (typeof key !== 'string') {
            throw new Error('Key must be a string when setting single value');
        }
        
        if (this.ownProps.includes(key)) {
            return false; // Protect core API
        }
        
        if (ttl && (typeof ttl !== 'number' || ttl <= 0)) {
            throw new Error('TTL must be a positive number or null');
        }
        
        const oldValue = this.__data[key];
        
        const dataItem: DataItem = {
            value: value,
            timestamp: Date.now()
        };
        
        if (ttl !== null && ttl !== undefined) {
            dataItem.ttl = ttl * 1000; // Convert to milliseconds
        }
        
        this.__data[key] = dataItem;
        
        try {
            this.__updateData();
            this.__createDynamicProperty(key, ttl);
            
            this.__emit(`set:${key}`, { key, value, oldValue, ttl });
            this.__emit('set', { key, value, oldValue, ttl });
            
            return true;
        } catch (error) {
            this.__data[key] = oldValue;
            throw error;
        }
    }

    /**
     * Get value with TTL check
     */
    get<T = any>(key: string, defaultValue: T | null = null): T | null {
        if (!this.__isSupport) return defaultValue;
        
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        
        if (!(key in this.__data)) return defaultValue;
        
        const dataItem = this.__data[key];
        
        // Check if data has TTL structure
        if (dataItem && typeof dataItem === 'object' && 'value' in dataItem) {
            if (this.__isExpired(dataItem)) {
                this.remove(key);
                return defaultValue;
            }
            return dataItem.value as T;
        } else {
            // Legacy data without TTL structure
            return dataItem as T;
        }
    }

    /**
     * Remove key from storage
     */
    remove(key: string): boolean {
        if (!this.__isSupport) return false;
        
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        
        if (!(key in this.__data)) {
            return false;
        }
        
        const oldValue = this.__data[key];
        delete this.__data[key];
        
        try {
            this.__updateData();
            this.__removeDynamicProperty(key);
            
            this.__emit('remove', { key, oldValue });
            this.__emit(`remove:${key}`, { key, oldValue });
            
            return true;
        } catch (error) {
            this.__data[key] = oldValue;
            throw error;
        }
    }

    /**
     * Clear all storage
     */
    clear(): void {
        const oldData = { ...this.__data };
        this.__data = {};
        
        if (this.dynamicProperties) {
            for (const key of this.dynamicProperties) {
                this.__removeDynamicProperty(key);
            }
            this.dynamicProperties = [];
        }
        
        try {
            this.__updateData();
            this.__emit('clear', { oldData });
        } catch (error) {
            this.__data = oldData;
            throw error;
        }
    }

    /**
     * Get all data (excluding expired items)
     */
    getAll(): Record<string, any> {
        this.__cleanExpiredData();
        
        const result: Record<string, any> = {};
        for (const [key, dataItem] of Object.entries(this.__data)) {
            if (dataItem && typeof dataItem === 'object' && 'value' in dataItem) {
                result[key] = dataItem.value;
            } else {
                result[key] = dataItem;
            }
        }
        return result;
    }

    /**
     * Check if key exists and not expired
     */
    has(key: string): boolean {
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        
        if (!(key in this.__data)) return false;
        
        const dataItem = this.__data[key];
        
        if (dataItem && typeof dataItem === 'object' && 'value' in dataItem) {
            return !this.__isExpired(dataItem);
        }
        
        return true; // Legacy data without TTL
    }

    /**
     * Get all keys (excluding expired items)
     */
    getAllKeys(): string[] {
        this.__cleanExpiredData();
        return Object.keys(this.__data);
    }

    /**
     * Get storage size
     */
    size(): number {
        this.__cleanExpiredData();
        return Object.keys(this.__data).length;
    }

    /**
     * Check if storage is empty
     */
    isEmpty(): boolean {
        return this.size() === 0;
    }

    /**
     * Get storage info
     */
    getInfo(): Record<string, any> {
        this.__cleanExpiredData();
        
        return {
            key: this.__key,
            isSupport: this.__isSupport,
            size: this.size(),
            keys: this.getAllKeys(),
            isEmpty: this.isEmpty(),
            events: this.getEvents(),
            totalListeners: Array.from(this.__listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            dynamicProperties: this.dynamicProperties ? this.dynamicProperties.length : 0
        };
    }

    // ==========================================
    // IMPORT/EXPORT
    // ==========================================

    /**
     * Export data as JSON
     */
    export(): string {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Import data from JSON
     */
    import(jsonString: string): boolean {
        if (typeof jsonString !== 'string') {
            throw new Error('JSON string must be a string');
        }
        
        try {
            const data = JSON.parse(jsonString);
            const oldData = { ...this.__data };
            
            this.__data = {};
            for (const [key, value] of Object.entries(data)) {
                this.__data[key] = {
                    value: value,
                    timestamp: Date.now()
                };
            }
            
            this.__updateData();
            this.__emit('import', { oldData, newData: data });
            
            return true;
        } catch (error) {
            console.error('❌ StorageService: Failed to import data:', error);
            return false;
        }
    }

    /**
     * Backup current data
     */
    backup(): BackupData {
        return {
            timestamp: Date.now(),
            key: this.__key,
            data: { ...this.getAll() }
        };
    }

    /**
     * Restore from backup
     */
    restore(backup: BackupData): boolean {
        if (!backup || typeof backup !== 'object') {
            throw new Error('Backup must be a valid object');
        }
        
        if (!backup.data) {
            console.error('❌ StorageService: Invalid backup data');
            return false;
        }

        const oldData = { ...this.__data };
        this.__data = {};
        
        for (const [key, value] of Object.entries(backup.data)) {
            this.__data[key] = {
                value: value,
                timestamp: Date.now()
            };
        }
        
        try {
            this.__updateData();
            this.__emit('restore', { oldData, newData: backup.data, backup });
            return true;
        } catch (error) {
            this.__data = oldData;
            throw error;
        }
    }

    // ==========================================
    // EVENT SYSTEM
    // ==========================================

    /**
     * Add event listener
     */
    on(event: string, callback: EventCallback): () => void {
        if (typeof event !== 'string' || !event.trim()) {
            throw new Error('Event name must be a non-empty string');
        }
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.__listeners.has(event)) {
            this.__listeners.set(event, []);
        }
        
        this.__listeners.get(event)!.push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback: EventCallback): void {
        if (!this.__listeners.has(event)) return;
        
        const listeners = this.__listeners.get(event)!;
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners(event?: string): void {
        if (event) {
            this.__listeners.delete(event);
        } else {
            this.__listeners.clear();
        }
    }

    /**
     * Get all registered events
     */
    getEvents(): string[] {
        return Array.from(this.__listeners.keys());
    }

    /**
     * Get listener count for event
     */
    getListenerCount(event: string): number {
        return this.__listeners.has(event) ? this.__listeners.get(event)!.length : 0;
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Encrypt data (passthrough - encryption disabled)
     */
    private __encrypt(data: string): string {
        return data;
    }

    /**
     * Decrypt data (passthrough - encryption disabled)
     */
    private __decrypt(data: string): string {
        return data;
    }

    /**
     * Check if data item is expired
     */
    private __isExpired(dataItem: DataItem | any): boolean {
        if (!dataItem || !dataItem.timestamp || !dataItem.ttl) {
            return false;
        }
        
        const now = Date.now();
        const expiryTime = dataItem.timestamp + dataItem.ttl;
        return now > expiryTime;
    }

    /**
     * Clean expired data
     */
    private __cleanExpiredData(): number {
        let removed = 0;
        const keysToRemove: string[] = [];
        
        for (const [key, dataItem] of Object.entries(this.__data)) {
            if (this.__isExpired(dataItem)) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            delete this.__data[key];
            removed++;
        }
        
        if (removed > 0) {
            this.__updateData();
        }
        
        return removed;
    }

    /**
     * Load data from localStorage
     */
    private __loadData(): void {
        if (!this.__isSupport) return;
        
        try {
            const data = localStorage.getItem(this.__key);
            if (data) {
                const decryptedData = this.__decrypt(data);
                this.__data = JSON.parse(decryptedData);
                this.__cleanExpiredData();
            }
        } catch (error) {
            console.error('❌ StorageService: Failed to load data:', error);
            this.__data = {};
        }
    }

    /**
     * Update localStorage with current data
     */
    private __updateData(): void {
        if (!this.__isSupport || this.__isUpdating) return;
        
        this.__isUpdating = true;
        
        try {
            const jsonData = JSON.stringify(this.__data);
            const encryptedData = this.__encrypt(jsonData);
            localStorage.setItem(this.__key, encryptedData);
        } catch (error) {
            console.error('❌ StorageService: Failed to update data:', error);
            throw error;
        } finally {
            this.__isUpdating = false;
        }
    }

    /**
     * Emit event to listeners
     */
    private __emit(event: string, data?: any): void {
        if (!this.__listeners.has(event)) return;
        
        const listeners = this.__listeners.get(event)!;
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ StorageService: Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Create dynamic property for direct access on StorageDep
     */
    private __createDynamicProperty(key: string, _ttl?: number | null): void {
        try {
            if (!this.ownProps.includes(key) && !this.dynamicProperties.includes(key)) {
                this.dynamicProperties.push(key);
                Object.defineProperty(this, key, {
                    set: (value: any) => this.set(key, value, _ttl as number | null),
                    get: () => this.get(key),
                    configurable: true,
                    enumerable: true
                });
            }
        } catch (error) {
            console.error('❌ StorageService: Failed to create dynamic property:', error);
        }
    }

    /**
     * Remove dynamic property
     */
    private __removeDynamicProperty(key: string): void {
        try {
            if (this.dynamicProperties && this.dynamicProperties.includes(key)) {
                delete (this as any)[key];
                this.dynamicProperties = this.dynamicProperties.filter(k => k !== key);
            }
        } catch (error) {
            console.error('❌ StorageService: Failed to remove dynamic property:', error);
        }
    }
}

/**
 * StorageService - Public API
 * Delegates to StorageDep for clean namespace separation
 */
export class StorageService {
    private static instance: StorageService | null = null;
    public __dep__: StorageDep;

    constructor(key: string = 'onejs_storage') {
        this.__dep__ = new StorageDep(this, key);
    }

    static getInstance(key?: string): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService(key);
        }
        return StorageService.instance;
    }

    static make(key: string = 'onejs_storage'): StorageService {
        return new StorageService(key);
    }

    // Delegate methods to __dep__
    set(key: string | Record<string, any>, value?: any, ttl?: number | null): boolean {
        return this.__dep__.set(key, value, ttl);
    }

    get<T = any>(key: string, defaultValue: T | null = null): T | null {
        return this.__dep__.get(key, defaultValue);
    }

    remove(key: string): boolean {
        return this.__dep__.remove(key);
    }

    clear(): void {
        return this.__dep__.clear();
    }

    getAll(): Record<string, any> {
        return this.__dep__.getAll();
    }

    has(key: string): boolean {
        return this.__dep__.has(key);
    }

    getAllKeys(): string[] {
        return this.__dep__.getAllKeys();
    }

    size(): number {
        return this.__dep__.size();
    }

    isEmpty(): boolean {
        return this.__dep__.isEmpty();
    }

    getInfo(): Record<string, any> {
        return this.__dep__.getInfo();
    }

    export(): string {
        return this.__dep__.export();
    }

    import(jsonString: string): boolean {
        return this.__dep__.import(jsonString);
    }

    backup(): BackupData {
        return this.__dep__.backup();
    }

    restore(backup: BackupData): boolean {
        return this.__dep__.restore(backup);
    }

    on(event: string, callback: EventCallback): () => void {
        return this.__dep__.on(event, callback);
    }

    off(event: string, callback: EventCallback): void {
        return this.__dep__.off(event, callback);
    }

    getEvents(): string[] {
        return this.__dep__.getEvents();
    }

    getListenerCount(event: string): number {
        return this.__dep__.getListenerCount(event);
    }
}
