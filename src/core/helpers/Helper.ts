/**
 * Helper - V2 TypeScript
 * Utility functions for common operations
 */

export class Helper {
    public App: any;
    private config: {
        base_url?: string;
        [key: string]: any;
    } = {};

    constructor(App: any = null) {
        this.App = App;
    }

    setApp(App: any): void {
        this.App = App;
    }

    setConfig(config: Record<string, any>): void {
        let { base_url, ...rest } = config;
        if (base_url && base_url.endsWith('/')) {
            base_url = base_url.slice(0, -1);
        }
        this.config = {
            ...this.config,
            base_url,
            ...rest,
        };
    }

    /**
     * Generate URL with base URL
     */
    url(path: string = ''): string {
        const baseUrl = this.config.base_url || '';
        if (!path) return baseUrl;
        return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    }

    /**
     * Trim string
     */
    trim(str: string, char: string = ' '): string {
        if (typeof str !== 'string') return str;
        const regex = new RegExp(`^${this.escapeRegex(char)}+|${this.escapeRegex(char)}+$`, 'g');
        return str.replace(regex, '');
    }

    /**
     * Escape regex special characters
     * @private
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Check if string is HTML
     */
    isHtmlString(str: string): boolean {
        if (typeof str !== 'string') return false;
        return /<[a-z][\s\S]*>/i.test(str);
    }

    /**
     * Substring helper
     */
    substr(str: string, start: number, length?: number): string {
        if (typeof str !== 'string') return str;
        return str.substring(start, length);
    }

    /**
     * Convert to lowercase
     */
    strtolower(str: string): string {
        if (typeof str !== 'string') return str;
        return str.toLowerCase();
    }

    /**
     * Convert to uppercase
     */
    strtoupper(str: string): string {
        if (typeof str !== 'string') return str;
        return str.toUpperCase();
    }

    /**
     * Format date
     * Supports: YYYY, MM, DD, HH, mm, ss
     */
    formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const tokens: Record<string, string> = {
            YYYY: String(d.getFullYear()),
            MM: String(d.getMonth() + 1).padStart(2, '0'),
            DD: String(d.getDate()).padStart(2, '0'),
            HH: String(d.getHours()).padStart(2, '0'),
            mm: String(d.getMinutes()).padStart(2, '0'),
            ss: String(d.getSeconds()).padStart(2, '0'),
        };

        let result = format;
        Object.entries(tokens).forEach(([token, value]) => {
            result = result.replace(token, value);
        });

        return result;
    }

    /**
     * Format number with options
     */
    formatNumber(
        num: number,
        options: {
            decimals?: number;
            thousandsSeparator?: string;
            decimalSeparator?: string;
            prefix?: string;
            suffix?: string;
        } = {}
    ): string {
        if (typeof num !== 'number' || isNaN(num)) return '0';

        const {
            decimals = 2,
            thousandsSeparator = ',',
            decimalSeparator = '.',
            prefix = '',
            suffix = '',
        } = options;

        const parts = num.toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

        return prefix + parts.join(decimalSeparator) + suffix;
    }

    /**
     * PHP-like number_format
     */
    number_format(
        number: number | string,
        decimals: number = 0,
        decimalSeparator: string = '.',
        thousandsSeparator: string = ','
    ): string {
        const num = typeof number === 'string' ? parseFloat(number) : number;

        if (typeof num !== 'number' || isNaN(num)) return '0';

        const parts = num.toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

        return decimals > 0 ? parts.join(decimalSeparator) : parts[0];
    }

    /**
     * Generate unique ID
     */
    uniqId(prefix: string = ''): string {
        return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Escape HTML special characters
     * Optimization: Minimal allocations
     */
    escapeHtml(str: string): string {
        if (typeof str !== 'string') return String(str);
        
        const htmlEscapes: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };

        return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
    }

    /**
     * Debounce function
     * Optimization: Prevents excessive function calls
     */
    debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: number | null = null;

        return function (this: any, ...args: Parameters<T>) {
            const context = this;
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * Throttle function
     * Optimization: Rate limiting for frequent events
     */
    throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean = false;

        return function (this: any, ...args: Parameters<T>) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * Deep clone object
     * Optimization: Structured clone when available
     */
    deepClone<T>(obj: T): T {
        // Use native structuredClone if available (modern browsers)
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }

        // Fallback to JSON method
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('[Helper] Deep clone failed:', error);
            return obj;
        }
    }

    /**
     * Deep merge objects
     * Optimization: Efficient object merging
     */
    deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
        if (!sources.length) return target;

        const source = sources.shift();
        if (!source) return target;

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) {
                        Object.assign(target, { [key]: {} });
                    }
                    this.deepMerge(target[key], source[key] as any);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Check if value is plain object
     * @private
     */
    private isObject(item: any): item is Record<string, any> {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Capitalize first letter
     */
    capitalize(str: string): string {
        if (typeof str !== 'string' || !str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Convert string to camelCase
     */
    camelCase(str: string): string {
        if (typeof str !== 'string') return str;
        return str
            .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
            .replace(/^(.)/, char => char.toLowerCase());
    }

    /**
     * Convert string to kebab-case
     */
    kebabCase(str: string): string {
        if (typeof str !== 'string') return str;
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * Convert string to snake_case
     */
    snakeCase(str: string): string {
        if (typeof str !== 'string') return str;
        return str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
    }

    /**
     * Get query params from URL
     */
    getQueryParams(url: string = window.location.href): Record<string, string> {
        const params: Record<string, string> = {};
        const searchParams = new URL(url).searchParams;
        searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    }

    /**
     * Build query string from object
     */
    buildQuery(params: Record<string, any>): string {
        return new URLSearchParams(params).toString();
    }

    /**
     * Check if value is empty
     */
    isEmpty(value: any): boolean {
        if (value == null) return true;
        if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Get value from nested object by path
     * Example: get(obj, 'user.profile.name')
     */
    get<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result == null) return defaultValue;
            result = result[key];
        }

        return result !== undefined ? result : defaultValue;
    }

    /**
     * Set value in nested object by path
     * Example: set(obj, 'user.profile.name', 'John')
     */
    set(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let current = obj;

        for (const key of keys) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
    }

    /**
     * Sleep/delay function
     * Optimization: Promise-based async delay
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     * Optimization: Resilient async operations
     */
    async retry<T>(
        fn: () => Promise<T>,
        options: {
            maxAttempts?: number;
            delay?: number;
            backoff?: number;
        } = {}
    ): Promise<T> {
        const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                await this.sleep(waitTime);
            }
        }

        throw new Error('Retry failed');
    }
}

export default Helper;
