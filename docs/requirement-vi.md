# OneView Compiler - Prompt Yêu Cầu tạo cho AI

## Tổng Quan Dự Án

Bạn được giao nhiệm vụ tạo một **Trình Biên Dịch OneView (OneView Compiler)** cho framework OneView - một framework SPA hiện đại dựa trên TypeScript cho Laravel.

### Bối Cảnh Sử Dụng

OneView Compiler sẽ được **publish lên npm** dưới dạng npm package. Khi người dùng:
1. Cài đặt package vào project Laravel của họ: `npm install oneview`
2. Họ sẽ có thể chạy các CLI commands từ project của mình:
   ```bash
   npm run one:build      # Build tất cả file .one
   npm run one:watch      # Watch mode
   npm run one:build:admin
   npm run one:build:web
   ```
3. Hoặc gọi trực tiếp nếu cài đặt global:
   ```bash
   onejs-compiler build
   onejs-compiler watch
   ```

### Chức Năng Chính

Trình biên dịch phải chuyển đổi các file template `.one` thành hai định dạng output khác nhau:
1. **File Blade** - dùng cho Laravel server-side rendering (SSR)
2. **File JavaScript View** - dùng cho building ứng dụng client-side và render phía client

---

## 🎯 Yêu Cầu Cơ Bản

### Định Dạng Input: File `.one`

**Các file .one chứa:**
- file .one tiêu chuẩn sẽ có 4 thành phần:
    + phần khai báo: sử dụng các directive như : @let(...), @const(...), @vars(....), @useState(...), @await, ... 
    + phần template: là toàn bộ mã html hoặc các directive vòng lặp, rẽ nhánh, diều kiện, ... của laravel nhằm mục đích hiển thị nội dung hoặc khai báo nội dung như @yield(...) hay @section, @block(...), @useBlock(), ... và tất cả có thể hoặc không được bao bọc bởi 2 cặp thẻ: <blade>...</blade> hoặc <template> ... </template> (không bao gồm các thẻ <script></script> và <style></style>)
    + phần script: script này chấp nhận code trực tiếp hoặc nhúng url (src). với code trực tiếp chỉ chấp nhận một thẻ có thuộc tính setup (<script setup>...</script>) với thuộc tính setup hệ thống sẽ dùng nội dung đó để gán cho view.
       ví dụ:
       ```html
       <script setup>
            import {...} from '...'; // 
            // làm gì đó 
            export default {
                ...
            }
        </script>
        ```
        code trước phần export sẽ được đưa lên đầu file view khi compile
        còn phần object được export sẽ được gán vào class view khi này từ bên trong các hàm được export có thể truy cập dến view instance thông qua `this`
    + phần style cũng giống xử lý script với src là một loại tài nguyên có thể code css trực tiếp hoặc dùng thẻ link với href.

- các component hợp lệ la2 các file .one tôi để trong thư mục /examples
- Tài liệu chi tiết về các directive, data binding, conditional và loop tôi đã viết khó chi tiết tại [/docs/DIRECTIVES-REFERENCE.md](./DIRECTIVES-REFERENCE.md) 
   tài liệu kỹ thuật chưa có nhưng có thư viện khác của tôi đang hoạt động tốt có thể tham khảo code để biết cách các directive hoạt động. thư viện: /Users/doanln/Desktop/2026/Projects/onejs/

**Ví dụ file .one:**
```
@useState($isOpen, false)
<blade>
<div class="demo3-component" @click(toggle())>
    Status: {{ $isOpen ? 'Open' : 'Closed' }}
</div>
</blade>
<script setup>
    export default {
        toggle() {
            setIsOpen(!isOpen);
            console.log(`component ${__VIEW_PATH__}`, this);
            console.log(`toggled to ${isOpen ? 'Open' : 'Closed'}`);
        }
    }
</script>
```

---

## 📋 Output Format 1: File Blade (Laravel SSR)

### Mục Đích
Tạo các file Blade template cho Laravel để render phía server (SSR) với đầy đủ dữ liệu view.

### Yêu Cầu

#### 1. Cấu Trúc File
- **Thư mục**: `[ĐIỀN ĐƯỜNG DẪN OUTPUT]`
- **Quy Tắc Đặt Tên**: `[ĐIỀN MẪU ĐẶT TÊN]` 
  - Ví dụ: `ViewName.blade.php`
- **Thư Mục Root**: `[ĐIỀN TÊN THƯ MỤC ROOT]`

#### 2. Dịch Blade Components
- Chuyển đổi các directives `.one` sang Blade equivalents
- Ánh xạ reactive data bindings sang cú pháp Blade `{{ }}`
- Chuyển conditional statements sang `@if`, `@else`, `@endif`
- Chuyển loops sang `@foreach`, `@endforeach`
- Xử lý component includes như `@component` hoặc `@include`
- **Lưu ý**: Blade output chỉ chứa phần HTML/Blade, không chứa script hoặc style

#### 3. Xử Lý SSR Data
- phần này chù yếu app js không cần xử lý mấy. chỉ đợi server render xong sẽ scan lại để nạp dữ liệu thôi

#### 4. CSS và Assets
- xem thư viện cũ

#### 5. Tính Năng Đặc Biệt
- [CHI TIẾT: Liệt kê các tính năng riêng Laravel cần hỗ trợ]
- Hỗ trợ Laravel helpers (ví dụ: `route()`, `trans()`, `auth()`)
- Xử lý CSRF token
- Nhận thức về authentication state

**Ví Dụ Output (Blade):**
```blade
@useState($isOpen, false)
<div class="demo3-component" @click(toggle())>
    Status: {{ $isOpen ? 'Open' : 'Closed' }}
</div>
```

---

## 📋 Output Format 2: File JavaScript View (Client-Side)

### Mục Đích
Tạo các file JavaScript/TypeScript để building ứng dụng client-side và render mà không phụ thuộc vào server.

### Yêu Cầu

#### 1. Cấu Trúc File
- **Thư mục**: `[ĐIỀN ĐƯỜNG DẪN OUTPUT]`
- **Quy Tắc Đặt Tên**: `[ĐIỀN MẦU ĐẶT TÊN]`
  - Ví dụ: `ViewName.view.js` hoặc `ViewName.ts`
- **Thư Mục Root**: `[ĐIỀN TÊN THƯ MỤC ROOT]`
- **Định Dạng Module**: ES6 modules (export default)

#### 2. Tạo Class/Component
- Tạo một class JavaScript kế thừa từ `View` của OneView hoặc tương tự

#### 3. Biên Dịch Template
- Biên dịch phần `<blade>...</blade>` hoặc `<template>...</template>` thành HTML strings
- Hỗ trợ reactive data binding với state variables
- Implement function để tạo DOM fragments từ HTML templates
- Parse ref attributes để theo dõi DOM elements
- Tính toán sections (@section, @block) để lưu trữ nội dung

#### 4. Styling trong JavaScript
- CSS từ `<style>...</style>` tag được đưa vào file view JS
- Hỗ trợ CSS string hoặc CSS file imports
- Xử lý component-scoped styles (nếu có attribute scoped)
- Có thể append styles vào DOM hoặc export cho build process

#### 5. Xử Lý Script & Lifecycle
- **Phần `<script setup>`**:
  - Import statements được đưa lên đầu file
  - Export default object được merge vào View instance
  - Các methods có thể truy cập `this` để gọi View API
  
- **Lifecycle methods**:
  - `setup()` - Called khi khởi tạo view
  - `onMount()` - Called khi view mounted vào DOM
  - `onUnmount()` - Called trước khi unmount
  - `onUpdate()` - Called khi có state changes

#### 6. Tích Hợp Reactive System
- `useState(value)` - Tạo reactive state
- `updateStateByKey(key, value)` - Update state
- Watchers - Theo dõi state changes
- Computed properties - Auto update khi dependencies thay đổi

#### 7. Xử Lý Sự Kiện
- `@click`, `@change`, `@submit` directives → event handlers
- Event delegation thông qua View engine
- Handler functions được định nghĩa trong script setup

**Ví Dụ Output (JavaScript) - Chi tiết:**

Input `.one` file:
```one
@useState($isOpen, false)
<blade>
<div class="demo2-component" @click($setIsOpen(! $isOpen))>
    Status: {{ $isOpen ? 'Open' : 'Closed' }}
</div>
</blade>

<script setup>
    export default {
        init(){},
        mounted(){}
    }
</script>
```

Output JavaScript:
```javascript
import { View } from 'onelaraveljs';
import { app } from 'onelaraveljs';

// Constants declarations
const __VIEW_PATH__ = 'web.pages.demo2';
const __VIEW_NAMESPACE__ = 'web.pages.';
const __VIEW_TYPE__ = 'view';

// Class definition - extends View base class
class WebPagesDemo2View extends View {
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__);
        this.__ctrl__.setApp(App);
    }

    __setup__(__data__, systemData) {
        // Step 1: Extract system data
        const { __base__, __layout__, __page__, __component__, __template__, 
                __context__, __partial__, __system__, __env = {}, __helper = {} } = systemData;
        
        // Step 2: Get app instances
        const App = app.make("App");
        const Helper = app.make("Helper");
        const __VIEW_ID__ = this.__ctrl__.__SSR_VIEW_ID__ || App.Helper.generateViewId();
        const __STATE__ = this.__ctrl__.states;
        
        // Step 3: Define state helper functions
        const useState = (value) => __STATE__.__useState(value);
        const updateRealState = (state) => __STATE__.__.updateRealState(state);
        const lockUpdateRealState = () => __STATE__.__.lockUpdateRealState();
        const updateStateByKey = (key, state) => __STATE__.__.updateStateByKey(key, state);

        // Step 4: Initialize tracking objects
        const __UPDATE_DATA_TRAIT__ = {};
        const __VARIABLE_LIST__ = [];

        // Step 5: Process @vars declarations (if any)
        // ... variable declarations here ...

        // Step 6: Process @useState declarations
        // Khi .one file khai báo @useState($isOpen, false)
        const set$isOpen = __STATE__.__.register('isOpen');
        let isOpen = null;
        
        const setIsOpen = (state) => {
            isOpen = state;
            set$isOpen(state);
        };
        
        __STATE__.__.setters.setIsOpen = setIsOpen;
        __STATE__.__.setters.isOpen = setIsOpen;
        
        const update$isOpen = (value) => {
            if (__STATE__.__.canUpdateStateByKey) {
                updateStateByKey('isOpen', value);
                isOpen = value;
            }
        };

        // Step 7: Set user defined methods from <script setup>
        this.__ctrl__.setUserDefined({
            init(){},
            mounted(){}
        });

        // Step 8: Configure view and setup render function
        this.__ctrl__.setup({
            superView: null,
            hasSuperView: false,
            viewType: 'view',
            sections: {},
            wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
            hasAwaitData: false,
            hasFetchData: false,
            subscribe: true,
            fetch: null,
            data: __data__,
            viewId: __VIEW_ID__,
            path: __VIEW_PATH__,
            usesVars: false,
            hasSections: false,
            hasSectionPreload: false,
            hasPrerender: false,
            renderLongSections: [],
            renderSections: [],
            prerenderSections: [],
            scripts: [],
            styles: [],
            resources: [],
            
            // Lifecycle callback 1: Called after view construction
            commitConstructorData: function () {
                // Initialize states from default values
                update$isOpen(false);
                // Lock state updates to prevent further updates from constructor
                lockUpdateRealState();
            },
            
            // Lifecycle callback 2: Called when data updates
            updateVariableData: function (data) {
                // Update all variables first
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        // Call updateVariableItemData directly from config
                        if (typeof this.config.updateVariableItemData === 'function') {
                            this.config.updateVariableItemData.call(this, key, data[key]);
                        }
                    }
                }
                // Then update states from data
                update$isOpen(false);
                // Finally lock state updates
                lockUpdateRealState();
            },
            
            // Lifecycle callback 3: Called for each data item update
            updateVariableItemData: function (key, value) {
                this.data[key] = value;
                if (typeof __UPDATE_DATA_TRAIT__[key] === "function") {
                    __UPDATE_DATA_TRAIT__[key](value);
                }
            },
            
            // Pre-render hook (returns content or null)
            prerender: function () {
                return null;
            },
            
            // Main render function - generates HTML output
            render: function () {
                let __outputRenderedContent__ = '';
                try {
                    __outputRenderedContent__ = `
<div class="demo2-component" ${this.__addEventConfig("click", [(event) => setIsOpen(!isOpen)])}>
Status: ${this.__reactive(`rc-${App.Helper.escString(__VIEW_ID__)}-67`, ['isOpen'], (__rc__) => isOpen ? 'Open' : 'Closed', {type: 'output', escapeHTML: true})}
</div>`;
                } catch (e) {
                    __outputRenderedContent__ = this.__showError(e.message);
                    console.warn(e);
                }
                return __outputRenderedContent__;
            }
        });
    }
}

// Export factory function (same name as class without 'View' suffix)
export function WebPagesDemo2(data, systemData) {
    const App = app.make("App");
    const view = new WebPagesDemo2View(App, systemData);
    view.__setup__(data, systemData);
    return view;
}
```

### Chi Tiết Các Phần Chính:

#### 1. **Constants** (Tên và đường dẫn view)
```javascript
const __VIEW_PATH__ = 'web.pages.demo2';        // [context].[folder path].[filename]
const __VIEW_NAMESPACE__ = 'web.pages.';        // Namespace cho organizing views
const __VIEW_TYPE__ = 'view';                    // Loại view (view, component, layout, etc)
```

#### 2. **Constructor**
- Gọi parent `View` class constructor với `__VIEW_PATH__` và `__VIEW_TYPE__`
- Đặt App instance via `setApp(App)`

#### 3. **__setup__() Method** - 8 bước chính:

**Bước 1-4:** Khởi tạo variables và state system
- Extract system data
- Get app instances  
- Define state helpers
- Initialize tracking objects

**Bước 5:** Process @vars declarations (nếu có)

**Bước 6:** Process @useState declarations
- Register state key với framework
- Create setter function
- Create updater function  

**Bước 7:** Set user-defined methods từ `<script setup>`
```javascript
this.__ctrl__.setUserDefined({
    init(){},      // Được gọi khi view khởi tạo
    mounted(){}    // Được gọi khi view mounted vào DOM
});
```

**Bước 8:** Configure view với setup() callback
- Metadata: superView, viewType, sections, etc.
- Data: initial data từ server
- View ID & path
- Lifecycle callbacks: commitConstructorData, updateVariableData, prerender, render
- **render()** - Main function tạo HTML output
  - Dùng `__addEventConfig()` để attach event handlers
  - Dùng `__reactive()` để tạo reactive bindings
  - `escapeHTML: true` để prevent XSS

#### 4. **Export Function**
- Factory function tạo và initialize view instance
- Tên giống class nhưng không có "View" suffix
- Gọi `__setup__()` để hoàn thành khởi tạo
- Return view instance sẵn sàng dùng

---

## 🔄 Quy Trình Biên Dịch

### Các Bước
1. **Parse** file `.one` thành AST (Abstract Syntax Tree)
2. **Phân tích** cấu trúc template và dependencies
3. **Trích xuất** yêu cầu dữ liệu
4. **Tạo output Blade** với hỗ trợ SSR
5. **Tạo output JavaScript** với các tính năng reactive
6. **Validate** cả hai outputs để đảm bảo tính đúng đắn
7. **Output** cả hai files với định dạng đúng

### Tạo Song Song
- Cả output Blade và JavaScript nên được tạo đồng thời
- Chia sẻ AST parsing logic giữa các outputs
- Duy trì tính consistency giữa hai định dạng

---

## 🛠️ Kiến Trúc Trình Biên Dịch

### Input
```
File .one → Parser
```

### Xử Lý
```
Parser → AST → [Blade Generator] → File Blade (.blade.php)
              └─[JS Generator] → File JavaScript (.js / .ts)
```

### Output
```
resources/views/compiled/
├── home.blade.php          # Output Blade (SSR)
├── about.blade.php
└── dashboard.blade.php

resources/js/views/
├── WebHome.js              # Output JavaScript (Client-Side)
├── WebAbout.js
└── WebDashboard.js

resources/js/config/
└── templates.web.js        # Registry file (map view names to JS files)
```

### Cấu Hình

**Người dùng sẽ tạo file cấu hình `build.config.json`:**

```json
{
  "contexts": {
    "web": {
      "sources": [
        "resources/views/_system",
        "resources/views/web"
      ],
      "output": {
        "views": "resources/js/views",
        "register": "resources/js/config/templates.web.js",
        "blade": "resources/views/compiled"
      }
    },
    "admin": {
      "sources": [
        "resources/views/_system",
        "resources/views/admin"
      ],
      "output": {
        "views": "resources/js/views",
        "register": "resources/js/config/templates.admin.js",
        "blade": "resources/views/compiled"
      }
    }
  }
}
```

**CLI sẽ đọc file này và chạy:**
```bash
onejs-build web      # Build web context
onejs-build admin    # Build admin context
onejs-build all      # Build tất cả contexts
```

[CHI TIẾT: Thêm các tùy chọn cấu hình trình biên dịch]

---

## ✨ Tính Năng Nâng Cao

### 1. Slot và Named Slots
- [CHI TIẾT: Định nghĩa cú pháp slot trong file .one]
- Biên dịch đúng cách sang Blade slots
- Implement slot cho JavaScript

### 2. Component Props
- [CHI TIẾT: Định nghĩa cú pháp khai báo prop]
- Kiểm tra kiểu dữ liệu (nếu có)
- Xử lý giá trị mặc định
- Props bắt buộc vs tùy chọn

### 3. Computed Properties
- [CHI TIẾT: Định nghĩa cú pháp computed]
- Theo dõi dependencies
- Chiến lược memoization

### 4. Watchers
- [CHI TIẾT: Định nghĩa cú pháp watcher]
- Deep vs shallow watching
- Tùy chọn execution ngay lập tức

### 5. Directives
- [CHI TIẾT: Liệt kê tất cả custom directives]
- Dịch sang Blade directives
- Implement directive cho JavaScript

### 6. Filters và Utilities
- [CHI TIẾT: Liệt kê custom filters]
- String formatting filters
- Data transformation filters
- [CHI TIẾT: Thêm các filters cụ thể cần thiết]

### 7. Import/Export
- [CHI TIẾT: Định nghĩa cú pháp component import]
- [CHI TIẾT: Định nghĩa dynamic imports nếu cần]
- Phân giải relative path
- Phát hiện circular dependency

---

## 🔐 Xem Xét Bảo Mật

### Cho Output Blade
- Phòng chống XSS bằng escaping `{{ }}`
- Inject CSRF token
- Kiểm tra authentication
- Authorization guards
- [CHI TIẾT: Liệt kê yêu cầu bảo mật]

### Cho Output JavaScript
- [CHI TIẾT: Định nghĩa các biện pháp bảo mật client-side]
- Tương thích Content Security Policy
- Xử lý dữ liệu an toàn
- [CHI TIẾT: Thêm các xem xét bảo mật cụ thể]

---

## 📊 Xử Lý Lỗi và Validation

### Lỗi Compile-time
- Phát hiện cú pháp `.one` không hợp lệ
- Thiếu properties bắt buộc
- Kiểu dữ liệu không khớp
- Circular dependencies
- Undefined components
- [CHI TIẾT: Thêm các quy tắc validation khác]

### Báo Cáo Lỗi
- Số dòng và cột
- Thông báo lỗi hữu ích
- Đề xuất fix
- Stack traces cho debugging

### Cảnh Báo
- Biến không được sử dụng
- Cú pháp deprecated
- Cảnh báo hiệu năng
- [CHI TIẾT: Liệt kê các loại cảnh báo]

---

## 🎨 Chất Lượng Sinh Code

### Định Dạng
- Indentation nhất quán
- Line breaks đúng cách
- Tên biến rõ ràng
- Code output dễ đọc

### Tối Ưu Hóa
- Xóa dead code
- Loại bỏ unused imports
- Tối ưu hóa template
- [CHI TIẾT: Thêm chiến lược tối ưu hóa]

### Comments
- Bảo toàn developer comments
- Sinh JSDoc comments hữu ích
- Đánh dấu code được sinh rõ ràng

---

## 📦 Tích Hợp Build

### Chế Độ Watch
- Theo dõi `.one` files cho changes
- Incremental compilation - Chỉ compile file thay đổi
- Hỗ trợ hot reload - Tự động rebuild khi file thay đổi
- **Cách sử dụng**: Chạy `npm run dev:web` hoặc `onejs-build web --watch`

### Build Scripts

**Khi người dùng cài đặt package vào project Laravel, họ sẽ có thể sử dụng các lệnh sau (thêm vào package.json):**

```json
{
  "scripts": {
    "build": "npm run build:templates && npm run build:webpack",
    "build:dev": "npm run build:templates && npm run build:webpack:dev",
    "build:web": "npm run build:templates:web && BUILD_CONTEXT=web npm run build:webpack",
    "build:admin": "npm run build:templates:admin && BUILD_CONTEXT=admin npm run build:webpack",
    "dev": "node node_modules/oneview/scripts/dev-context.js default",
    "dev:web": "node node_modules/oneview/scripts/dev-context.js web",
    "dev:admin": "node node_modules/oneview/scripts/dev-context.js admin",
    "build:templates": "onejs-build all",
    "build:templates:web": "onejs-build web",
    "build:templates:admin": "onejs-build admin",
    "build:webpack": "webpack --config webpack.config.js",
    "build:webpack:dev": "webpack --config webpack.config.js --mode=development"
  }
}
```

### Caching & Incremental Build

**Trình biên dịch nên:**
- Lưu cache của AST đã parse
- Chỉ rebuild file .one nếu nội dung thực sự thay đổi (file hash comparison)
- Dependency tracking - Rebuild cascading nếu file import thay đổi
- Xóa file output cũ của file đã xóa input
- Timestamp tracking để tránh rebuild không cần thiết

**Hoặc những lệnh đơn giản hơn:**
```bash
npm run build:templates       # Build tất cả template
npm run build:templates:web   # Build web templates
npm run build:templates:admin # Build admin templates

npm run build:web           # Build web context hoàn chỉnh
npm run build:admin         # Build admin context hoàn chỉnh
```

**Hoặc gọi CLI trực tiếp:**
```bash
onejs-build all    # Build tất cả contexts
onejs-build web    # Build web context
onejs-build admin  # Build admin context
```

### Caching
- [CHI TIẾT: Định nghĩa chiến lược caching]
- Build artifact caching
- Dependency tracking

---

## 🧪 Kiểm Thử và Validation

### Unit Tests
- [CHI TIẾT: Định nghĩa yêu cầu kiểm thử]
- Parser test cases
- Generator test cases
- Integration tests

### Test Cases
- Biên dịch template đơn giản
- Cấu trúc lồng nhau phức tạp
- Error scenarios
- Edge cases
- [CHI TIẾT: Thêm các test scenarios cụ thể]

---

## 📚 Yêu Cầu Tài Liệu

### Comments trong Code Sinh
- JSDoc rõ ràng cho JavaScript output
- Inline comments cho logic phức tạp
- Type annotations
- Usage examples

### Tài Liệu Trình Biên Dịch
- [CHI TIẾT: Liệt kê nhu cầu tài liệu]
- Hướng dẫn cú pháp cho file .one
- Tài liệu cấu hình
- Hướng dẫn khắc phục sự cố

---

## 🚀 Yêu Cầu Hiệu Năng

### Tốc Độ Biên Dịch
- [CHI TIẾT: Định nghĩa kỳ vọng thời gian biên dịch]
- Hiệu quả batch compilation
- Giới hạn sử dụng memory

### Kích Thước Output
- [CHI TIẾT: Định nghĩa ràng buộc kích thước]
- Tối ưu tree-shaking
- Tối ưu kích thước bundle

### Hiệu Năng Runtime
- [CHI TIẾT: Định nghĩa kỳ vọng runtime]
- Tốc độ rendering template
- Mẫu sử dụng memory

---

## 🔗 Điểm Tích Hợp

### Workflow Sử Dụng

**1. Cấu trúc Input - Người dùng tạo file .one:**
```
resources/one/app/
├── web/
│   ├── app/
│   │   ├── main.one
│   │   └── layout.one
│   └── views/
│       ├── home.one
│       ├── about.one
│       └── dashboard.one
├── admin/
│   ├── app/
│   │   └── admin-app.one
│   └── views/
│       ├── dashboard.one
│       ├── users.one
│       └── settings.one
└── mobile/
    ├── app/
    │   └── mobile-app.one
    └── views/
        ├── home.one
        └── profile.one
```

**2. Chạy compiler:**
```bash
onejs-build web      # Build web context
onejs-build admin    # Build admin context
onejs-build mobile   # Build mobile context
onejs-build all      # Build tất cả
```

**3. Compiler sinh ra - Intermediate Output (Temp):**
```
resources/one/js/temp/
├── web/
│   ├── views/
│   │   ├── WebHome.js
│   │   ├── WebAbout.js
│   │   └── WebDashboard.js
│   └── registry.js
├── admin/
│   ├── views/
│   │   ├── AdminDashboard.js
│   │   ├── AdminUsers.js
│   │   └── AdminSettings.js
│   └── registry.js
└── mobile/
    ├── views/
    │   ├── MobileHome.js
    │   └── MobileProfile.js
    └── registry.js
```

**4. Output - Blade Files:**
```
resources/views/
├── web/
│   ├── home.blade.php
│   ├── about.blade.php
│   └── dashboard.blade.php
├── admin/
│   ├── dashboard.blade.php
│   ├── users.blade.php
│   └── settings.blade.php
└── mobile/
    ├── home.blade.php
    └── profile.blade.php
```

**5. Final Output - Bundled App:**
```
public/static/one/
├── web/
│   ├── main.bundle.js
│   ├── main.css
│   └── assets/
├── admin/
│   ├── main.bundle.js
│   ├── main.css
│   └── assets/
└── mobile/
    ├── main.bundle.js
    ├── main.css
    └── assets/
```

### Tích Hợp OneView Framework (Client-Side)
```typescript
// Trong JavaScript/TypeScript app
import HomeView from 'resources/js/views/home.view.js';
import AboutView from 'resources/js/views/about.view.js';

// Đăng ký với router
router.register('home', HomeView);
router.register('about', AboutView);
```

### Tích Hợp Laravel (Server-Side)
```php
// Trong Laravel Controller
public function home() {
    return view('compiled.home', [
        'title' => 'Home',
        'user' => auth()->user(),
        'data' => [...]
    ]);
}

// resources/views/compiled/home.blade.php sẽ render HTML
```

**Registry File (resources/js/config/templates.web.js):**
```javascript
// Sinh ra tự động bởi compiler
// Map tên view sang JS module

export const ViewTemplates = {
    'web.home': () => import('../views/WebHome.js'),
    'web.about': () => import('../views/WebAbout.js'),
    'web.dashboard': () => import('../views/WebDashboard.js'),
    // ...
};
```

**App.js (resources/js/app.js):**
```javascript
import { App, viewLoader } from 'oneview';
import { ViewTemplates } from './config/templates.web.js';

// Đăng ký registry views
viewLoader.setRegistry(ViewTemplates);

// Khởi tạo app
if (window.APP_CONFIGS) {
    App.init();
}

export { App };
```

### Lưu Lượng Dữ Liệu
- [CHI TIẾT: Định nghĩa cách dữ liệu chuyển từ Laravel sang JavaScript]
- SSR data hydration - Dữ liệu từ Laravel được truyền vào Blade template
- Khởi tạo state phía client - Dữ liệu có thể được hydrate vào state của JavaScript view

---

## 📝 Định Dạng File Cấu Hình

**Người dùng sẽ tạo file `one.config.json` tại thư mục gốc dự án Laravel:**

```json
{
  "packages": {
    "oneview": "1.0.0"
  },
  "root": "resources/one/app",
  "output": {
    "base": "public/static/one",
    "default": "public/static/one/app",
    "contexts": {
      "admin": "public/static/one/admin",
      "web": "public/static/one/web",
      "mobile": "public/static/one/mobile",
      "default": "public/static/one/app"
    }
  },
  "contexts": {
    "web": {
      "name": "Web",
      "app": ["resources/one/app/web/app"],
      "views": {
        "web": "resources/one/app/web/views"
      },
      "blade": {
        "web": "resources/views/web"
      },
      "temp": {
        "views": "resources/one/js/temp/web/views",
        "registry": "resources/one/js/temp/web/registry.js"
      }
    },
    "admin": {
      "name": "Admin Panel",
      "app": ["resources/one/app/admin/app"],
      "views": {
        "admin": "resources/one/app/admin/views"
      },
      "blade": {
        "admin": "resources/views/admin"
      },
      "temp": {
        "views": "resources/one/js/temp/admin/views",
        "registry": "resources/one/js/temp/admin/registry.js"
      }
    },
    "mobile": {
      "name": "Mobile",
      "app": ["resources/one/app/mobile/app"],
      "views": {
        "mobile": "resources/one/app/mobile/views"
      },
      "blade": {
        "mobile": "resources/views/mobile"
      },
      "temp": {
        "views": "resources/one/js/temp/mobile/views",
        "registry": "resources/one/js/temp/mobile/registry.js"
      }
    },
    "default": {
      "name": "All Contexts",
      "app": [
        "resources/one/app/admin/app",
        "resources/one/app/web/app",
        "resources/one/app/mobile/app"
      ],
      "views": {
        "web": "resources/one/app/web/views",
        "admin": "resources/one/app/admin/views",
        "mobile": "resources/one/app/mobile/views"
      },
      "blade": {
        "web": "resources/views/web",
        "admin": "resources/views/admin",
        "mobile": "resources/views/mobile"
      },
      "temp": {
        "views": "resources/one/js/temp/default/views",
        "registry": "resources/one/js/temp/default/registry.js"
      }
    }
  }
}
```

### Giải Thích Chi Tiết Cấu hình

#### Root Level
- **packages**: Phiên bản thư viện OneView
- **root**: Thư mục gốc chứa tất cả .one files theo context (`resources/one/app`)
- **output.base**: Thư mục base cho final output bundled apps (`public/static/one`)
- **output.default**: Đường dẫn default khi không chỉ định context (`public/static/one/app`)
- **output.contexts**: Object mapping context names → output paths
  - `admin`: `public/static/one/admin`
  - `web`: `public/static/one/web`
  - `mobile`: `public/static/one/mobile`
  - `default`: `public/static/one/app`

#### Cấu Trúc Mỗi Context (web, admin, mobile, default)

**name**: Tên hiển thị của context (dùng cho logs, reports)
- `Web`, `Admin Panel`, `Mobile`, `All Contexts`

**app**: Mảng các thư mục chứa app entry points (.one files)
- Single context (web/admin/mobile): `["resources/one/app/{context}/app"]`
- Default context: mảy tất cả contexts `["resources/one/app/admin/app", "resources/one/app/web/app", ...]`
- Mỗi entry point sinh một bundle riêng

**views**: Mapping từ namespace → đường dẫn input chứa view .one files
- Key: Context namespace (`web`, `admin`, `mobile`)
- Value: Thư mục chứa `.one` view files
- Ví dụ: `{ "web": "resources/one/app/web/views" }`

**blade**: Mapping từ namespace → đường dẫn output Blade files
- Compiler sinh ra `.blade.php` files tương ứng
- Ví dụ: `{ "web": "resources/views/web" }` → `resources/views/web/*.blade.php`

**temp**: Thư mục lưu intermediate output
- **views**: JavaScript files được sinh từ `.one` files
  - Ví dụ: `resources/one/js/temp/web/views/WebHome.js`
- **registry**: File registry.js (ánh xạ view names → JS modules)
  - Ví dụ: `resources/one/js/temp/web/registry.js`

#### ⚠️ QUY TẮC ĐỒng Bộ Thư Mục Blade (CRITICAL - PHẢI TUÂN THỨ)

**Phân biệt:**
- **Context**: Là namespace identifier (key trong config, ví dụ: `web`, `admin`, `mobile`)
  - Dùng để: Nhận dạng context, mapping đường dẫn output
  - Ví dụ từ config: `"views": { "web": "resources/one/app/web/views" }`
- **Thư mục**: Là folder path thực tế (ví dụ: `admin`, `users`, `pages`)
  - Dùng để: Lưu trữ organize files trong project
  - Cấu trúc nested: `pages/`, `admin/users/`, `components/footer/`

**Quy tắc Blade Đồng Bộ:**

> Cấu trúc **thư mục** (folder path) phải ĐỒNG BỘ TUYỆT ĐỐI giữa nguồn (.one) và Blade output

**Nếu file `.one` nằm ở:**
```
resources/one/app/web/views/admin/users/List.one
           └──context──┘ └──folder path──┘
```
one context resources/one/app/web/views

**Thì PHẢI sinh ra Blade:**
```
resources/views/web/admin/users/List.blade.php
      └──context──┘└──folder path──┘
```
blade view context : resources/views/web

**Ví dụ chi tiết: Context `web`**

```
Nguồn (.one files):
  resources/one/app/web/views/
    ├── pages/                     (folder)
    │   ├── Home.one              → Blade: views/web/pages/Home.blade.php
    │   ├── About.one             → Blade: views/web/pages/About.blade.php
    │   └── contact/              (nested folder)
    │       └── Form.one          → Blade: views/web/pages/contact/Form.blade.php
    ├── components/               (folder)
    │   ├── Header.one            → Blade: views/web/components/Header.blade.php
    │   └── footer/               (nested folder)
    │       └── Menu.one          → Blade: views/web/components/footer/Menu.blade.php
    └── admin/                     (folder)
        ├── users/                (nested folder)
        │   └── List.one          → Blade: views/web/admin/users/List.blade.php
        └── posts/                (nested folder)
            └── Edit.one          → Blade: views/web/admin/posts/Edit.blade.php
```

**Quy tắc chi tiết:**
- ✅ **Filename**: Tên file **PHẢI GIỐNG HỆT NHAU** giữa input và output
  - `List.one` → `List.blade.php` (✓ Đúng)
  - `Home.one` → `Home.blade.php` (✓ Đúng)
  - `List.one` → `ListView.blade.php` (✗ SAI - tên file khác nhau)
  - Chỉ thay đổi extension: `.one` → `.blade.php`
- ✅ **Folder path**: Đường dẫn thư mục **PHẢI ĐỒNG BỘ HOÀN TOÀN**
  - Input: `admin/users/List.one` → Output: `admin/users/List.blade.php`
- ✅ **JS**: Không cần match folder structure (tên file JS đã include context + folder path)
- ✅ **Nested folders**: Compiler phải tạo đủ all levels (mkdirp)
- ✅ **Context prefix**: Khác nhau giữa input context (web) và output context từ config

### Quy Trình Build 4 Bước Chi Tiết

```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: KHỞI TẠO - Đọc & Parse Config                       │
├─────────────────────────────────────────────────────────────┤
│ • Tìm one.config.json từ project root                       │
│ • Parse JSON → Object cấu hình                              │
│ • Validate contexts & paths                                 │
│ • Chuẩn bị environment variables cho Python backend         │
│ Kết quả: Config object sẵn sàng                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: DUYỆT & PHÂN TÍCH - Parse .one Files                │
├─────────────────────────────────────────────────────────────┤
│ Cho mỗi context (web, admin, mobile, default):              │
│ 1. Duyệt app directories:                                   │
│    • Tìm tất cả .one files                                  │
│    • Extract: [khai báo, template, script, style]           │
│    • Build dependency graph (import/include)                │
│                                                              │
│ 2. Duyệt view directories:                                  │
│    • Tìm tất cả .one view files                             │
│    • Phân tích dependencies & relationships                 │
│    • Gán view names (ví dụ: WebHome, AdminDashboard)       │
│                                                              │
│ Kết quả: AST (Abstract Syntax Tree) cho tất cả files       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: SINH RA OUTPUT - Generate Blade & JavaScript        │
├─────────────────────────────────────────────────────────────┤
│ A) BLADE COMPILATION:                                       │
│    • Chuyển HTML template → @foreach, @if, @section...     │
│    • Giữ lại {{ }} cho PHP variables                        │
│    • Output: resources/views/{context}/*.blade.php          │
│                                                              │
│ B) JAVASCRIPT COMPILATION:                                  │
│    • Template HTML → JavaScript strings                     │
│    • Script → JavaScript function body                      │
│    • Style → CSS-in-JS hoặc import statement               │
│    • Tạo View.Engine setup object                           │
│    • Output: resources/one/js/temp/{context}/views/*.js    │
│                                                              │
│ C) REGISTRY GENERATION:                                     │
│    • Mapping view_name → JS module path                     │
│    • Format: { WebHome: './views/WebHome.js', ... }         │
│    • Output: resources/one/js/temp/{context}/registry.js   │
│                                                              │
│ Kết quả: Tất cả output files được sinh ra                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Bước 4: BUNDLING & MINIFICATION - Final Optimizations       │
├─────────────────────────────────────────────────────────────┤
│ • Webpack bundle JavaScript files từ temp/views + registry  │
│ • CSS Processing: SCSS → CSS, PostCSS autoprefixer          │
│ • Tree-shaking & code splitting                             │
│ • Minify JavaScript & CSS                                   │
│ • Generate sourcemaps cho debugging                         │
│ • Copy assets (images, fonts, etc)                          │
│                                                              │
│ Output Final: public/static/one/{context}/                 │
│ ├── main.bundle.js (hoặc main.bundle.min.js)              │
│ ├── main.css                                                │
│ ├── vendor.bundle.js (shared dependencies)                  │
│ └── assets/                                                 │
│                                                              │
│ Kết quả: Sẵn sàng deploy, fully optimized                  │
└─────────────────────────────────────────────────────────────┘
```

### CLI - Cách Tìm & Sử Dụng Config

**Khi user chạy:** `npm run one:build web` hoặc `onejs-build web`

**CLI thực hiện:**
1. Bắt đầu từ project root (nơi package.json)
2. Tìm `one.config.json` bằng cách:
   - Kiểm tra `./one.config.json`
   - Nếu không có, tìm `../one.config.json` (up one level)
   - Tiếp tục lên các thư mục cha cho đến khi tìm được hoặc kết thúc
3. Khi tìm được:
   - Set environment variable: `ONEJS_PROJECT_ROOT` = thư mục chứa one.config.json
   - Set `ONEJS_CONTEXT` = context được chỉ định (web, admin, mobile, all)
   - Spawn Python subprocess với các biến môi trường này
4. Python backend:
   - Đọc `$ONEJS_PROJECT_ROOT/one.config.json`
   - Parse & validate cấu hình
   - Thực hiện 4 bước build nêu trên

---

## 📋 Bàn Giao

1. **Source Code Trình Biên Dịch**
   - Parser implementation
   - Blade generator
   - JavaScript generator
   - CLI interface

2. **Hệ Thống Cấu Hình**
   - [CHI TIẾT: Thêm yêu cầu cấu hình]

3. **CLI Tool - Executable Binary**
   
   Trình biên dịch cần cung cấp CLI command `onejs-build` có thể được gọi từ npm scripts hoặc trực tiếp:
   
   **Cách 1: Thông qua npm scripts (khuyến khích)**
   ```bash
   npm run build:templates      # Gọi: onejs-build all
   npm run build:templates:web  # Gọi: onejs-build web
   npm run build:templates:admin# Gọi: onejs-build admin
   ```
   
   **Cách 2: Gọi trực tiếp CLI executable**
   ```bash
   onejs-build all             # Build tất cả contexts từ build.config.json
   onejs-build web             # Build web context
   onejs-build admin           # Build admin context
   onejs-build                 # Chế độ interactive menu (chọn context)
   ```
   
   **Kiến trúc CLI (`bin/onejs-build.js`):**
   ```javascript
   #!/usr/bin/env node
   import { spawn } from 'child_process';
   import path from 'path';
   import { fileURLToPath } from 'url';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   
   // Path tới Python build script
   const scriptPath = path.resolve(__dirname, '../scripts/build.py');
   const args = process.argv.slice(2);
   
   // Spawn Python process
   const pythonProcess = spawn('python3', [scriptPath, ...args], {
       stdio: 'inherit',
       env: {
           ...process.env,
           ONEJS_PROJECT_ROOT: process.cwd(),  // Project directory
           ONEJS_LIB_ROOT: path.resolve(__dirname, '..')  // Library directory
       }
   });
   
   pythonProcess.on('close', (code) => {
       process.exit(code);
   });
   ```
   
   **Python script (scripts/build.py) sẽ:**
   1. Đọc `build.config.json` từ project
   2. Chọn context cần build
   3. Quét file `.one` trong `sources` directory
   4. Biên dịch thành Blade và JavaScript
   5. Sinh Registry file

[CHI TIẾT: Xác định đúng tên executable và CLI structure cuối cùng]

4. **Tài Liệu**
   - [CHI TIẾT: Liệt kê các file tài liệu cần thiết]

5. **Kiểm Thử**
   - Unit tests
   - Integration tests
   - Example projects

---

## 🎯 Tiêu Chí Thành Công

- [ ] Tất cả file `.one` biên dịch mà không lỗi
- [ ] File Blade sinh ra render chính xác trong Laravel
- [ ] File JavaScript sinh ra tích hợp với OneView
- [ ] SSR data chuyển đúng sang Blade templates
- [ ] Client-side reactivity hoạt động như mong đợi
- [ ] Chất lượng code đáp ứng tiêu chuẩn
- [ ] Mục tiêu hiệu năng đạt được
- [ ] Yêu cầu bảo mật thoả mãn
- [ ] Xử lý lỗi toàn diện
- [ ] Tài liệu hoàn thành

---

## 📝 Ghi Chú và Thông Tin Bổ Sung

[PHẦN: Thêm bất kỳ yêu cầu bổ sung, ràng buộc, hoặc ghi chú cụ thể nào về dự án]

---

## 🔄 Lịch Sử Sửa Đổi

| Phiên Bản | Ngày | Thay Đổi |
|-----------|------|---------|
| 1.0 | 2026-02-03 | Dự thảo yêu cầu ban đầu |
| [PHIÊN BẢN] | [NGÀY] | [THAY ĐỔI] |

---

## 👥 Liên Lạc

- **Trưởng Dự Án**: [TÊN/LIÊN LẠC]
- **Trưởng Kỹ Thuật**: [TÊN/LIÊN LẠC]
- **Tài Liệu**: [TÊN/LIÊN LẠC]

---

## 📖 Tài Liệu Tham Khảo

- [THAM KHẢO: Liên kết tới tài liệu OneView]
- [THAM KHẢO: Liên kết tới tài liệu Laravel Blade]
- [THAM KHẢO: Liên kết tới các specs liên quan]
- [THAM KHẢO: Thêm các tài liệu tham khảo hữu ích khác]

---

**Được tạo**: 2026-02-03  
**Framework**: OneView V2  
**Mục Đích**: Đặc Tả Sinh Trình Biên Dịch cho AI
