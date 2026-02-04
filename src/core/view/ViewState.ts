/**
 * StateManager - Quản lý reactive state cho View
 * Tương tự V1 StateManager nhưng với TypeScript
 * 
 * Chức năng:
 * - useState: Tạo state reactive
 * - subscribe: Lắng nghe thay đổi state
 * - Batch updates: Cập nhật batch tránh render quá nhiều
 */

import { View, ViewController } from "../types/index.js";

type StateValue = any;

interface StateItem {
    value: StateValue;
    setValue: (value: StateValue) => void;
    key: string | number;
}

interface Listener {
    (value: StateValue): void;
}

interface MultiKeyListener {
    keys: Set<string | number>;
    callback: (values: Record<string, StateValue>) => void;
    called: boolean;
}

/**
 * StateManager - Quản lý reactive state
 * 
 * Mục đích: 
 * - Cung cấp useState hook tương tự React
 * - Tự động trigger re-render khi state thay đổi
 * - Batch updates để tối ưu performance
 * - Subscribe/unsubscribe cho state changes
 * 
 * @example
 * const manager = new StateManager(controller);
 * const [count, setCount] = manager.useState(0, 'count');
 */
export class StateManager {
    /**
     * Map lưu trữ tất cả states đã tạo
     * Key: state name, Value: { value, setValue, key }
     */
    private states: Record<string | number, StateItem> = {};

    /**
     * Map lưu trữ listeners cho mỗi key
     * Key: state name, Value: [ callback1, callback2, ... ]
     */
    private listeners = new Map<string | number, Listener[]>();

    /**
     * Danh sách listeners cho multiple keys
     * Được kích hoạt khi bất kỳ key nào thay đổi
     */
    private multiKeyListeners: MultiKeyListener[] = [];

    /**
     * Set lưu các keys có thay đổi chưa được flush
     * Dùng để batch updates
     */
    private pendingChanges = new Set<string | number>();

    /**
     * Index tự động tăng cho các unnamed states
     */
    private stateIndex = 0;

    /**
     * RAF ID cho pending flush
     * Dùng để cancel nếu cần
     */
    private flushRAF: number | null = null;

    /**
     * Cờ kiểm tra có flush chưa được lên lịch
     */
    private hasPendingFlush = false;

    /**
     * Cờ kiểm tra đang flush
     */
    private isFlushing = false;

    /**
     * Cờ cho phép update state
     */
    private canUpdateStateByKey = true;

    /**
     * Controller sở hữu state
     */
    controller: ViewController | any = null;

    stateInstance: ViewState;

    /**
     * Đã destroy chưa
     */
    private _isDestroyed = false;

    setters: Record<string | number, (value: StateValue) => void> = {};


    ownProperties: string[] = ['__'];
        
    ownMethods: string[] = ['on', 'off', 'subscribe', 'unsubscribe'];

    constructor(stateInstance: ViewState, controller?: ViewController | any) {
        this.stateInstance = stateInstance;
        this.controller = controller;
    }

    /**
     * Tạo reactive state - tương tự React useState
     * 
     * @param value - Giá trị ban đầu của state
     * @param key - (Tùy chọn) Tên key cho state, nếu không truyền sẽ auto-generate
     * @returns [currentValue, setValue, stateKey]
     * 
     * @example
     * // Tự động generate key
     * const [count, setCount] = viewState.useState(0);
     * 
     * // Với custom key
     * const [user, setUser] = viewState.useState({ name: 'John' }, 'user');
     * 
     * // Update state
     * setCount(count + 1);
     * setUser({ ...user, name: 'Jane' });
     */
    useState(
        value: StateValue,
        key?: string | number
    ): [StateValue, (newValue: StateValue) => void, string | number] {
        // Nếu key đã tồn tại, return state đó
        if (key !== undefined && key !== null && this.states[key]) {
            return [this.states[key].value, this.states[key].setValue, key];
        }

        // Auto-generate key nếu không truyền
        const stateKey = String(key ?? this.stateIndex++);

        // Hàm setValue - cập nhật state và trigger change
        const setValue = (newValue: StateValue) => {
            const oldValue = this.states[stateKey].value;
            this.states[stateKey].value = newValue;
            this.commitStateChange(stateKey, oldValue);
        };

        // Tạo state item
        this.states[stateKey] = {
            value,
            setValue,
            key: stateKey
        };

        if (!this.ownProperties.includes(stateKey) && !this.ownMethods.includes(stateKey)) {
            const $self = this;
            Object.defineProperty(this.stateInstance, stateKey, {
                get: () => {
                    return $self.states[stateKey].value;
                },
                set: (value) => {
                    if (typeof $self.setters[stateKey] === 'function') {
                        return $self.setters[stateKey](value);
                    }
                    else {
                        // logger.log("Bạn không thể thiết lập giá trị cho " + stateKey + " theo cách này");
                    }
                },
                configurable: false,
                enumerable: true,
            });

        }

        return [value, setValue, stateKey];
    }

    /**
     * Cập nhật state bằng key
     * 
     * @param key - Tên state
     * @param value - Giá trị mới
     * @returns Giá trị mới
     * 
     * @example
     * viewState.updateStateByKey('count', 5);
     */
    updateStateByKey(key: string | number, value: StateValue): StateValue {
        if (!this.states[key]) {
            return undefined;
        }

        if (!this.canUpdateStateByKey) {
            return this.states[key].value;
        }

        const oldValue = this.states[key].value;
        this.states[key].value = value;
        this.commitStateChange(key, oldValue);
        return value;
    }

    /**
     * Lấy giá trị state bằng key
     * Hỗ trợ nested paths: 'user.name', 'items.0.id'
     * 
     * @param key - Tên state hoặc path
     * @returns Giá trị của state
     * 
     * @example
     * const count = viewState.getStateByKey('count');
     * const userName = viewState.getStateByKey('user.name'); // nested
     */
    getStateByKey(key: string | number): StateValue {
        const keyStr = String(key);

        // Simple key (không có dots)
        if (!keyStr.includes('.')) {
            return this.states[keyStr]?.value ?? null;
        }

        // Nested path (user.name)
        const paths = keyStr.split('.');
        const rootKey = paths[0];

        if (!this.states[rootKey]) {
            return null;
        }

        let current = this.states[rootKey].value;

        for (let i = 1; i < paths.length; i++) {
            if (typeof current !== 'object' || current === null) {
                return null;
            }
            current = current[paths[i]];
            if (current === undefined) {
                return null;
            }
        }

        return current;
    }


    updateStateAddressKey(key: string|number, value: StateValue): void {
        const keyStr = String(key);
        const keyPaths = String(key).split('.');
        const _key = keyPaths.shift();
        if ((_key === undefined || _key === null || _key === '') || !this.states[_key]) {
            return;
        }
        let stateValue = this.states[_key].value;
        if (keyPaths.length === 0 || typeof stateValue !== 'object' || stateValue === null) {
            return this.setters[_key](value);
        }
        
        // Clone object/array to create new reference for reactivity
        // This ensures oldValue !== newValue in commitStateChange
        let clonedValue;
        if (Array.isArray(stateValue)) {
            clonedValue = [...stateValue];
        } else {
            clonedValue = { ...stateValue };
        }
        
        let current = clonedValue;
        for (let i = 0; i < keyPaths.length - 1; i++) {
            const path = keyPaths[i];
            if (typeof current[path] !== 'object' || current[path] === null) {
                current[path] = {};
            } else {
                // Clone nested objects/arrays
                current[path] = Array.isArray(current[path]) ? [...current[path]] : { ...current[path] };
            }
            current = current[path];
        }
        const lastPath = keyPaths[keyPaths.length - 1];
        current[lastPath] = value;
        return this.setters[_key](clonedValue);
    }

    getStateByAddressKey(key: string|number): StateValue {
        // Convert key to string if it's a number
        const keyString = String(key);
        
        // Fast path for simple keys (no dots)
        if(!keyString.includes('.')) {
            return this.states[keyString]?.value ?? null;
        }
        
        const keyPaths = keyString.split('.');
        const rootKey = keyPaths[0];
        
        if (!this.states[rootKey]) {
            return null;
        }
        
        let current = this.states[rootKey].value;
        
        // Early return for root level
        if (keyPaths.length === 1) {
            return current;
        }
        
        // Traverse nested path
        for (let i = 1; i < keyPaths.length; i++) {
            if (typeof current !== 'object' || current === null) {
                return null;
            }
            current = current[keyPaths[i]];
            if (current === undefined) {
                return null;
            }
        }
        
        return current;
    }

    register(key: string|number, value: StateValue) {
        return this.useState(value, key)[1];
    }

    lockUpdateRealState() {
        this.canUpdateStateByKey = false;
    }
    /**
     * Đăng ký lắng nghe thay đổi state
     * 
     * @param key - State key hoặc array của keys hoặc object {key: callback}
     * @param callback - Hàm được gọi khi state thay đổi
     * @returns Hàm unsubscribe
     * 
     * @example
     * // Single key
     * const unsub = viewState.subscribe('count', (newValue) => {
     *   console.log('Count:', newValue);
     * });
     * 
     * // Multiple keys
     * viewState.subscribe(['count', 'user'], (values) => {
     *   console.log('Changes:', values);
     * });
     * 
     * // Object keys
     * viewState.subscribe({
     *   count: (val) => console.log('Count:', val),
     *   user: (val) => console.log('User:', val)
     * });
     * 
     * // Unsubscribe
     * unsub();
     */
    subscribe(
        key: string | number | string[] | Record<string, Listener>,
        callback?: Listener
    ): () => void {
        // Đăng ký multiple keys bằng array
        if (Array.isArray(key)) {
            if (key.length === 0) return () => {};
            if (key.length === 1 && callback) {
                return this.subscribe(key[0], callback);
            }

            if (typeof callback !== 'function') {
                return () => {};
            }

            const keys = new Set<string | number>();
            for (const k of key) {
                if (this.states[k]) {
                    keys.add(k);
                }
            }

            if (keys.size === 0) return () => {};

            const listener: MultiKeyListener = {
                keys,
                callback,
                called: false
            };

            this.multiKeyListeners.push(listener);

            return () => {
                const idx = this.multiKeyListeners.indexOf(listener);
                if (idx !== -1) {
                    this.multiKeyListeners.splice(idx, 1);
                }
            };
        }

        // Đăng ký multiple keys bằng object
        if (typeof key === 'object' && key !== null) {
            const unsubscribes: Record<string, () => void> = {};
            for (const k in key) {
                unsubscribes[k] = this.subscribe(k, key[k]);
            }
            return () => {
                for (const k in unsubscribes) {
                    unsubscribes[k]();
                }
            };
        }

        // Single key subscription
        if (typeof callback !== 'function') {
            return () => {};
        }

        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        this.listeners.get(key)!.push(callback);
        const index = this.listeners.get(key)!.length - 1;

        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Bỏ đăng ký lắng nghe
     * 
     * @param key - State key hoặc array hoặc object
     * @param callback - (Tùy chọn) Callback cụ thể
     * 
     * @example
     * // Bỏ callback cụ thể
     * viewState.unsubscribe('count', myCallback);
     * 
     * // Bỏ tất cả callbacks cho key
     * viewState.unsubscribe('count');
     * 
     * // Bỏ multiple keys
     * viewState.unsubscribe(['count', 'user']);
     */
    unsubscribe(
        key: string | number | string[] | Record<string, Listener>,
        callback?: Listener
    ): void {
        if (Array.isArray(key)) {
            if (key.length === 0) return;
            if (key.length === 1) {
                this.unsubscribe(key[0], callback);
                return;
            }

            const keySet = new Set(key);
            const areSetsEqual = (set1: Set<any>, set2: Set<any>) => {
                if (set1.size !== set2.size) return false;
                for (const item of set1) {
                    if (!set2.has(item)) return false;
                }
                return true;
            };

            if (!callback) {
                for (let i = this.multiKeyListeners.length - 1; i >= 0; i--) {
                    if (areSetsEqual(this.multiKeyListeners[i].keys, keySet)) {
                        this.multiKeyListeners.splice(i, 1);
                    }
                }
                return;
            }

            const idx = this.multiKeyListeners.findIndex((listener) =>
                listener.callback === callback &&
                areSetsEqual(listener.keys, keySet)
            );

            if (idx !== -1) {
                this.multiKeyListeners.splice(idx, 1);
            }
            return;
        }

        if (typeof key === 'object' && key !== null) {
            for (const k in key) {
                this.unsubscribe(k, key[k]);
            }
            return;
        }

        if (callback) {
            const listeners = this.listeners.get(key);
            if (listeners) {
                const idx = listeners.indexOf(callback);
                if (idx !== -1) {
                    listeners.splice(idx, 1);
                    if (listeners.length === 0) {
                        this.listeners.delete(key);
                    }
                }
            }
        } else {
            this.listeners.delete(key);
        }
    }

    /**
     * Alias cho subscribe
     */
    on(
        key: string | number | string[] | Record<string, Listener>,
        callback?: Listener
    ): () => void {
        return this.subscribe(key, callback);
    }

    /**
     * Alias cho unsubscribe
     */
    off(
        key: string | number | string[] | Record<string, Listener>,
        callback?: Listener
    ): void {
        this.unsubscribe(key, callback);
    }

    /**
     * Commit state change - lên lịch flush
     * 
     * @private
     */
    private commitStateChange(
        key: string | number,
        oldValue: StateValue
    ): void {
        if (this._isDestroyed) return;

        // Kiểm tra value thực sự thay đổi
        const newValue = this.states[key]?.value;
        if (oldValue === newValue) return;

        // Thêm vào pending changes
        this.pendingChanges.add(key);

        // Lên lịch flush nếu chưa
        if (!this.hasPendingFlush) {
            this.hasPendingFlush = true;
            this.flushRAF = requestAnimationFrame(() => {
                this.executeFlush();
            });
        }
    }

    /**
     * Thực thi flush tất cả changes
     * 
     * @private
     */
    private executeFlush(): void {
        if (this._isDestroyed || this.isFlushing) return;

        try {
            this.isFlushing = true;
            this.flushChanges();
        } finally {
            this.isFlushing = false;
            this.hasPendingFlush = false;
            this.flushRAF = null;
        }
    }

    /**
     * Flush tất cả pending changes
     * 
     * @private
     */
    private flushChanges(): void {
        if (this.pendingChanges.size === 0) return;

        const changesToProcess = Array.from(this.pendingChanges);
        this.pendingChanges.clear();

        // Reset multi-key listener flags
        for (const listener of this.multiKeyListeners) {
            listener.called = false;
        }

        // Trigger listeners
        for (const changedKey of changesToProcess) {
            const listeners = this.listeners.get(changedKey);
            if (listeners) {
                const currentValue = this.states[changedKey]?.value;
                for (const listener of listeners) {
                    try {
                        listener(currentValue);
                    } catch (error) {
                        console.error('[ViewState] Listener error:', error);
                    }
                }
            }

            // Check multi-key listeners
            for (const listener of this.multiKeyListeners) {
                if (!listener.called && listener.keys.has(changedKey)) {
                    listener.called = true;

                    const values: Record<string, StateValue> = {};
                    for (const k of listener.keys) {
                        if (changesToProcess.includes(k as string | number)) {
                            values[String(k)] = this.states[k]?.value;
                        }
                    }

                    try {
                        listener.callback(values);
                    } catch (error) {
                        console.error('[ViewState] Multi-key listener error:', error);
                    }
                }
            }
        }
    }

    /**
     * Xóa tất cả listeners và cleanup
     * Gọi khi destroy view để tránh memory leak
     * 
     * @example
     * beforeDestroy() {
     *   this.states.destroy();
     * }
     */
    destroy(): void {
        this._isDestroyed = true;

        if (this.flushRAF !== null) {
            cancelAnimationFrame(this.flushRAF);
            this.flushRAF = null;
        }

        this.listeners.clear();
        this.multiKeyListeners = [];
        this.pendingChanges.clear();
        this.states = {};
        this.controller = null;
    }

    /**
     * Lấy toàn bộ state data
     * Dùng cho debugging
     */
    toJSON(): Record<string | number, StateValue> {
        const data: Record<string | number, StateValue> = {};
        for (const key in this.states) {
            data[key] = this.states[key].value;
        }
        return data;
    }

    toString(): string {
        return JSON.stringify(this.toJSON());
    }
}

/**
 * ViewState - Wrapper mỏng cho StateManager
 * Tương thích với V1 API
 * 
 * Lưu StateManager ở property `__` (không enumeratable)
 * Cho phép dùng: viewState.__ để truy cập StateManager
 * 
 * @example
 * const viewState = new ViewState(controller);
 * const [count, setCount] = viewState.__.useState(0, 'count');
 * 
 * // Hoặc shortcut
 * viewState.__.subscribe('count', (val) => console.log(val));
 */
export class ViewState {
    /**
     * StateManager instance lưu ở property non-enumerable
     * Tương thích với V1 pattern: viewState.__
     */
    // private __ !: StateManager; // Legacy - commented out to avoid warnings
    [key: string]: any;
    constructor(controller?: ViewController | any) {
        const manager = new StateManager(this, controller);

        // Define __ property như V1 - non-enumerable, non-writable
        Object.defineProperty(this, '__', {
            value: manager,
            writable: false,
            configurable: false,
            enumerable: false
        });
    }

    on(
        key: string | number | string[] | Record<string, (value: any) => void>,
        callback?: (value: any) => void
    ): () => void {
        return this.__.on(key, callback);
    }

    off(
        key: string | number | string[] | Record<string, (value: any) => void>,
        callback?: (value: any) => void
    ): void {
        this.__.off(key, callback);
    }
    unsubscribe(
        key: string | number | string[] | Record<string, (value: any) => void>,
        callback?: (value: any) => void
    ): void {
        this.__.unsubscribe(key, callback);
    }

}
