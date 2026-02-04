#!/usr/bin/env node

/**
 * OneView Compiler CLI
 * Part of the OneView library
 * 
 * Usage: one-compile [context|all] [--watch]
 */

const Compiler = require('./index');

async function main() {
    const compiler = new Compiler();
    const args = process.argv.slice(2);
    
    // Show help only when explicitly requested
    if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
OneView Compiler CLI

Usage:
  one-compile [context|all] [--watch]

Contexts:
  <context>        Compile specific context (e.g., web, admin, mobile)
  default          Compile according to default context config (no args = default)
  all              Compile all contexts (except default)

Options:
  --watch          Watch for file changes
  --help           Show help
  --version        Show version

Examples:
  one-compile                  # Compile default context
  one-compile admin            # Compile admin context
  one-compile all              # Compile all contexts
  one-compile web --watch      # Compile web and watch for changes

Configuration:
  Requires one.config.json at project root.
`);
        process.exit(0);
    }

    // Show version
    if (args[0] === '--version' || args[0] === '-v') {
        const pkg = require('./package.json');
        console.log(`OneView Compiler v${pkg.version}`);
        process.exit(0);
    }

    try {
        await compiler.run(args);
    } catch (error) {
        console.error('\n❌ Compilation failed:', error.message);
        process.exit(1);
    }
}

main();

