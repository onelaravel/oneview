import { Container } from "../app/Container.js";
import type { AppFunction } from "../types/index.js";

/**
 * Container instance để quản lý services
 * Tương tự Laravel's app container
 */
const appContainer = new Container();

/**
 * Helper function để lấy/đăng ký services
 * Cách dùng:
 * - app() - trả về container instance
 * - app('service_name') - lấy service
 * - app('key', value) - đăng ký instance
 * 
 * @param key - Tên service (optional)
 * @param value - Giá trị service (optional)
 * @returns Container instance, service, hoặc void
 * 
 * @example
 * // Lấy container
 * const container = app();
 * container.singleton('store', Store);
 * 
 * // Lấy service trực tiếp
 * const store = app('store');
 * 
 * // Đăng ký instance
 * app('config', { api: 'https://api.example.com' });
 */
const appFunction = <T>(key?: any, value?: any): Container|T | void => {
    if (key === undefined || key === null) {
        // Không truyền gì → trả về container
        return appContainer;
    }
    if (value !== undefined) {
        // Truyền 2 tham số → đăng ký instance
        appContainer.instance(key, value);
        return;
    }
    // Truyền 1 tham số → lấy service
    return appContainer.make(key);
};

// Add make method to app function for TypeScript compatibility
appFunction.make = <T>(name: string): T => {
    return appContainer.make(name);
};
appFunction.instance = <T>(name: string, value: T): void => {
    appContainer.instance(name, value);
};
appFunction.resolve = <T>(name: string): T => {
    return appContainer.make(name);
};
appFunction.register = <T>(name: string, factory: () => T): void => {
    appContainer.bind(name, factory);
};
appFunction.bind = <T>(name: string, factory: () => T): void => {
    appContainer.bind(name, factory);
};
appFunction.singleton = <T>(name: string, factory: () => T): void => {
    appContainer.singleton(name, factory);
};
export const app = appFunction as AppFunction;

/**
 * Export container instance trực tiếp
 * Để có thể dùng: container.bind(), container.singleton(), v.v.
 */
export { appContainer };