/**
 * OneView Compiler - Config Manager
 * Manages one.config.json loading and configuration
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    /**
     * Find and load one.config.json from project root
     * @param {string} startPath - Path to start searching from (usually process.cwd())
     * @returns {object} Configuration object
     */
    static loadConfig(startPath = process.cwd()) {
        let currentPath = startPath;
        const configFileName = 'one.config.json';

        // Search up directory tree
        while (currentPath !== path.dirname(currentPath)) {
            const configPath = path.join(currentPath, configFileName);
            
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    return {
                        config,
                        configPath,
                        projectRoot: currentPath
                    };
                } catch (e) {
                    throw new Error(`Invalid JSON in ${configPath}: ${e.message}`);
                }
            }

            currentPath = path.dirname(currentPath);
        }

        throw new Error('one.config.json not found. Please create it at your project root.');
    }

    /**
     * Validate configuration structure
     */
    static validateConfig(config) {
        // Validate paths (base paths)
        if (!config.paths) {
            throw new Error('Missing required field: paths');
        }
        const pathsRequired = ['resources', 'oneView', 'bladeView', 'compiled'];
        for (const field of pathsRequired) {
            if (!config.paths[field]) {
                throw new Error(`Missing required paths field: ${field}`);
            }
        }

        // Validate contexts
        if (!config.contexts) {
            throw new Error('Missing required field: contexts');
        }

        const contextNames = Object.keys(config.contexts);
        if (contextNames.length === 0) {
            throw new Error('At least one context must be defined');
        }

        // Validate each context (skip 'default' as it's not a real context)
        for (const contextName of contextNames) {
            const context = config.contexts[contextName];
            const contextRequired = ['name', 'app', 'views', 'blade', 'compiled'];
            
            for (const field of contextRequired) {
                if (!context[field]) {
                    throw new Error(`Context "${contextName}" missing required field: ${field}`);
                }
            }
            
            // Validate app is array
            if (!Array.isArray(context.app)) {
                throw new Error(`Context "${contextName}": app must be an array`);
            }
            
            // Validate views is object
            if (typeof context.views !== 'object' || Array.isArray(context.views)) {
                throw new Error(`Context "${contextName}": views must be an object (namespace => path)`);
            }
            
            // Validate blade is object
            if (typeof context.blade !== 'object' || Array.isArray(context.blade)) {
                throw new Error(`Context "${contextName}": blade must be an object (namespace => path)`);
            }
        }

        return true;
    }

    /**
     * Get context configuration
     */
    static getContext(config, contextName) {
        if (!config.contexts[contextName]) {
            throw new Error(`Context "${contextName}" not found in configuration`);
        }
        return config.contexts[contextName];
    }

    /**
     * Resolve absolute path relative to project root
     */
    static resolvePath(projectRoot, relativePath) {
        return path.resolve(projectRoot, relativePath);
    }

    /**
     * Resolve view path: paths.oneView + relative path
     */
    static resolveViewPath(projectRoot, paths, relativePath) {
        const basePath = paths.oneView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve blade path: paths.bladeView + relative path
     */
    static resolveBladePath(projectRoot, paths, relativePath) {
        const basePath = paths.bladeView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve compiled path: paths.compiled + relative path
     */
    static resolveCompiledPath(projectRoot, paths, relativePath) {
        const basePath = paths.compiled;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve app path: paths.oneView + relative path
     */
    static resolveAppPath(projectRoot, paths, relativePath) {
        const basePath = paths.oneView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Get all .one files from context
     */
    static getAllOneFiles(projectRoot, context) {
        const files = [];
        const viewDirs = context.views;

        for (const [namespace, dirPath] of Object.entries(viewDirs)) {
            const fullPath = this.resolvePath(projectRoot, dirPath);
            
            if (!fs.existsSync(fullPath)) {
                console.warn(`View directory not found: ${fullPath}`);
                continue;
            }

            this.walkDir(fullPath, namespace, files);
        }

        return files;
    }

    /**
     * Walk directory recursively to find .one files
     */
    static walkDir(dir, namespace, files = [], prefix = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                this.walkDir(fullPath, namespace, files, relativePath);
            } else if (entry.name.endsWith('.one')) {
                files.push({
                    fullPath,
                    relativePath,
                    namespace,
                    name: entry.name.replace(/\.one$/, '')
                });
            }
        }

        return files;
    }

    /**
     * Generate view path from file info
     * e.g., namespace: 'web', relativePath: 'admin/users/List.one'
     * -> 'web.admin.users.List'
     */
    static generateViewPath(namespace, relativePath) {
        const pathParts = relativePath
            .replace(/\.one$/, '')
            .split('/')
            .map(p => p.charAt(0).toLowerCase() + p.slice(1));

        return [namespace, ...pathParts].join('.');
    }
}

module.exports = ConfigManager;
