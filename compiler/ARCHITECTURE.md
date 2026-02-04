# OneView Compiler - Architecture Guide

## Overview

OneView Compiler sử dụng kiến trúc **Node.js Wrapper + Python Compiler**:

```
Input (.one file)
        ↓
[ NODE.JS WRAPPER ]    ← Parse declarations, extract parts
        ↓
    ┌───┴────────────────┐
    ↓                    ↓
[BLADE OUTPUT]    [PYTHON COMPILER]
(Immediate)       (Parallel)
    ↓                    ↓
.blade.php            .js (View)
                        ↓
                  [APP COPY]
                        ↓
                  temp/app/
```

## Why Python Compiler?

Python compiler từ onejs project (~13,000 lines, 31 modules) xử lý:
- Blade syntax → JavaScript conversion
- Complex directive processing (@await, @fetch, @section, @foreach, etc)
- PHP expression → JavaScript conversion
- State management generation
- Prerender/Render function generation
- Template analysis và optimization

Không viết lại vì:
- Production-proven code
- Complex edge cases đã được xử lý
- Tiết kiệm thời gian development
- Focus vào integration thay vì reimplementation

## 1. Node.js Wrapper (index.js)

### Responsibilities
- ✅ Config management
- ✅ File discovery & iteration
- ✅ .one file parsing (extract parts)
- ✅ Declaration order preservation
- ✅ Blade file generation (immediate write)
- ✅ Python compiler orchestration
- ✅ App files copy to temp
- ✅ Auto-create output directories
- ✅ Parallel processing

### Key Methods

```javascript
parseOneFile(content)
// Tách .one file thành parts
// Giữ NGUYÊN thứ tự declarations
// Returns: { declarations[], blade, script, style }

buildContext(config, projectRoot, contextName)
// Process all namespaces trong context
// Skip 'default' context
// Call processOneFile cho mỗi .one file

processOneFile(oneFilePath, viewsDir, namespace, ...)
// 1. Parse .one file
// 2. Generate view path (namespace.relative.path)
// 3. Write Blade file NGAY (không đợi)
// 4. Call Python compiler (parallel)
// 5. Write JS output

copyAppFiles(contextConfig, projectRoot, paths, contextName)
// Copy app sources → compiled.app
// Auto-create destination folders
// Skip missing sources với warning
```

### Critical Features

**Declaration Order Preservation:**
```javascript
// OLD: Loop qua từng type → wrong order
for (const type of ['useState', 'vars', 'let']) {
  // Find all of this type
}

// NEW: Find all, sort by position
foundDeclarations.sort((a, b) => a.index - b.index);
```

**Auto-Create Folders:**
```javascript
ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
```
## 2. Python Compiler

### Architecture

31 Python modules, ~13,000 lines total:

```
python/
├── main_compiler.py           # Core compiler (1767 lines)
├── cli.py                     # CLI entry point
├── function_generators.py     # Generate prerender/render/init
├── section_handlers.py        # @section, @block processing
├── php_js_converter.py        # PHP → JS conversion
├── template_processor.py      # Template analysis
├── declaration_tracker.py     # Track @useState, @vars, etc
├── event_directive_processor.py # Event handlers
└── ... (23 more modules)
```

### Key Functions

**main_compiler.py:**
```python
compile_blade_to_js(blade_code, view_name, function_name)
# Main entry: Blade → JavaScript
# - Parse declarations (@useState, @vars, @let, @const)
# - Analyze template (sections, directives)
# - Generate wrapper scope (variables, states)
# - Generate prerender & render functions
# - Convert PHP expressions to JS
# - Handle @await, @fetch, @section, @foreach

# CRITICAL FIX: Boolean conversion for has_await
has_await = bool('@await' in blade_code and ...)
# Prevents regex match object leak
```

**function_generators.py:**
```python
generate_prerender_function(...)
# Generate SSR function - RENDER ONLY (no vars)
# Used for initial page load with @await data
# Data comes from $$$DATA$$$ parameter

generate_render_function(...)
# Generate dynamic render function
# Variables declared in WRAPPER SCOPE (not inside function)
# Uses variables from wrapper for rendering
```

**php_js_converter.py:**
```python
php_to_js(php_expression)
# Convert PHP syntax to JavaScript
# - String concatenation: '.' → '+'
# - Variables: $var → var
# - Arrays: ['key' => 'val'] → {key: 'val'}
# - Functions: count($arr) → App.Helper.count(arr)
```

### Output Structure

```javascript
export function ViewName($$$DATA$$$ = {}, systemData = {}) {
    // Wrapper scope - variables & states declared here
    const {App, View, __layout__, ...} = systemData;
    const __VIEW_PATH__ = 'namespace.view.path';
    const __VIEW_ID__ = $$$DATA$$$.__SSR_VIEW_ID__ || App.View.generateViewId();
    
    // Variable declarations (from @vars)
    let {users = [...]} = $$$DATA$$$;
    
    // State declarations (from @useState)
    const set$userList = __STATE__.__.register('userList');
    let userList = null;
    const setUserList = (state) => { ... };
    
    // View setup
    self.setup('view.path', {}, {
        // Config object
        prerender: function() {
            // NO variable declarations
            // Only rendering logic
            // Uses data from $$$DATA$$$
        },
        render: function() {
            // NO variable declarations (in wrapper scope)
            // Uses variables from wrapper
            // Dynamic rendering with state updates
        }
    });
    
    return self;
}
```

### Critical Fixes Implemented

**1. Declaration Order Preservation (Node.js)**
```javascript
// Problem: Loop by type → wrong order
// Solution: Collect all, sort by index
foundDeclarations.sort((a, b) => a.index - b.index);
```

**2. Boolean Conversion (Python)**
```python
# Problem: Regex match object leak
has_await = '@await' in blade_code and re.search(...)
# → Returns match object, not bool

# Solution: Wrap in bool()
has_await = bool('@await' in blade_code and ...)
```

**3. Prerender Variables (Python)**
```python
# Problem: Prerender had variable declarations
# OLD: vars_line + view_id_line + rendering
# NEW: view_id_line + rendering (only)
# Variables come from $$$DATA$$$ parameter
```

**4. PHP String Concatenation (Python)**
```python
# Problem: 'string' .$var. 'string' not converted
# Solution: Detect concatenation before escaping
is_simple_string = (
    starts_with_quote and
    ' .' not in value and '. ' not in value
)
if is_simple_string:
    # Just escape
else:
    php_to_js(value)  # Convert PHP to JS
```
        
        // Sub-step 6: Process @useState declarations
        const set$isOpen = __STATE__.__.register('isOpen');
        let isOpen = null;
        const setIsOpen = (state) => {
            isOpen = state;
            set$isOpen(state);
        };
        __STATE__.__.setters.setIsOpen = setIsOpen;
        const update$isOpen = (value) => {
            if (__STATE__.__.canUpdateStateByKey) {
                updateStateByKey('isOpen', value);
                isOpen = value;
            }
        };
        
        // Sub-step 7: Set user-defined methods
        this.__ctrl__.setUserDefined({
            toggle() {},
            init() {}
        });
        
        // Sub-step 8: Configure view with setup()
        this.__ctrl__.setup({
            superView: null,
            hasSuperView: false,
            viewType: 'view',
            sections: {},
            data: __data__,
            viewId: __VIEW_ID__,
            path: __VIEW_PATH__,
            
            // Lifecycle: Initialization
            commitConstructorData: function () {
                update$isOpen(false);
                lockUpdateRealState();
            },
            
            // Lifecycle: Data update (bulk)
            updateVariableData: function (data) {
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        this.config.updateVariableItemData.call(this, key, data[key]);
                    }
                }
                update$isOpen(false);
                lockUpdateRealState();
            },
            
            // Lifecycle: Data update (individual)
            updateVariableItemData: function (key, value) {
                this.data[key] = value;
                if (typeof __UPDATE_DATA_TRAIT__[key] === "function") {
                    __UPDATE_DATA_TRAIT__[key](value);
                }
            },
            
            // Lifecycle: Pre-render hook
            prerender: function () {
                return null;
            },
            
            // Main: Render function
            render: function () {
                let __outputRenderedContent__ = '';
                try {
                    __outputRenderedContent__ = `
<div class="demo" ${this.__addEventConfig("click", [(event) => setIsOpen(!isOpen)])}>
Status: ${this.__reactive(..., ['isOpen'], (__rc__) => isOpen ? 'Open' : 'Closed')}
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

// Step 4: Factory Function
export function WebPagesAdminUsersList(data, systemData) {
    const App = app.make("App");
    const view = new WebPagesAdminUsersListView(App, systemData);
    view.__setup__(data, systemData);
    return view;
}
```

### State Management Pattern

**For `@useState($isOpen, false)`:**

```javascript
// Register with framework
const set$isOpen = __STATE__.__.register('isOpen');

// Local variable to track current state
let isOpen = null;

// Setter function - updates both local var and framework
const setIsOpen = (state) => {
    isOpen = state;
    set$isOpen(state);
};

// Register setter with framework
__STATE__.__.setters.setIsOpen = setIsOpen;
__STATE__.__.setters.isOpen = setIsOpen;

// Updater for SSR hydration
const update$isOpen = (value) => {
    if (__STATE__.__.canUpdateStateByKey) {
        updateStateByKey('isOpen', value);
        isOpen = value;
    }
};
```

### Key Methods
```javascript
generate(ast, viewPath, fileName)           // AST → JS output
generateClassName(viewPath)                 // 'web.pages.List' → 'WebPagesListView'
generateConstruction(ast, viewPath)         // Constants section
generateSetupMethod(ast, viewPath)          // __setup__() method with 8 steps
generateStateSetup(state)                   // Register each state
generateSetupConfig(ast, viewPath, states)  // setup() call
generateRenderFunction(ast)                 // render() callback
generateExportFunction(exportName, className) // Export factory function
```

## 4. Config Manager (config-manager.js)

### Chức Năng
- Tìm `one.config.json` từ project root
- Validate cấu hình
- Resolve paths tương ứng
- Scan `.one` files theo context

### Config Structure
```json
{
  "root": "resources/one/app",           // Base directory for all .one files
  "output": {
    "base": "public/static/one",         // Base for bundled output
    "default": "public/static/one/app",  // Default context output
    "contexts": {
      "web": "public/static/one/web",
      "admin": "public/static/one/admin"
    }
  },
  "contexts": {
    "web": {
      "name": "Web",
      "app": ["resources/one/app/web/app"],        // Entry points
      "views": {
        "web": "resources/one/app/web/views"       // Input directories
      },
      "blade": {
        "web": "resources/views/web"               // Blade output
      },
      "temp": {
        "views": "resources/one/js/temp/web/views", // JS output
        "registry": "resources/one/js/temp/web/registry.js"
      }
    }
  }
}
```

### Key Methods
```javascript
loadConfig(startPath)           // Find & load one.config.json
validateConfig(config)          // Validate structure
getContext(config, name)        // Get context config
resolvePath(projectRoot, rel)   // Resolve absolute path
getAllOneFiles(projectRoot, ctx) // Find all .one files in context
generateViewPath(namespace, rel) // 'web', 'admin/users/List.one' → 'web.admin.users.List'
```

## 5. CLI & Compiler (index.js + cli.js)

### Chức Năng
- Parse command-line arguments
- Tích hợp 4 modules trên
- Build single/all contexts
- Support watch mode
- Generate registry.js

### Usage
```bash
onejs-build web              # Build web context
onejs-build all --watch      # Build all, watch for changes
onejs-build admin --watch    # Build admin with live reload
```

### Build Process
```
1. Load & validate one.config.json
2. For each context:
   - Scan .one files
   - For each file:
     * Parse → AST
     * Generate Blade
     * Generate JS View class
     * Write both outputs
   - Generate registry.js
3. (Optional) Watch for file changes
```

### Incremental Rebuild
- File hash comparison
- Only rebuild changed files
- Dependency tracking
## Data Flow Example

**Input:** `resources/one/web/views/pages/home.one`

```
┌─ NODE.JS WRAPPER reads file
│
├─ parseOneFile() extracts parts:
│  ├─ declarations: [@vars(...), @useState(...), @let(...)]
│  ├─ blade: '<div>...</div>'
│  ├─ script: 'export default { ... }'
│  └─ style: '.demo { ... }'
│
├─ IMMEDIATE: Write Blade file
│  └─ resources/views/web/pages/home.blade.php
│
├─ PARALLEL: Call Python compiler
│  ├─ python3 cli.py input.blade output.js "WebPagesHome" "web.pages.home"
│  ├─ Parse declarations, analyze template
│  ├─ Generate wrapper scope (variables, states)
│  ├─ Generate prerender & render functions
│  └─ Convert PHP expressions to JS
│
├─ Write JS output
│  └─ resources/js/temp/web/views/WebPagesHome.js
│
└─ Copy app files
   └─ resources/one/web/app/* → resources/js/temp/web/app/*
```

## Path Resolution Example

**Config:**
```json
{
  "paths": {
    "oneView": "resources/one",
    "bladeView": "resources/views",
    "temp": "resources/js/temp"
  },
  "contexts": {
    "web": {
      "views": {"web": "web/views"},
      "blade": {"web": "web"},
      "temp": {"views": "web/views", "app": "web/app"}
    }
  }
}
```

**Resolution:**
```
Input:  resources/one/web/views/pages/home.one
        └─ oneView ─┘ └─ views[web] ─┘

Blade:  resources/views/web/pages/home.blade.php
        └─ bladeView ┘ └ blade[web] ┘

JS:     resources/js/temp/web/views/WebPagesHome.js
        └──── temp ────┘ └ compiled.views ┘

App:    resources/js/temp/web/app/helpers/api.js
        └──── temp ────┘ └ compiled.app ─┘
```

## Key Features

### ✅ Auto-Create Folders
```javascript
// Tự động tạo tất cả folders cần thiết
ensureDir(path.dirname(bladePath));  // Blade output folder
ensureDir(path.dirname(jsPath));      // JS temp folder
ensureDir(tempAppDir);                // App copy destination
```

### ✅ Declaration Order Preservation
```javascript
// Giữ NGUYÊN thứ tự từ file nguồn
@vars($users = [...])      // Line 1
@useState($list, $users)   // Line 5 - depends on $users
// → Output giống thứ tự input
```

### ✅ Missing Source Handling
```javascript
// Skip gracefully nếu source không tồn tại
if (!fs.existsSync(srcDir)) {
    console.log('⚠️  Source not found, skipping: ...');
    continue;
}
```

### ✅ Parallel Processing
```javascript
// Blade và JS compile song song
const processPromises = [];
for (const file of files) {
    processPromises.push(processOneFile(file));
}
await Promise.all(processPromises);
```

### 4. View Path Naming
- Input: `web.admin.users.List`
- Class: `WebAdminUsersListView`
- Export: `WebAdminUsersList` (without "View")

### 5. Registry Pattern
```javascript
export const ViewRegistry = {
    'web.admin.users.List': () => import('./views/WebAdminUsersList.js'),
    'web.pages.Home': () => import('./views/WebPagesHome.js'),
    // ... all views
};
```

## Extension Points

### Add New Directive
1. Parser: Add pattern to `extractDirectives()`
2. Blade Generator: Add conversion rule in `processTemplate()`
3. JS Generator: Handle in `generateRenderFunction()`

### Add New Lifecycle Hook
1. Parser: Extract from script section
2. JS Generator: Add to setup() config object
3. Compiler: Call hook at appropriate time

### Add New Declaration Type
1. Parser: Add pattern to `parseDeclarations()`
2. JS Generator: Add handling in `generateSetupMethod()`

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2026-02-03
