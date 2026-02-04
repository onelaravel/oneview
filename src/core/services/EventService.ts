/**
 * Event Service - V2 TypeScript
 * Optimized pub/sub system with batching and memory management
 */

import type { EventCallback } from '../types/index.js';

interface EventListener {
    callback: EventCallback;
    once: boolean;
}

interface MultiEventListener {
    events: Set<string>;
    callback: EventCallback;
    once: boolean;
    called: boolean;
}

export class EventService {
    // Singleton pattern với named instances
    private static instances: Map<string, EventService> = new Map();

    static getInstance(name: string = 'default'): EventService {
        if (!this.instances.has(name)) {
            this.instances.set(name, new EventService());
        }
        return this.instances.get(name)!;
    }

    static removeInstance(name: string): void {
        this.instances.delete(name);
    }

    static clearInstances(): void {
        this.instances.clear();
    }

    // Instance members
    private listeners: Map<string, EventListener[]> = new Map();
    private multiEventListeners: MultiEventListener[] = [];

    /**
     * Subscribe to one or multiple events
     * 
     * Supports:
     * - Single event: on('click', fn)
     * - Multiple events: on(['click', 'hover'], fn) - fn called once even if both emit
     * - Space-separated: on('click hover', fn)
     * - Object syntax: on({ click: fn1, hover: fn2 })
     */
    on(
        eventName: string | string[] | Record<string, EventCallback>,
        callback?: EventCallback | boolean,
        once: boolean = false
    ): () => void {
        // Object syntax
        if (typeof eventName === 'object' && !Array.isArray(eventName)) {
            const unsubscribers: Array<() => void> = [];
            for (const [event, fn] of Object.entries(eventName)) {
                if (typeof fn === 'function') {
                    const unsubscribe = this.on(event, fn, callback === true);
                    unsubscribers.push(unsubscribe);
                }
            }
            return () => unsubscribers.forEach(unsub => unsub());
        }

        // Space-separated events
        if (typeof eventName === 'string' && eventName.includes(' ')) {
            eventName = eventName.split(/\s+/).filter(e => e);
        }

        // Array of events - callback runs once per batch
        if (Array.isArray(eventName)) {
            const events = new Set(eventName.filter(e => typeof e === 'string'));
            if (events.size === 0) {
                return () => {};
            }

            const listener: MultiEventListener = {
                events,
                callback: callback as EventCallback,
                once,
                called: false,
            };
            this.multiEventListeners.push(listener);

            return () => {
                const index = this.multiEventListeners.indexOf(listener);
                if (index !== -1) {
                    this.multiEventListeners.splice(index, 1);
                }
            };
        }

        // Single event
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            return () => {};
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener: EventListener = { callback, once };
        this.listeners.get(eventName)!.push(listener);

        return () => {
            this.off(eventName, callback);
        };  
    }

    /**
     * Subscribe to event, auto-unsubscribe after first call
     */
    once(
        eventName: string | string[] | Record<string, EventCallback>,
        callback?: EventCallback
    ): () => void {
        return this.on(eventName, callback, true);
    }

    /**
     * Unsubscribe from events
     * 
     * - off('click') - remove all listeners for 'click'
     * - off('click', fn) - remove specific listener
     * - off(['click', 'hover']) - remove from multiple events
     * - off({ click: fn1, hover: fn2 }) - remove specific listeners
     */
    off(
        eventName: string | string[] | Record<string, EventCallback>,
        callback?: EventCallback
    ): void {
        // Object syntax
        if (typeof eventName === 'object' && !Array.isArray(eventName)) {
            for (const [event, fn] of Object.entries(eventName)) {
                this.off(event, fn);
            }
            return;
        }

        // Space-separated
        if (typeof eventName === 'string' && eventName.includes(' ')) {
            eventName = eventName.split(/\s+/).filter(e => e);
        }

        // Multiple events
        if (Array.isArray(eventName)) {
            const eventSet = new Set(eventName);
            
            // Remove from multi-event listeners
            this.multiEventListeners = this.multiEventListeners.filter(listener => {
                if (callback && listener.callback !== callback) {
                    return true;
                }
                // Remove if all events match
                return ![...listener.events].some(e => eventSet.has(e));
            });

            // Remove from single-event listeners
            eventName.forEach(event => this.off(event, callback));
            return;
        }

        // Single event
        if (typeof eventName !== 'string') return;

        if (!callback) {
            // Remove all listeners for this event
            this.listeners.delete(eventName);
        } else {
            // Remove specific listener
            const eventListeners = this.listeners.get(eventName);
            if (eventListeners) {
                const filtered = eventListeners.filter(l => l.callback !== callback);
                if (filtered.length > 0) {
                    this.listeners.set(eventName, filtered);
                } else {
                    this.listeners.delete(eventName);
                }
            }
        }
    }

    /**
     * Emit event with arguments
     * V1 compatible: Emit immediately without batching
     */
    emit(eventName: string, ...args: any[]): void {
        this._emitImmediate(eventName, args);
    }

    /**
     * Emit event immediately
     * V1 behavior: Reset multi-listener flags, then emit
     * @private
     */
    private _emitImmediate(eventName: string, args: any[]): void {
        // Reset multi-event listener called flags before processing
        this.multiEventListeners.forEach(l => (l.called = false));

        // Handle single-event listeners
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
            // Create copy to avoid issues if listener modifies array
            const listeners = [...eventListeners];
            const toRemove: EventListener[] = [];

            for (const listener of listeners) {
                try {
                    listener.callback(...args);
                } catch (error) {
                    console.error(`[EventService] Error in listener for "${eventName}":`, error);
                }

                if (listener.once) {
                    toRemove.push(listener);
                }
            }

            // Remove once listeners
            if (toRemove.length > 0) {
                this.listeners.set(
                    eventName,
                    eventListeners.filter(l => !toRemove.includes(l))
                );
            }
        }

        // Handle multi-event listeners
        const toRemoveMulti: MultiEventListener[] = [];
        for (const listener of this.multiEventListeners) {
            if (listener.events.has(eventName) && !listener.called) {
                listener.called = true;
                try {
                    listener.callback(...args);
                } catch (error) {
                    console.error(`[EventService] Error in multi-event listener:`, error);
                }

                if (listener.once) {
                    toRemoveMulti.push(listener);
                }
            }
        }

        // Remove once multi-listeners
        if (toRemoveMulti.length > 0) {
            this.multiEventListeners = this.multiEventListeners.filter(
                l => !toRemoveMulti.includes(l)
            );
        }
    }

    /**
     * Remove all listeners
     * Memory optimization
     */
    clear(): void {
        this.listeners.clear();
        this.multiEventListeners = [];
    }

    /**
     * Get listener count for debugging
     */
    listenerCount(eventName: string): number {
        const single = this.listeners.get(eventName)?.length || 0;
        const multi = this.multiEventListeners.filter(l => l.events.has(eventName)).length;
        return single + multi;
    }
}

export default EventService;
