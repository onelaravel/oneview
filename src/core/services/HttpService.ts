/**
 * HTTP Service - V2 TypeScript
 * Optimized with better error handling, request cancellation, and interceptors
 */

import type { HttpRequestConfig, HttpResponse } from '../types/index.js';

export interface HttpInterceptor {
    request?: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
    response?: <T = any>(response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
    error?: (error: Error) => Error | Promise<Error>;
}

export class HttpService {
    private baseUrl: string = '';
    private timeout: number = 10000;
    private defaultHeaders: Record<string, string> = {};
    private interceptors: HttpInterceptor[] = [];
    
    // Optimization: Reuse AbortController for cancellable requests
    private pendingRequests: Map<string, AbortController> = new Map();

    /**
     * Set base URL for all requests
     */
    setBaseUrl(url: string): void {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    }

    /**
     * Set request timeout (ms)
     */
    setTimeout(timeout: number): void {
        this.timeout = timeout;
    }

    /**
     * Set default headers for all requests
     */
    setDefaultHeaders(headers: Record<string, string>): void {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }

    /**
     * Set single header
     */
    setHeader(name: string, value: string): void {
        this.defaultHeaders[name] = value;
    }

    /**
     * Add request/response interceptor
     * Optimization: Chainable interceptors for auth, logging, etc.
     */
    addInterceptor(interceptor: HttpInterceptor): () => void {
        this.interceptors.push(interceptor);
        // Return unregister function
        return () => {
            const index = this.interceptors.indexOf(interceptor);
            if (index !== -1) {
                this.interceptors.splice(index, 1);
            }
        };
    }

    /**
     * Core request method - V1 compatible
     * Response format: { status: boolean, statusCode: number, data: any, headers: Headers }
     */
    async request<T = any>(
        method: string,
        url: string,
        data: any = null,
        options: HttpRequestConfig = {}
    ): Promise<HttpResponse<T>> {
        // Build full URL
        let fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        
        // Optimization: Cancel previous request with same URL (for search/autocomplete)
        const requestKey = `${method}:${fullUrl}`;
        if (this.pendingRequests.has(requestKey)) {
            this.pendingRequests.get(requestKey)!.abort();
        }

        // Create abort controller
        const controller = new AbortController();
        this.pendingRequests.set(requestKey, controller);

        // Build request config
        let config: RequestInit & HttpRequestConfig = {
            method: method.toUpperCase() as any,
            headers: {
                ...this.defaultHeaders,
                ...options.headers,
            },
            signal: options.signal || controller.signal,
            ...options,
        };

        // Apply request interceptors
        for (const interceptor of this.interceptors) {
            if (interceptor.request) {
                config = await interceptor.request(config);
            }
        }

        // Handle request body
        if (data && ['POST', 'PUT', 'PATCH'].includes(config.method!)) {
            const contentType = (config.headers as Record<string, string>)['Content-Type'];
            if (contentType === 'application/json') {
                config.body = JSON.stringify(data);
            } else if (data instanceof FormData) {
                config.body = data;
                // Let browser set Content-Type with boundary
                delete (config.headers as Record<string, string>)['Content-Type'];
            } else {
                config.body = data;
            }
        }

        // Handle GET query params
        if (data && config.method === 'GET') {
            const urlObj = new URL(fullUrl, window.location.origin);
            Object.entries(data).forEach(([key, value]) => {
                urlObj.searchParams.append(key, String(value));
            });
            fullUrl = urlObj.toString();
        }

        try {
            // Set timeout
            const timeoutId = setTimeout(
                () => controller.abort(),
                options.timeout || this.timeout
            );

            const fetchResponse = await fetch(fullUrl, config);
            clearTimeout(timeoutId);

            // Parse response - V1 always tries JSON first
            const responseData = await fetchResponse.json().catch(() => ({}));

            // Build response object - V1 format
            let response: HttpResponse<T> = {
                status: fetchResponse.ok,           // boolean
                statusCode: fetchResponse.status,    // number
                data: responseData,
                headers: fetchResponse.headers,
            };

            // Apply response interceptors
            for (const interceptor of this.interceptors) {
                if (interceptor.response) {
                    response = await interceptor.response(response);
                }
            }

            // Cleanup
            this.pendingRequests.delete(requestKey);

            // Check if request was successful
            if (!fetchResponse.ok) {
                throw new Error(`HTTP Error: ${fetchResponse.status} ${fetchResponse.statusText}`);
            }

            return response;

        } catch (error) {
            // Cleanup
            this.pendingRequests.delete(requestKey);

            // Apply error interceptors
            let finalError = error as Error;
            for (const interceptor of this.interceptors) {
                if (interceptor.error) {
                    finalError = await interceptor.error(finalError);
                }
            }

            // Handle specific errors
            if (finalError.name === 'AbortError') {
                throw new Error('Request was cancelled');
            }

            throw finalError;
        }
    }

    /**
     * Convenience methods
     */
    async get<T = any>(url: string, params?: any, options?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>('GET', url, params, options);
    }

    async post<T = any>(url: string, data?: any, options?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>('POST', url, data, options);
    }

    async put<T = any>(url: string, data?: any, options?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>('PUT', url, data, options);
    }

    async patch<T = any>(url: string, data?: any, options?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>('PATCH', url, data, options);
    }

    async delete<T = any>(url: string, options?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>('DELETE', url, null, options);
    }

    /**
     * Cancel all pending requests
     * Useful for cleanup on route change
     */
    cancelAll(): void {
        this.pendingRequests.forEach(controller => controller.abort());
        this.pendingRequests.clear();
    }

    /**
     * Cancel specific request by URL
     */
    cancel(url: string, method: string = 'GET'): void {
        const requestKey = `${method.toUpperCase()}:${url}`;
        if (this.pendingRequests.has(requestKey)) {
            this.pendingRequests.get(requestKey)!.abort();
            this.pendingRequests.delete(requestKey);
        }
    }
}

export default HttpService;
