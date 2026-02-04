# OneView Compiler - Yêu Cầu Tạo Prompt cho AI

## Tổng Quan Dự Án

Bạn được giao nhiệm vụ tạo một **Trình Biên Dịch OneView (OneView Compiler)** cho framework OneView - một framework SPA hiện đại dựa trên TypeScript cho Laravel.

Trình biên dịch phải chuyển đổi các file template `.one` thành hai định dạng output khác nhau:
1. **File Blade** - dùng cho Laravel server-side rendering (SSR)
2. **File JavaScript View** - dùng cho building ứng dụng client-side và render phía client

---

## 🎯 Yêu Cầu Cơ Bản

### Định Dạng Input: File `.one`

**Các file .one chứa:**
- [CHI TIẾT: Mô tả cấu trúc định dạng file .one]
- [CHI TIẾT: Tài liệu về cú pháp và các components hợp lệ]
- [CHI TIẾT: Liệt kê các directives và attributes được hỗ trợ]
- [CHI TIẾT: Giải thích cú pháp data binding]
- [CHI TIẾT: Định nghĩa cú pháp conditional và loop]

**Ví dụ file .one:**
```
[VÍ DỤ: Cung cấp một file .one hoàn chỉnh ở đây]
```

---

## 📋 Output Format 1: Blade Files (Laravel SSR)

### Purpose
Generate Laravel Blade template files for server-side rendering with complete view data.

### Requirements

#### 1. File Structure
- **Location**: `[SPECIFY OUTPUT PATH]`
- **Naming Convention**: `[SPECIFY NAMING PATTERN]` 
  - Example: `ViewName.blade.php`
- **Root Folder**: `[SPECIFY ROOT FOLDER NAME]`

#### 2. Blade Components Translation
- Convert `.one` directives to Laravel Blade equivalents
- Map reactive data bindings to Blade `{{ }}` syntax
- Transform conditional statements to `@if`, `@else`, `@endif`
- Convert loops to `@foreach`, `@endforeach`
- Handle component includes as `@component` or `@include`

#### 3. SSR Data Handling
- Accept SSR data passed from Laravel controller
- Properly escape output to prevent XSS
- Support nested data objects
- Handle array iterations with `$loop` variable access

#### 4. CSS and Assets
- [SPEC: Define how CSS/styles are handled in Blade output]
- [SPEC: Specify asset path resolution]
- Maintain style scoping if applicable

#### 5. Special Features
- [SPEC: List Laravel-specific features to support]
- Support for Laravel helpers (e.g., `route()`, `trans()`, `auth()`)
- CSRF token handling
- Authentication state awareness

**Output Example (Blade):**
```blade
[EXAMPLE: Show what compiled Blade output should look like]
```

---

## 📋 Output Format 2: JavaScript View Files (Client-Side)

### Purpose
Generate JavaScript/TypeScript files for client-side application building and rendering without server dependency.

### Requirements

#### 1. File Structure
- **Location**: `[SPECIFY OUTPUT PATH]`
- **Naming Convention**: `[SPECIFY NAMING PATTERN]`
  - Example: `ViewName.view.js` or `ViewName.ts`
- **Root Folder**: `[SPECIFY ROOT FOLDER NAME]`
- **Module Format**: ES6 modules (export default)

#### 2. Class/Component Generation
- Generate a JavaScript class extending OneView's `ViewBase` or similar
- Implement lifecycle methods:
  - `onMount()` - Initialize view
  - `onUnmount()` - Cleanup
  - `onUpdate()` - Handle state changes
- [SPEC: Define additional lifecycle methods if needed]

#### 3. Template Compilation
- Compile `.one` template to JavaScript template function or virtual DOM
- Support reactive data binding with getter/setter
- Implement state management integration
- [SPEC: Define template function signature]

#### 4. Styling in JavaScript
- [SPEC: Define how CSS is handled in JS output]
- Support CSS-in-JS or CSS imports
- Handle component-scoped styles
- [SPEC: Define CSS output format]

#### 5. View Controller Integration
- [SPEC: Define ViewController class generation]
- Auto-detect data requirements from template
- Generate data loading logic
- Support for async data fetching
- [SPEC: Define data loading patterns]

#### 6. Reactive System Integration
- Integrate with OneView's reactive state system
- Implement property observers for two-way binding
- Support for computed properties
- [SPEC: Define computed property syntax]

#### 7. Event Handling
- Compile event listeners from template directives
- Generate event handler stubs
- Support for event delegation
- [SPEC: Define event binding syntax]

**Output Example (JavaScript):**
```typescript
[EXAMPLE: Show what compiled JavaScript view output should look like]
```

---

## 🔄 Compilation Process

### Steps
1. **Parse** `.one` file into AST (Abstract Syntax Tree)
2. **Analyze** template structure and dependencies
3. **Extract** data requirements
4. **Generate Blade** output with SSR support
5. **Generate JavaScript** output with reactive features
6. **Validate** both outputs for correctness
7. **Output** both files with proper formatting

### Parallel Generation
- Both Blade and JavaScript outputs should be generated simultaneously
- Share AST parsing logic between outputs
- Maintain consistency between two formats

---

## 🛠️ Compiler Architecture

### Input
```
.one file → Parser
```

### Processing
```
Parser → AST → [Blade Generator] → Blade file
              └─[JS Generator] → JavaScript file
```

### Output
```
Generated Blade file (.blade.php)
Generated JavaScript file (.view.js or .ts)
Source map (optional)
```

### Configuration
- Input directory for `.one` files
- Output directories for Blade and JavaScript
- [SPEC: Add compiler configuration options]
- Build mode: development/production
- [SPEC: Define other relevant options]

---

## ✨ Advanced Features

### 1. Slot and Named Slots
- [SPEC: Define slot syntax in .one files]
- Proper compilation to Blade slots
- JavaScript slot implementation

### 2. Component Props
- [SPEC: Define prop declaration syntax]
- Type validation (if applicable)
- Default values handling
- Required vs optional props

### 3. Computed Properties
- [SPEC: Define computed syntax]
- Dependency tracking
- Memoization strategy

### 4. Watchers
- [SPEC: Define watcher syntax]
- Deep vs shallow watching
- Immediate execution option

### 5. Directives
- [SPEC: List all custom directives]
- Translation to Blade directives
- JavaScript directive implementation

### 6. Filters and Utilities
- [SPEC: List custom filters]
- String formatting filters
- Data transformation filters
- [SPEC: Add specific filters needed]

### 7. Import/Export
- [SPEC: Define component import syntax]
- [SPEC: Define dynamic imports if needed]
- Relative path resolution
- Circular dependency detection

---

## 🔐 Security Considerations

### For Blade Output
- XSS prevention with `{{ }}` escaping
- CSRF token injection
- Authentication checks
- Authorization guards
- [SPEC: List security requirements]

### For JavaScript Output
- [SPEC: Define client-side security measures]
- Content Security Policy compatibility
- Secure data handling
- [SPEC: Add specific security considerations]

---

## 📊 Error Handling and Validation

### Compile-time Errors
- Invalid `.one` syntax detection
- Missing required properties
- Type mismatches
- Circular dependencies
- Undefined components
- [SPEC: Add other validation rules]

### Error Reporting
- Line and column numbers
- Helpful error messages
- Suggestions for fixes
- Stack traces for debugging

### Warnings
- Unused variables
- Deprecated syntax
- Performance warnings
- [SPEC: List warning types]

---

## 🎨 Code Generation Quality

### Formatting
- Consistent indentation
- Proper line breaks
- Clear variable names
- Readable output code

### Optimization
- Dead code removal
- Unused import elimination
- Template optimization
- [SPEC: Add optimization strategies]

### Comments
- Preserve developer comments
- Generate helpful JSDoc comments
- Mark generated code clearly

---

## 📦 Build Integration

### Watch Mode
- Monitor `.one` files for changes
- Incremental compilation
- Hot reload support
- [SPEC: Define watch behavior]

### Build Scripts
```bash
# Build all .one files
[COMMAND: npm run build:views]

# Watch mode
[COMMAND: npm run build:views:watch]

# Specific context
[COMMAND: npm run build:views:admin]
[COMMAND: npm run build:views:web]
```

### Caching
- [SPEC: Define caching strategy]
- Build artifact caching
- Dependency tracking

---

## 🧪 Testing and Validation

### Unit Tests
- [SPEC: Define test requirements]
- Parser test cases
- Generator test cases
- Integration tests

### Test Cases
- Simple template compilation
- Complex nested structures
- Error scenarios
- Edge cases
- [SPEC: Add specific test scenarios]

---

## 📚 Documentation Requirements

### Generated Code Comments
- Clear JSDoc for JavaScript output
- Inline comments for complex logic
- Type annotations
- Usage examples

### Compiler Documentation
- [SPEC: List documentation needs]
- Syntax guide for .one files
- Configuration documentation
- Troubleshooting guide

---

## 🚀 Performance Requirements

### Compilation Speed
- [SPEC: Define compilation time expectations]
- Batch compilation efficiency
- Memory usage limits

### Output Size
- [SPEC: Define size constraints]
- Tree-shaking optimization
- Bundle size optimization

### Runtime Performance
- [SPEC: Define runtime expectations]
- Template rendering speed
- Memory usage patterns

---

## 🔗 Integration Points

### OneView Framework Integration
```typescript
// Import generated views in application
import HomeView from '@/views/home.view.js';
import AboutView from '@/views/about.view.js';

// Register with router
router.register('home', HomeView);
router.register('about', AboutView);
```

### Laravel Integration
```php
// Use Blade views in Laravel controllers
return view('views.home', $data);
```

### Data Flow
- [SPEC: Define how data flows between Laravel and JavaScript]
- SSR data hydration
- Client-side state initialization

---

## 📝 Configuration File Format

**config.one.json or oneview.config.js:**
```json
{
  "input": "[SPECIFY INPUT PATH]",
  "output": {
    "blade": "[SPECIFY BLADE OUTPUT PATH]",
    "javascript": "[SPECIFY JS OUTPUT PATH]"
  },
  "parser": {
    "strict": true,
    "[OTHER OPTIONS]": "[VALUES]"
  },
  "generator": {
    "format": "es6",
    "[OTHER OPTIONS]": "[VALUES]"
  }
}
```

---

## 📋 Deliverables

1. **Compiler Source Code**
   - Parser implementation
   - Blade generator
   - JavaScript generator
   - CLI interface

2. **Configuration System**
   - [SPEC: Add configuration requirements]

3. **CLI Tool**
   ```bash
   onejs-compiler --config ./config.one.json
   onejs-compiler --watch
   onejs-compiler --debug
   ```

4. **Documentation**
   - [SPEC: List documentation files needed]

5. **Tests**
   - Unit tests
   - Integration tests
   - Example projects

---

## 🎯 Success Criteria

- [ ] All `.one` files compile without errors
- [ ] Generated Blade files render correctly in Laravel
- [ ] Generated JavaScript files integrate with OneView
- [ ] SSR data flows correctly to Blade templates
- [ ] Client-side reactivity works as expected
- [ ] Code quality meets standards
- [ ] Performance targets met
- [ ] Security requirements satisfied
- [ ] Error handling comprehensive
- [ ] Documentation complete

---

## 📝 Notes and Additional Information

[SECTION: Add any additional requirements, constraints, or specific notes about the project]

---

## 🔄 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-03 | Initial requirement draft |
| [VERSION] | [DATE] | [CHANGES] |

---

## 👥 Points of Contact

- **Project Lead**: [NAME/CONTACT]
- **Technical Lead**: [NAME/CONTACT]
- **Documentation**: [NAME/CONTACT]

---

## 📖 References

- [REFERENCE: Link to OneView documentation]
- [REFERENCE: Link to Laravel Blade documentation]
- [REFERENCE: Link to relevant specs]
- [REFERENCE: Add other useful references]

---

**Generated**: 2026-02-03  
**Framework**: OneView V2  
**Purpose**: AI Compiler Generation Specification
