/**
 * TypeScript Type Definitions for OneJS V2
 */

import type { Container } from '../app/Container.js';

// ============= Application Types =============

export interface AppEnvironment {
    mode: 'web' | 'mobile' | 'desktop';
    debug: boolean;
    base_url: string;
    csrf_token: string;
    router_mode: 'history' | 'hash';
}

export interface ApplicationConfig {
    container?: string | HTMLElement;
    env?: Partial<AppEnvironment>;
    view?: ViewConfig;
    api?: ApiConfig;
    router?: RouterConfig;
    routes?: RouteDefinition[];
    appScope?: string;
}

export interface ApiConfig {
    baseUrl?: string;
    csrfToken?: string;
    timeout?: number;
    headers?: Record<string, string>;
}

export interface RouterConfig {
    mode?: 'history' | 'hash';
    base?: string;
    routes?: RouteDefinition[];
    allRoutes?: Record<string, string>;
}

export interface RouteDefinition {
    path: string;
    view: string;
    name?: string;
    meta?: Record<string, any>;
}

// ============= View Types =============

export interface ViewConfig {
    superView?: string | null;
    hasSuperView?: boolean,
    viewType?: 'view' | 'component' | 'template' | 'layout',
    sections?: Record<string, string>,
    wrapperConfig?: { enable: boolean, tag: string, subscribe: any, attributes: any, [key: string]: any },
    hasAwaitData?: boolean,
    hasFetchData?: boolean,
    subscribe?: boolean,
    fetch?: any,
    path?: any,
    usesVars?: boolean,
    hasSections?: boolean,
    hasSectionPreload?: boolean,
    hasPrerender?: boolean,
    renderLongSections?: any[],
    renderSections?: any[],
    prerenderSections?: any[],
    scripts?: any[],
    styles?: any[],
    resources?: [],
    [key: string]: any;
}

export interface ViewProps {
    [key: string]: ViewPropDefinition;
}

export interface ViewPropDefinition {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';
    required?: boolean;
    default?: any;
    validator?: (value: any) => boolean;
}

export interface ViewScript {
    type: 'src' | 'code';
    src?: string;
    code?: string;
    async?: boolean;
    defer?: boolean;
    module?: boolean;
}

export interface ViewStyle {
    type: 'href' | 'inline';
    href?: string;
    content?: string;
    scoped?: boolean;
}

export interface ViewLink {
    rel: string;
    href: string;
    type?: string;
    media?: string;
}

export type TemplateFunction = (context: any, data?: any) => string;


export interface View{
    __ctl__: ViewController;
    [key: string]: any;
    $__setup__:(data: Record<string, any>, systemData: Record<string, any>)=> void;
}

// ============= View Instance Types =============

export interface ViewInstance {
    path: string;
    viewType: 'view' | 'component';
    __: ViewController;
    setup(path: string, userDefined: any, config: ViewConfig): ViewInstance;
    mount(target?: HTMLElement): void;
    unmount(): void;
    update(props: any): void;
}

export interface ViewController {
    path: string;
    app: any;
    state: ViewState;
    props: any;
    setup(path: string, config: ViewConfig): void;
    render(): string;
    mount(target: HTMLElement): void;
    unmount(): void;
}

export interface ViewState {
    [key: string]: any;
}

// Legacy View interface - kept for compatibility
// interface ViewLegacy{
//     [key: string]: any;
//     __ctrl__: ViewController;
//     new (path: string, viewType: 'view' | 'component'): ViewLegacy;
//     path: string;
//     view: 'view' | 'component';
//     __: ViewController;
// }

// ============= Resource Types =============

export interface ViewResource {
    type: 'src' | 'href' | 'code' | 'inline';
    resourceType: 'script' | 'style';
    src?: string;
    href?: string;
    content?: string;
    code?: string;
    id?: string;
    viewPath: string;
    async?: boolean;
    defer?: boolean;
    module?: boolean;
    function?: string;
}

export interface ResourceRegistry {
    element: HTMLElement;
    viewPaths: Set<string>;
    referenceCount: number;
    resourceType: 'script' | 'style';
}

// ============= HTTP Service Types =============

export interface HttpRequestConfig {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    signal?: AbortSignal;
}

export interface HttpResponse<T = any> {
    status: boolean;        // V1 format: boolean indicating success
    statusCode: number;     // V1 format: HTTP status code
    data: T;
    headers: Headers;
}

// ============= Store Types =============

export interface StoreState {
    [key: string]: any;
}

export interface StoreOptions {
    state?: StoreState;
    getters?: Record<string, (state: StoreState) => any>;
    mutations?: Record<string, (state: StoreState, payload?: any) => void>;
    actions?: Record<string, (context: StoreContext, payload?: any) => any>;
}

export interface StoreContext {
    state: StoreState;
    getters: Record<string, any>;
    commit: (mutation: string, payload?: any) => void;
    dispatch: (action: string, payload?: any) => Promise<any>;
}

// ============= Event Types =============

export type EventCallback = (...args: any[]) => void;

export interface EventSubscription {
    unsubscribe: () => void;
}

// ============= Router Types =============

export interface Route {
    path: string;
    view: string;
    name?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    meta?: Record<string, any>;
}

export interface RouteMatch {
    route: Route;
    params: Record<string, string>;
}

// ============= Reactive Types =============

export interface ReactiveProxy<T = any> {
    __v_isReactive: boolean;
    __v_raw: T;
}

export interface Ref<T = any> {
    value: T;
    __v_isRef: boolean;
}

export interface ComputedRef<T = any> extends Ref<T> {
    __v_isReadonly: boolean;
    __v_isComputed: boolean;
}

export type WatchCallback<T = any> = (newValue: T, oldValue: T) => void;

export type WatchSource<T = any> = Ref<T> | (() => T);

export interface WatchOptions {
    immediate?: boolean;
    deep?: boolean;
}

// ============= Utility Types =============

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;

export interface AppFunction {
    (): Container;
    <T>(key: string): T;
    (key: string, value: any): void;
    make<T>(name: string): T;
    instance<T>(name: string, value: T): void;
    resolve<T>(name: string): T;
    register<T>(name: string, factory: () => T): void;
    bind<T>(name: string, factory: () => T): void;
    singleton<T>(name: string, factory: () => T): void;
}