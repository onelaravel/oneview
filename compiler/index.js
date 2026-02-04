#!/usr/bin/env node

/**
 * OneView Compiler - Node.js Wrapper for Python Compiler
 * Sử dụng Python compiler từ onejs để xử lý .one files
 * 
 * Quy trình:
 * 1. Đọc .one files từ thư mục source
 * 2. Tách các phần: @useState, template, script, style
 * 3. Gọi Python compiler để convert Blade → JavaScript
 * 4. Ghi output vào Blade files và JS View files
 * 
 * Usage: 
 *   onejs-build [context] [--watch]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ConfigManager = require('./config-manager');
const { RegistryGenerator } = require('./registry-generator');

class Compiler {
    constructor() {
        this.watcherInstances = [];
        this.pythonPath = path.resolve(__dirname, 'python/main_compiler.py');
        this.compiledViews = {}; // Track compiled views per context
        this.compiledContexts = []; // Track which contexts were compiled in this run
    }

    /**
     * Main entry point
     */
    async run(args = []) {
        try {
            const { config, projectRoot } = ConfigManager.loadConfig(process.cwd());
            ConfigManager.validateConfig(config);

            const context = args[0] || 'default';
            const watchMode = args.includes('--watch');

            if (context === 'all') {
                await this.buildAllContexts(config, projectRoot);
            } else {
                await this.buildContext(config, projectRoot, context);
            }

            if (watchMode) {
                await this.setupWatcher(config, projectRoot, context === 'all' ? null : context);
            }

        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }

    /**
     * Build single context
     */
    async buildContext(config, projectRoot, contextName) {
        // Reset compiled contexts for single context build
        this.compiledContexts = [];
        
        // Build the context
        await this.buildContextWithoutViewsUpdate(config, projectRoot, contextName);
        
        // Update views.ts with only this context
        await this.updateViewsFile(config, projectRoot, config.paths, this.compiledContexts);
    }

    /**
     * Build single context without updating views.ts
     * Used internally for both single and all-context builds
     */
    async buildContextWithoutViewsUpdate(config, projectRoot, contextName) {
        const contexts = config.contexts || {};
        const paths = config.paths || {};

        // Check if context exists
        if (!contexts[contextName]) {
            console.error(`❌ Context "${contextName}" not found in configuration`);
            process.exit(1);
        }

        const contextConfig = contexts[contextName];
        
        console.log(`\n🔨 Building context: ${contextName}`);
        
        // Clean temp folder for this context BEFORE compiling
        await this.cleanContextTemp(contextConfig, projectRoot, paths, contextName);
        
        // Initialize compiled views tracking for this context
        this.compiledViews[contextName] = [];
        
        // Process all namespace views
        const namespaces = Object.keys(contextConfig.views || {});
        
        if (namespaces.length === 0) {
            console.log('ℹ️  No views namespaces configured\n');
            return;
        }

        let totalFiles = 0;
        const processPromises = [];

        // Process each namespace
        for (const namespace of namespaces) {
            console.log(`\n📁 Namespace: ${namespace}`);
            
            // Get relative paths from config
            const viewsRelPath = contextConfig.views[namespace];
            const bladeRelPath = contextConfig.blade[namespace];
            
            // Resolve với base paths
            const viewsDir = ConfigManager.resolveViewPath(projectRoot, paths, viewsRelPath);
            const bladeBaseDir = ConfigManager.resolveBladePath(projectRoot, paths, bladeRelPath);
            
            console.log(`   Views config: ${viewsRelPath}`);
            console.log(`   Views: ${viewsDir}`);
            console.log(`   Blade config: ${bladeRelPath}`);
            console.log(`   Blade: ${bladeBaseDir}`);

            // Find all .one files in this namespace

            // Find all .one files in this namespace
            const oneFiles = this.findOneFiles(viewsDir);
            totalFiles += oneFiles.length;

            if (oneFiles.length > 0) {
                console.log(`   Found: ${oneFiles.length} files\n`);
                
                // Process all files in this namespace
                for (const oneFilePath of oneFiles) {
                    processPromises.push(
                        this.processOneFile(
                            oneFilePath,
                            viewsDir,
                            namespace,
                            contextName,
                            contextConfig,
                            projectRoot,
                            paths
                        ).catch(error => {
                            const relativePath = path.relative(viewsDir, oneFilePath);
                            console.error(`  ✗ ${namespace}.${relativePath}: ${error.message}`);
                        })
                    );
                }
            }
        }

        if (totalFiles === 0) {
            console.log('ℹ️  No .one files found\n');
            return;
        }

        // Wait for all files to complete
        await Promise.all(processPromises);

        console.log(`\n✅ Successfully compiled ${totalFiles} files for context: ${contextName}`);
        
        // Copy app files to compiled.app
        await this.copyAppFiles(contextConfig, projectRoot, paths, contextName);
        
        // Generate registry after all views compiled
        await this.generateRegistry(contextConfig, projectRoot, paths, contextName);
        
        // Track this context as compiled
        if (!this.compiledContexts.includes(contextName)) {
            this.compiledContexts.push(contextName);
        }
        
        console.log();
    }

    /**
     * Build all contexts
     */
    async buildAllContexts(config, projectRoot) {
        const allContexts = Object.keys(config.contexts || {});
        
        // Filter out 'default' - it's not a real context
        const contexts = allContexts.filter(name => name !== 'default');

        if (contexts.length === 0) {
            console.error('No contexts defined in configuration (excluding default)');
            process.exit(1);
        }

        console.log(`\n🔨 Building ${contexts.length} contexts...\n`);

        // Reset compiled contexts for fresh all-build
        this.compiledContexts = [];

        for (const contextName of contexts) {
            // Build without updating views.ts (will do after all)
            await this.buildContextWithoutViewsUpdate(config, projectRoot, contextName);
        }

        // Update views.ts with ALL compiled contexts
        await this.updateViewsFile(config, projectRoot, config.paths, this.compiledContexts);

        console.log('\n✨ All contexts built successfully\n');
    }

    /**
     * Process một .one file
     * 1. Đọc .one file
     * 2. Tách phần Blade (template) → GHI NGAY (không đợi)
     * 3. Đồng thời gọi Python compiler để generate JavaScript
     * 4. Ghi JS file khi compile xong
     * 
     * Note: Blade và JS là 2 compiler độc lập, không cần đợi nhau
     */
    async processOneFile(oneFilePath, viewsDir, namespace, contextName, contextConfig, projectRoot, paths) {
        const fileContent = fs.readFileSync(oneFilePath, 'utf-8');
        
        // Tách các phần của .one file
        const parts = this.parseOneFile(fileContent);
        
        // Lấy relative path để generate view path và output paths
        const relativePath = path.relative(viewsDir, oneFilePath);
        const fileNameNoExt = path.basename(oneFilePath, '.one');
        const dirPath = path.dirname(relativePath);
        
        // Generate view path: namespace.relative.path
        // Ví dụ: web.pages.home.index
        const viewPath = this.generateViewPath(namespace, relativePath);
        
        // Sinh Blade file path (sử dụng ConfigManager helper)
        const bladeRelPath = contextConfig.blade[namespace];
        if (!bladeRelPath || typeof bladeRelPath !== 'string') {
            throw new Error(`Invalid blade configuration for namespace "${namespace}". Expected string path, got: ${typeof bladeRelPath}`);
        }
        const bladeBaseDir = ConfigManager.resolveBladePath(projectRoot, paths, bladeRelPath);
        const bladePath = path.join(bladeBaseDir, dirPath, `${fileNameNoExt}.blade.php`);
        
        // Sinh JS file path (sử dụng ConfigManager helper cho temp)
        // Giữ nguyên folder structure của .one file
        const compiledViewsRelPath = contextConfig.compiled.views;
        const compiledViewsDir = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledViewsRelPath);
        
        // Check if this context has multiple namespaces (like default context)
        // If so, include namespace in output path to avoid conflicts
        const namespaceCount = Object.keys(contextConfig.views || {}).length;
        const includeNamespaceInPath = namespaceCount > 1;
        
        // JS file path will be determined after detecting TypeScript
        // Ví dụ: pages/home/hero-section.one -> pages/home/hero-section.js (or .ts)
        // With namespace prefix: admin/pages/home/hero-section.js
        const jsRelativeDir = includeNamespaceInPath 
            ? path.join(namespace, path.dirname(relativePath))
            : path.dirname(relativePath);
        
        // Đảm bảo các thư mục output tồn tại (tự động tạo nếu chưa có)
        this.ensureDir(path.dirname(bladePath));
        
        // GHI BLADE FILE NGAY LẬP TỨC (không đợi Python compiler)
        // Blade file = declarations + template (KHÔNG có script/style/link)
        let bladeContent = '';
        
        // Thêm declarations vào đầu file
        if (parts.declarations.length > 0) {
            bladeContent = parts.declarations.join('\n') + '\n\n';
        }
        
        // Thêm template (parts.blade đã loại bỏ script/style khi parse)
        bladeContent += parts.blade;
        
        fs.writeFileSync(bladePath, bladeContent, 'utf-8');
        
        // Compile JS: Gửi FULL content cho Python compiler (bao gồm cả script setup)
        // Python cần <script setup> tag để parse và extract export default
        let jsBladeContent = '';
        
        // Declarations
        if (parts.declarations.length > 0) {
            jsBladeContent = parts.declarations.join('\n') + '\n\n';
        }
        
        // Script setup (nếu có) - Python compiler sẽ parse và xử lý
        const scriptSetupMatch = fileContent.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/i);
        
        // Detect TypeScript from lang attribute (case-insensitive)
        let isTypeScript = false;
        if (scriptSetupMatch) {
            jsBladeContent += scriptSetupMatch[0] + '\n\n';
            
            // Check lang attribute in script setup tag
            const scriptTag = scriptSetupMatch[0];
            const langMatch = scriptTag.match(/lang=["']?([^"'\s>]+)["']?/i);
            if (langMatch) {
                const langValue = langMatch[1].toLowerCase();
                isTypeScript = (langValue === 'ts' || langValue === 'typescript');
            }
        }
        
        // Determine file extension based on language
        const jsFileExt = isTypeScript ? '.ts' : '.js';
        const jsFileName = fileNameNoExt + jsFileExt;
        const jsPath = path.join(compiledViewsDir, jsRelativeDir, jsFileName);
        
        // Ensure JS output directory exists
        this.ensureDir(path.dirname(jsPath));
        
        // Template
        jsBladeContent += parts.blade;
        
        // Compile JS song song (không block Blade)
        // Python compiler xử lý Blade (có declarations) → JavaScript
        try {
            const jsCode = await this.compileBladeToJs(jsBladeContent, viewPath);
            fs.writeFileSync(jsPath, jsCode, 'utf-8');
            console.log(`  ✓ ${viewPath}`);
            
            // Track compiled view for registry generation
            // actualPath: real file path relative to viewsDir (for import calculation)
            // namingPath: path with namespace (for factory name generation)
            const actualPath = path.relative(compiledViewsDir, jsPath);
            
            // namingPath always includes namespace prefix for consistent factory naming
            const namingPath = includeNamespaceInPath 
                ? actualPath  // Multi-namespace: path already has namespace
                : path.join(namespace, actualPath);  // Single-namespace: add namespace
            
            if (this.compiledViews[contextName]) {
                this.compiledViews[contextName].push({
                    namingPath,
                    actualPath
                });
            }
        } catch (error) {
            // Blade đã được ghi, chỉ JS bị lỗi
            console.error(`  ⚠ ${viewPath} → Blade ✓, JS ✗: ${error.message}`);
        }
    }

    /**
     * Generate view path từ namespace và relative path
     * Ví dụ: namespace="web", relativePath="pages/home/Index.one"
     * → "web.pages.home.Index"
     */
    generateViewPath(namespace, relativePath) {
        // Remove .one extension
        const pathWithoutExt = relativePath.replace(/\.one$/, '');
        
        // Convert path separators to dots
        const pathParts = pathWithoutExt.split(path.sep).filter(p => p);
        
        // Combine namespace with path parts
        return [namespace, ...pathParts].join('.');
    }

    /**
     * Generate JS file name từ view path
     * Ví dụ: "web.pages.home.hero-section" → "WebPagesHomeHeroSection.js"
     * Loại bỏ ký tự đặc biệt, convert sang PascalCase
     */
    generateJsFileName(viewPath) {
        // Convert to PascalCase, loại bỏ ký tự đặc biệt
        const className = viewPath
            .split('.')
            .map(part => this.toPascalCase(part))
            .join('');
        
        return `${className}.js`;
    }

    /**
     * Convert string sang PascalCase, loại bỏ ký tự đặc biệt
     * Giữ nguyên internal capitals (useState → UseState)
     * Ví dụ: "hero-section" → "HeroSection"
     *        "user_profile" → "UserProfile"
     *        "useState" → "UseState"
     */
    toPascalCase(str) {
        return str
            // Split by dấu gạch ngang, gạch dưới, space
            .split(/[-_\s]+/)
            // Capitalize chữ cái đầu mỗi từ, giữ nguyên phần còn lại
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            // Join lại
            .join('');
    }

    /**
     * Generate component name từ view path (chỉ lấy tên file cuối cùng)
     * Ví dụ: "web.pages.home.hero-section" → "HeroSection"
     *        "admin.views.templates.todo-list" → "TodoList"
     * Loại bỏ ký tự đặc biệt, convert sang PascalCase
     */
    generateComponentName(viewPath) {
        // Lấy phần cuối cùng của view path (tên file)
        const parts = viewPath.split('.');
        const fileName = parts[parts.length - 1];
        
        // Convert to PascalCase, loại bỏ ký tự đặc biệt
        return this.toPascalCase(fileName);
    }

    /**
     * Generate factory function name từ view path (include full path)
     * Format: PascalCase, context + path + filename
     * Ví dụ: "admin.templates.demo3" → "AdminTemplatesDemo3"
     *        "web.pages.home" → "WebPagesHome"
     */
    generateFactoryFunctionName(viewPath) {
        // Split view path và convert mỗi part to PascalCase
        const parts = viewPath.split('.');
        
        // Convert all parts to PascalCase
        return parts.map(part => this.toPascalCase(part)).join('');
    }

    /**
     * Parse .one file thành các phần
     * .one file format:
     * @useState($var, value)     <- declarations
     * @const($API = '/api')
     * <blade>...</blade>         <- template
     * <script>...</script>        <- script
     * <style>...</style>         <- style
     */
    parseOneFile(content) {
        const parts = {
            declarations: [],
            blade: '',
            script: '',
            style: ''
        };

        // Extract declarations (@useState, @const, @let, @var, @vars)
        // Support nested parentheses like: @let([$x, $y] = useState($data))
        // CRITICAL: Preserve original order from source file
        const declarationTypes = ['useState', 'const', 'let', 'var', 'vars'];
        const foundDeclarations = [];
        
        for (const type of declarationTypes) {
            const regex = new RegExp(`@${type}\\s*\\(`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                // Find matching closing parenthesis
                let depth = 1;
                let i = match.index + match[0].length;
                while (i < content.length && depth > 0) {
                    if (content[i] === '(') depth++;
                    else if (content[i] === ')') depth--;
                    i++;
                }
                if (depth === 0) {
                    const declaration = content.substring(match.index, i);
                    foundDeclarations.push({
                        text: declaration,
                        index: match.index
                    });
                }
            }
        }
        
        // Sort by original position in file to preserve order
        foundDeclarations.sort((a, b) => a.index - b.index);
        parts.declarations = foundDeclarations.map(d => d.text);

        // Extract @await and @fetch directives (these are NOT declarations, but compiler flags)
        const awaitMatch = content.match(/@await(\s|$)/);
        const fetchMatch = content.match(/@fetch\s*\(/);
        
        // Extract blade template
        // Support both <blade> and <template> tags, extract only inner content
        const bladeMatch = content.match(/<blade>([\s\S]*?)<\/blade>/i);
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i);
        
        if (bladeMatch) {
            parts.blade = bladeMatch[1].trim();
            // Prepend @await/@fetch if they exist (they need to be in blade content for Python compiler)
            if (awaitMatch) parts.blade = '@await\n' + parts.blade;
            if (fetchMatch) parts.blade = fetchMatch[0] + '\n' + parts.blade;
        } else if (templateMatch) {
            // Extract content from <template> tag
            parts.blade = templateMatch[1].trim();
            // Prepend @await/@fetch if they exist
            if (awaitMatch) parts.blade = '@await\n' + parts.blade;
            if (fetchMatch) parts.blade = fetchMatch[0] + '\n' + parts.blade;
        } else {
            // Nếu không có <blade> hoặc <template> wrapper, lấy toàn bộ content trừ script và style
            let tempContent = content;
            // Remove script tags
            tempContent = tempContent.replace(/<script[\s\S]*?<\/script>/gi, '');
            // Remove style tags
            tempContent = tempContent.replace(/<style[\s\S]*?<\/style>/gi, '');
            // Remove declarations (using extracted declarations list)
            parts.declarations.forEach(decl => {
                tempContent = tempContent.replace(decl, '');
            });
            parts.blade = tempContent.trim();
        }

        // Extract script
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch) {
            parts.script = scriptMatch[1].trim();
        }

        // Extract style
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) {
            parts.style = styleMatch[1].trim();
        }

        return parts;
    }

    /**
     * Compile Blade code to JavaScript sử dụng Python compiler
     * 
     * TODO: Kiến trúc JS output chưa đúng format mới
     * Cần điều chỉnh theo yêu cầu kiến trúc OneView V2
     * Hiện tại đang dùng Python compiler từ onejs (format cũ)
     */
    compileBladeToJs(bladeCode, viewName) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.pythonPath)) {
                reject(new Error(`Python compiler not found at ${this.pythonPath}`));
                return;
            }

            const os = require('os');
            const tempDir = path.join(os.tmpdir(), 'oneview-compiler');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const timestamp = Date.now() + Math.random().toString(36).substr(2, 9);
            const inputFile = path.join(tempDir, `${timestamp}_input.blade`);
            const outputFile = path.join(tempDir, `${timestamp}_output.js`);

            try {
                // Ghi Blade code vào file tạm
                fs.writeFileSync(inputFile, bladeCode, 'utf-8');

                // Gọi Python cli.py với functionName và viewPath riêng biệt
                // functionName: HeroSection (chỉ tên file, cho export function và class name)
                // viewPath: web.pages.home.hero-section (cho __VIEW_PATH__)
                const cliPath = path.join(path.dirname(this.pythonPath), 'cli.py');
                const functionName = this.generateComponentName(viewName);
                const factoryFunctionName = this.generateFactoryFunctionName(viewName);
                const python = spawn('python3', [cliPath, inputFile, outputFile, functionName, viewName, factoryFunctionName], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: path.dirname(this.pythonPath)
                });

                let stdoutData = '';
                let stderrData = '';

                python.stdout.on('data', (data) => {
                    stdoutData += data.toString();
                });

                python.stderr.on('data', (data) => {
                    stderrData += data.toString();
                });

                python.on('close', (code) => {
                    try {
                        // Cleanup input file
                        if (fs.existsSync(inputFile)) {
                            try {
                                fs.unlinkSync(inputFile);
                            } catch (e) {
                                // ignore
                            }
                        }
                        
                        if (code === 0) {
                            // Python compiler đã thành công, đọc output file
                            if (fs.existsSync(outputFile)) {
                                const jsCode = fs.readFileSync(outputFile, 'utf-8');
                                // Cleanup output file
                                try {
                                    fs.unlinkSync(outputFile);
                                } catch (e) {
                                    // ignore
                                }
                                resolve(jsCode);
                            } else {
                                reject(new Error('Python compiler did not create output file'));
                            }
                        } else {
                            // Cleanup output file if exists
                            if (fs.existsSync(outputFile)) {
                                try {
                                    fs.unlinkSync(outputFile);
                                } catch (e) {
                                    // ignore
                                }
                            }
                            reject(new Error(`Python compiler exited with code ${code}. stderr: ${stderrData}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                python.on('error', (error) => {
                    if (fs.existsSync(inputFile)) {
                        try {
                            fs.unlinkSync(inputFile);
                        } catch (e) {
                            // ignore
                        }
                    }
                    reject(new Error(`Failed to spawn Python: ${error.message}`));
                });

            } catch (error) {
                if (fs.existsSync(inputFile)) {
                    try {
                        fs.unlinkSync(inputFile);
                    } catch (e) {
                        // ignore
                    }
                }
                reject(error);
            }
        });
    }

    /**
     * Ensure directory exists
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Copy directory recursively
     */
    copyDirectory(src, dest) {
        // Ensure destination exists
        this.ensureDir(dest);

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Copy app files to compiled.app
     */
    async copyAppFiles(contextConfig, projectRoot, paths, contextName) {
        const appSources = contextConfig.app || [];
        const compiledAppDest = contextConfig.compiled?.app;

        if (!compiledAppDest) {
            console.log('   ⚠️  No compiled.app configured, skipping app files copy');
            return;
        }

        if (appSources.length === 0) {
            console.log('   ℹ️  No app sources configured, skipping app files copy');
            return;
        }

        console.log(`\n📦 Copying app files for context: ${contextName}`);
        
        // Resolve destination and ensure it exists
        const destDir = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledAppDest);
        
        // Create destination folder if not exists
        if (!fs.existsSync(destDir)) {
            this.ensureDir(destDir);
            console.log(`   📁 Created compiled directory: ${compiledAppDest}`);
        }

        let totalCopied = 0;
        for (const appRelPath of appSources) {
            const srcDir = ConfigManager.resolveAppPath(projectRoot, paths, appRelPath);
            
            // Skip if source doesn't exist - don't fail, just warn
            if (!fs.existsSync(srcDir)) {
                console.log(`   ⚠️  Source not found, skipping: ${appRelPath}`);
                continue;
            }

            console.log(`   📁 ${appRelPath} → ${compiledAppDest}`);
            
            // Copy all contents from src to dest
            const entries = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(srcDir, entry.name);
                const destPath = path.join(destDir, entry.name);

                if (entry.isDirectory()) {
                    this.copyDirectory(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
                totalCopied++;
            }
        }

        if (totalCopied > 0) {
            console.log(`   ✅ Copied ${totalCopied} items to ${compiledAppDest}`);
        } else {
            console.log(`   ℹ️  No files copied (sources not found or empty)`);
        }
    }

    /**
     * Generate registry file for context
     */
    async generateRegistry(contextConfig, projectRoot, paths, contextName) {
        const registryPath = contextConfig.compiled?.registry;
        const viewsPath = contextConfig.compiled?.views;

        if (!registryPath) {
            console.log('   ⚠️  No compiled.registry configured, skipping registry generation');
            return;
        }

        if (!viewsPath) {
            console.log('   ⚠️  No compiled.views configured, cannot generate registry');
            return;
        }

        console.log(`\n📝 Generating registry for context: ${contextName}`);

        // Get compiled views for this context
        const compiledViews = this.compiledViews[contextName] || [];
        
        if (compiledViews.length === 0) {
            console.log('   ℹ️  No compiled views found, skipping registry generation');
            return;
        }

        // Resolve paths
        const registryFullPath = ConfigManager.resolveCompiledPath(projectRoot, paths, registryPath);
        const viewsDir = ConfigManager.resolveCompiledPath(projectRoot, paths, viewsPath);

        // Generate registry using RegistryGenerator
        RegistryGenerator.generate(
            contextName,
            compiledViews,
            registryFullPath,
            viewsDir
        );

        console.log(`   ✅ Registry: ${compiledViews.length} views registered`);
    }

    /**
     * Find all .one files recursively
     */
    findOneFiles(dirPath) {
        const files = [];

        const walkDir = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        // Skip node_modules and hidden directories
                        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                            walkDir(fullPath);
                        }
                    } else if (entry.name.endsWith('.one')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`⚠️  Error reading directory ${dir}: ${error.message}`);
            }
        };

        if (fs.existsSync(dirPath)) {
            walkDir(dirPath);
        } else {
            console.warn(`⚠️  Source directory not found: ${dirPath}`);
        }

        return files.sort();
    }

    /**
     * Invoke Python compiler
     */
    invokePythonCompiler(oneFiles, contextName, config, projectRoot) {
        return new Promise((resolve, reject) => {
            const pythonPath = this.getPythonCompilerPath();

            if (!fs.existsSync(pythonPath)) {
                console.error(`\n❌ Python compiler not found at: ${pythonPath}`);
                console.error('Please ensure onejs library is installed');
                console.error('Visit: https://github.com/oneview-framework/onejs');
                reject(new Error('Python compiler not found'));
                return;
            }

            // Build command: python3 compiler.py --context web --config {...} file1.one file2.one
            const args = [
                pythonPath,
                '--context', contextName,
                '--config', JSON.stringify(config),
                '--root', path.resolve(projectRoot, config.root || 'resources/one')
            ];

            // Add all .one files
            oneFiles.forEach(file => {
                args.push(file);
            });

            // Spawn Python process
            const python = spawn('python3', args, {
                stdio: 'inherit',
                cwd: projectRoot,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });

            python.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Python compiler exited with code ${code}`));
                }
            });

            python.on('error', (error) => {
                reject(new Error(`Failed to start Python compiler: ${error.message}`));
            });
        });
    }

    /**
     * Setup file watcher for development
     */
    async setupWatcher(config, projectRoot, singleContext = null) {
        try {
            const chokidar = require('chokidar');
            const oneFilesDir = path.resolve(projectRoot, config.root || 'resources/one');

            console.log(`\n👀 Watching for changes in ${oneFilesDir}...`);

            const watcher = chokidar.watch(oneFilesDir, {
                ignored: ['node_modules', '.git', '.*'],
                persistent: true,
                awaitWriteFinish: {
                    stabilityThreshold: 100,
                    pollInterval: 100
                }
            });

            let buildTimeout;
            const debounce = (callback) => {
                return () => {
                    clearTimeout(buildTimeout);
                    buildTimeout = setTimeout(callback, 500);
                };
            };

            const rebuildContexts = debounce(async () => {
                try {
                    if (singleContext) {
                        await this.buildContext(config, projectRoot, singleContext);
                    } else {
                        await this.buildAllContexts(config, projectRoot);
                    }
                } catch (error) {
                    console.error(`\n❌ Compilation error: ${error.message}`);
                }
            });

            watcher.on('change', (filePath) => {
                if (filePath.endsWith('.one')) {
                    console.log(`\n📝 Change detected: ${path.relative(oneFilesDir, filePath)}`);
                    rebuildContexts();
                }
            });

            watcher.on('add', (filePath) => {
                if (filePath.endsWith('.one')) {
                    console.log(`\n✨ New file: ${path.relative(oneFilesDir, filePath)}`);
                    rebuildContexts();
                }
            });

            watcher.on('unlink', (filePath) => {
                if (filePath.endsWith('.one')) {
                    console.log(`\n🗑️  File deleted: ${path.relative(oneFilesDir, filePath)}`);
                    // Could optionally trigger rebuild to clean up generated files
                }
            });

            this.watcherInstances.push(watcher);

        } catch (error) {
            console.error(`⚠️  Watch mode setup failed: ${error.message}`);
            if (error.message.includes('Cannot find module')) {
                console.error('Install chokidar: npm install --save-dev chokidar');
            }
        }
    }

    /**
     * Close all watchers
     */
    closeWatchers() {
        for (const watcher of this.watcherInstances) {
            watcher.close();
        }
        this.watcherInstances = [];
    }

    /**
     * Clean temp folder for a context before compiling
     * Removes views, app folders and registry file
     */
    async cleanContextTemp(contextConfig, projectRoot, paths, contextName) {
        const compiledConfig = contextConfig.compiled || {};
        
        console.log(`🧹 Cleaning compiled for context: ${contextName}`);
        
        // Get paths to clean
        const pathsToClean = [];
        
        // Views folder
        if (compiledConfig.views) {
            const viewsPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.views);
            pathsToClean.push({ path: viewsPath, type: 'views' });
        }
        
        // App folder
        if (compiledConfig.app) {
            const appPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.app);
            pathsToClean.push({ path: appPath, type: 'app' });
        }
        
        // Registry file
        if (compiledConfig.registry) {
            const registryPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
            pathsToClean.push({ path: registryPath, type: 'registry' });
        }
        
        // Clean each path
        for (const item of pathsToClean) {
            try {
                if (fs.existsSync(item.path)) {
                    const stat = fs.statSync(item.path);
                    if (stat.isDirectory()) {
                        fs.rmSync(item.path, { recursive: true, force: true });
                        console.log(`   ✓ Removed ${item.type}: ${path.basename(item.path)}/`);
                    } else {
                        fs.unlinkSync(item.path);
                        console.log(`   ✓ Removed ${item.type}: ${path.basename(item.path)}`);
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️  Could not clean ${item.type}: ${error.message}`);
            }
        }
    }

    /**
     * Update views.ts to import context registries
     * @param {Object} config - Full configuration
     * @param {string} projectRoot - Project root path
     * @param {Object} paths - Paths configuration
     * @param {string[]} compiledContexts - List of contexts that were compiled in this run
     */
    async updateViewsFile(config, projectRoot, paths, compiledContexts = []) {
        const contexts = config.contexts || {};
        const compiledBasePath = ConfigManager.resolveCompiledPath(projectRoot, paths, '');
        const viewsFilePath = path.join(compiledBasePath, 'views.ts');
        
        console.log(`\n📝 Updating views.ts`);
        
        // Only include registries from compiled contexts
        const registries = [];
        
        for (const contextName of compiledContexts) {
            const contextConfig = contexts[contextName];
            if (!contextConfig) continue;
            
            const compiledConfig = contextConfig.compiled || {};
            if (!compiledConfig.registry) continue;
            
            const registryPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
            
            // Check if registry exists (could be .ts or .js)
            const registryTsPath = registryPath.replace(/\.(js|ts)$/, '.ts');
            const registryJsPath = registryPath.replace(/\.(js|ts)$/, '.js');
            
            let actualPath = null;
            if (fs.existsSync(registryTsPath)) {
                actualPath = registryTsPath;
            } else if (fs.existsSync(registryJsPath)) {
                actualPath = registryJsPath;
            }
            
            if (actualPath) {
                // Calculate relative path from views.ts to registry
                const relativePath = path.relative(compiledBasePath, actualPath)
                    .replace(/\\/g, '/')
                    .replace(/\.(ts|js)$/, '.js'); // Import .js for runtime
                
                registries.push({
                    contextName,
                    importPath: `./${relativePath}`,
                    varName: `${contextName}Registry`
                });
            }
        }
        
        if (registries.length === 0) {
            console.log('   ℹ️  No registries found, skipping views.ts update');
            return;
        }
        
        // Generate views.ts content
        const imports = registries.map(r => 
            `import ${r.varName} from '${r.importPath}';`
        ).join('\n');
        
        const spreadEntries = registries.map(r => `    ...${r.varName}`).join(',\n');
        
        const content = `/**
 * Auto-generated Views Registry
 * Combines all context registries into a single export
 * Generated at: ${new Date().toISOString()}
 * 
 * This file is auto-updated when compiling any context.
 * Do not edit manually.
 */

${imports}

/**
 * Combined view registry from all contexts
 */
export const views = {
${spreadEntries}
};

export default views;
`;
        
        // Ensure directory exists
        const dir = path.dirname(viewsFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(viewsFilePath, content, 'utf8');
        console.log(`   ✓ Updated views.ts with ${registries.length} context(s): ${registries.map(r => r.contextName).join(', ')}`);
    }
}

// Main execution
if (require.main === module) {
    const compiler = new Compiler();
    const args = process.argv.slice(2);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        compiler.closeWatchers();
        process.exit(0);
    });

    compiler.run(args).catch(error => {
        console.error('Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = Compiler;
