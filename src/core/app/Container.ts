/**
 * Định danh duy nhất cho một service trong container
 * Có thể là string ("store"), symbol, hoặc class constructor (MyClass)
 */
type Key<T = any> = string | symbol | (new (...args: any[]) => T);

/**
 * Hàm factory tạo instance của service
 * Nhận container làm tham số để resolve dependencies
 * @example
 * const factory: Factory<Database> = (container) => {
 *   const config = container.make('config');
 *   return new Database(config);
 * };
 */
type Factory<T> = (container: Container) => T;

/**
 * Loại giá trị có thể bind: factory function hoặc class constructor
 */
type Binding<T = any> = Factory<T> | (new (...args: any[]) => T);

/**
 * Định nghĩa service provider - tương tự Laravel
 * - register(): Đăng ký services vào container
 * - boot(): Khởi động services sau khi tất cả đã được đăng ký
 */
type ServiceProvider = {
    register(container: Container): void;
    boot?(container: Container): void;
};

/**
 * Container - Dependency Injection Container
 * Tương tự với Laravel Service Container
 * 
 * Chức năng chính:
 * - Đăng ký services (bind, singleton, instance)
 * - Resolve services (make, resolve)
 * - Quản lý service providers
 * - Quản lý aliases cho services
 * 
 * @example
 * // Đăng ký factory
 * container.bind('db', Database);
 * 
 * // Đăng ký singleton
 * container.singleton('store', StoreService);
 * 
 * // Lấy instance
 * const db = container.make('db');
 */
export class Container {
    /**
     * Map lưu trữ factory functions cho services
     * Mỗi lần make() sẽ gọi factory để tạo instance mới (nếu không là singleton)
     */
    private bindings = new Map<Key, Factory<any>>();

    /**
     * Map lưu trữ singleton instances
     * Mỗi service singleton chỉ được tạo một lần, sau đó reuse
     */
    private singletons = new Map<Key, any>();

    /**
     * Map lưu trữ aliases - shortcut names cho services
     * Ví dụ: alias('mailer', 'email.service') → make('mailer') === make('email.service')
     */
    private aliases = new Map<string | symbol, Key>();

    /**
     * Danh sách các service providers đã đăng ký
     * Được khởi tạo theo thứ tự: register() rồi boot()
     */
    private providers: ServiceProvider[] = [];

    /**
     * Cờ kiểm tra xem container đã được boot hay chưa
     * Tránh gọi boot() nhiều lần
     */
    private booted = false;

    /* =======================
     * Bind (factory) - Tạo instance mới mỗi lần
     * ======================= */
    /**
     * Đăng ký factory cho service
     * Mỗi lần gọi make() sẽ tạo một instance mới (không caching)
     * 
     * @param key - Tên service: string ('db'), symbol, hoặc class (Database)
     * @param value - Factory function hoặc class constructor
     * 
     * @example
     * // Với factory function
     * container.bind('request', (c) => ({
     *   path: window.location.pathname,
     *   method: 'GET'
     * }));
     * 
     * // Với class
     * container.bind('database', Database);
     * 
     * // Lấy - mỗi lần là instance mới
     * const req1 = container.make('request');
     * const req2 = container.make('request');
     * console.log(req1 === req2); // false
     */
    bind<T>(key: Key<T>, value: Binding<T>): void {
        this.bindings.set(key, (c) => {
            const isClass = typeof value === "function" && value.prototype;
            if (isClass) {
                return new (value as new (...args: any[]) => T)();
            }
            return (value as Factory<T>)(c);
        });
    }

    /* =======================
     * Singleton - Tạo một instance duy nhất
     * ======================= */
    /**
     * Đăng ký singleton service - cùng instance được reuse
     * Lần đầu tiên make() sẽ tạo instance, lần sau reuse
     * 
     * @param key - Tên service: string ('store'), symbol, hoặc class (Store)
     * @param value - (Tùy chọn) Factory function, class constructor, hoặc instance sẵn
     *                Nếu không truyền, key phải là class (sẽ auto-instantiate)
     * 
     * @example
     * // Cách 1: Singleton với class
     * container.singleton('store', StoreService);
     * 
     * // Cách 2: Singleton với factory
     * container.singleton('config', (c) => ({
     *   app_name: 'OneJS'
     * }));
     * 
     * // Cách 3: Singleton với instance sẵn
     * const store = new StoreService();
     * container.singleton('store', store);
     * 
     * // Cách 4: Tự động từ class (không truyền tham số 2)
     * container.singleton(StoreService);
     * 
     * // Lấy - luôn là cùng instance
     * const s1 = container.make('store');
     * const s2 = container.make('store');
     * console.log(s1 === s2); // true ✓
     */
    singleton<T>(key: Key<T>, value?: Binding<T> | T): void {
        if (!value) {
            // singleton(MyClass) → tự động tạo instance
            const isClass = typeof key === "function";
            if (isClass) {
                const instance = new (key as new (...args: any[]) => T)();
                this.singletons.set(key, instance);
                return;
            }
            throw new Error("Singleton value required for string key");
        }

        // Kiểm tra nếu value là instance sẵn (không phải function)
        const isInstance =
            value !== null &&
            typeof value === "object" &&
            !(typeof value === "function");

        if (isInstance) {
            // Nếu là instance sẵn, lưu trực tiếp vào singletons
            this.singletons.set(key, value);
            return;
        }

        // Nếu là class hoặc factory, lưu vào bindings
        this.bindings.set(key, (c) => {
            if (!this.singletons.has(key)) {
                const isClass =
                    typeof value === "function" && (value as any).prototype;
                const instance = isClass
                    ? new (value as new (...args: any[]) => T)()
                    : (value as Factory<T>)(c);
                this.singletons.set(key, instance);
            }
            return this.singletons.get(key);
        });
    }

    /* =======================
     * Instance - Đăng ký instance sẵn
     * ======================= */
    /**
     * Đăng ký một instance đã tạo sẵn như singleton
     * Shortcut cho singleton() khi bạn đã có instance
     * 
     * @param key - Tên service
     * @param instance - Instance đã tạo sẵn
     * 
     * @example
     * const config = { api_url: 'https://api.example.com' };
     * container.instance('config', config);
     * 
     * // Lấy ra
     * const cfg = container.make('config');
     * console.log(cfg === config); // true
     */
    instance<T>(key: Key<T>, instance: T): void {
        this.singletons.set(key, instance);
    }

    /* =======================
     * Alias - Tên viết tắt cho services
     * ======================= */
    /**
     * Tạo tên viết tắt (alias) cho service
     * Giúp gọi service với tên ngắn hơn
     * 
     * @param alias - Tên viết tắt (string hoặc symbol)
     * @param key - Tên service gốc
     * 
     * @example
     * container.singleton('email.service', EmailService);
     * container.alias('mailer', 'email.service');
     * 
     * // Cả hai cách đều lấy cùng service
     * const email1 = container.make('email.service');
     * const email2 = container.make('mailer');
     * console.log(email1 === email2); // true
     */
    alias(alias: string | symbol, key: Key): void {
        this.aliases.set(alias, key);
    }

    /* =======================
     * Resolve (make) - Lấy service instance
     * ======================= */
    /**
     * Lấy service instance từ container
     * Shortcut cho resolve()
     * 
     * @param key - Tên service cần lấy
     * @returns Instance của service
     * 
     * @throws Error nếu service không được đăng ký
     * 
     * @example
     * const store = container.make('store');
     * const router = container.make('router');
     */
    make<T>(key: Key<T>): T {
        return this.resolve(key);
    }

    /**
     * Giải quyết (resolve) và lấy service instance
     * - Nếu là singleton đã tạo → reuse
     * - Nếu có binding → gọi factory
     * - Nếu là class → auto-instantiate
     * 
     * @param key - Tên service: string, symbol, hoặc class
     * @returns Instance của service
     * 
     * @throws Error nếu service không tìm thấy
     * 
     * Quy trình tìm kiếm:
     * 1. Kiểm tra alias (nếu key là string/symbol)
     * 2. Kiểm tra singleton đã tạo
     * 3. Kiểm tra binding (factory)
     * 4. Nếu key là class → tự động tạo instance
     * 5. Nếu không → throw error
     * 
     * @example
     * // Lấy singleton
     * const store = container.resolve('store');
     * 
     * // Lấy factory (instance mới)
     * const request = container.resolve('request');
     * 
     * // Lấy từ alias
     * const mail = container.resolve('mailer'); // alias của 'email.service'
     * 
     * // Auto-instantiate class
     * class Database { }
     * const db = container.resolve(Database); // new Database()
     */
    resolve<T>(key: Key<T>): T {
        // Bước 1: Giải quyết alias (nếu có)
        let resolvedKey: Key<T> = key;
        if ((typeof key === "string" || typeof key === "symbol") && this.aliases.has(key)) {
            resolvedKey = this.aliases.get(key)!;
        }

        // Bước 2: Kiểm tra singleton đã tạo
        if (this.singletons.has(resolvedKey)) {
            return this.singletons.get(resolvedKey);
        }

        // Bước 3: Giải quyết từ binding (factory)
        const factory = this.bindings.get(resolvedKey);
        if (factory) {
            return factory(this);
        }

        // Bước 4: Tự động instantiate nếu key là class
        if (typeof resolvedKey === "function") {
            return new (resolvedKey as any)();
        }

        // Bước 5: Không tìm thấy
        throw new Error(
            `Cannot resolve service: ${String(key)}. No binding found.`,
        );
    }

    /* =======================
     * Helpers - Hàm trợ giúp
     * ======================= */
    /**
     * Kiểm tra service có được đăng ký không
     * 
     * @param key - Tên service cần kiểm tra
     * @returns true nếu service đã đăng ký, false nếu chưa
     * 
     * @example
     * if (container.has('store')) {
     *   const store = container.make('store');
     * }
     */
    has(key: Key): boolean {
        const isAliased =
            (typeof key === "string" || typeof key === "symbol") &&
            this.aliases.has(key);
        return (
            this.bindings.has(key) ||
            this.singletons.has(key) ||
            isAliased
        );
    }

    /**
     * Kiểm tra service có được bind/đăng ký không
     * Tương đương với has()
     * 
     * @param key - Tên service cần kiểm tra
     * @returns true nếu đã bound, false nếu chưa
     * 
     * @example
     * if (container.bound('database')) {
     *   const db = container.make('database');
     * }
     */
    bound(key: Key): boolean {
        return this.has(key);
    }

    /* =======================
     * Service Providers - Đăng ký service providers
     * ======================= */
    /**
     * Đăng ký service provider
     * Tự động gọi provider.register(this) ngay lập tức
     * boot() sẽ được gọi sau khi tất cả providers đã register
     * 
     * @param provider - ServiceProvider có register() và boot() methods
     * 
     * @example
     * class DatabaseProvider {
     *   register(container) {
     *     container.singleton('database', Database);
     *   }
     *   
     *   boot(container) {
     *     const db = container.make('database');
     *     console.log('Database booted!');
     *   }
     * }
     * 
     * container.register(new DatabaseProvider());
     * container.boot(); // Gọi boot() của provider
     */
    register(provider: ServiceProvider): void {
        this.providers.push(provider);
        if (typeof provider.register === "function") {
            provider.register(this);
        }
    }

    /**
     * Khởi động (boot) tất cả service providers
     * Gọi boot() method của mỗi provider
     * Chỉ được gọi một lần (bởi flag booted)
     * 
     * Thứ tự:
     * 1. register() được gọi khi register(provider)
     * 2. boot() được gọi khi boot() được gọi
     * 
     * @example
     * container.register(new ServiceProvider1());
     * container.register(new ServiceProvider2());
     * container.boot(); // Gọi boot() của cả 2 providers
     */
    boot(): void {
        if (this.booted) return;

        for (const provider of this.providers) {
            if (typeof provider.boot === "function") {
                provider.boot(this);
            }
        }

        this.booted = true;
    }

    /* =======================
     * Utility - Hàm tiện ích
     * ======================= */
    /**
     * Lấy toàn bộ bindings (factories)
     * Dùng cho debugging, introspection
     * 
     * @returns Map các bindings đã đăng ký
     * 
     * @example
     * const bindings = container.getBindings();
     * console.log(bindings.size); // Số lượng services
     */
    getBindings(): Map<Key, Factory<any>> {
        return this.bindings;
    }

    /**
     * Lấy toàn bộ singleton instances
     * Dùng cho debugging, introspection, testing
     * 
     * @returns Map các singleton instances đã tạo
     * 
     * @example
     * const singletons = container.getSingletons();
     * console.log(singletons.get('store')); // Lấy store instance
     */
    getSingletons(): Map<Key, any> {
        return this.singletons;
    }

    /**
     * Xóa tất cả bindings, singletons, aliases
     * Đặt lại container về trạng thái ban đầu
     * Dùng cho cleanup, testing
     * 
     * ⚠️ CẢNH BÁO: Sẽ xóa tất cả đăng ký, hãy cẩn thận!
     * 
     * @example
     * container.flush();
     * console.log(container.has('store')); // false
     */
    flush(): void {
        this.bindings.clear();
        this.singletons.clear();
        this.aliases.clear();
    }
}
