/**
 * TemplateEngine - Template management and rendering
 * V2 TypeScript - Clean template handling
 */

export class TemplateEngine {
    private templates: Record<string, Function> = {};

    constructor(_App?: any) {
        // _App available for future use (e.g., template context)
    }

    /**
     * Set templates registry
     */
    setTemplates(templates: Record<string, Function>): void {
        this.templates = templates;
    }

    /**
     * Render a template by name
     */
    render(name: string, context: any = {}, data: any = null): string {
        if (!this.templates[name]) {
            console.warn(`[TemplateEngine] Template '${name}' not found`);
            return '';
        }

        try {
            const templateFn = this.templates[name];
            return templateFn(context, data);
        } catch (error: any) {
            console.error(`[TemplateEngine] Error rendering template '${name}':`, error);
            return `<div class="template-error" style="color: red; padding: 10px; border: 1px solid red;">
                Template '${name}' error: ${error.message}
            </div>`;
        }
    }

    /**
     * Check if template exists
     */
    hasTemplate(name: string): boolean {
        return !!this.templates[name];
    }

    /**
     * Get template function
     */
    getTemplate(name: string): Function | null {
        return this.templates[name] || null;
    }

    /**
     * Register a template
     */
    registerTemplate(name: string, templateFn: Function): void {
        this.templates[name] = templateFn;
    }

    /**
     * Register multiple templates
     */
    registerTemplates(templates: Record<string, Function>): void {
        this.templates = { ...this.templates, ...templates };
    }

    /**
     * Remove template
     */
    removeTemplate(name: string): void {
        delete this.templates[name];
    }

    /**
     * Clear all templates
     */
    clearTemplates(): void {
        this.templates = {};
    }

    /**
     * Get all template names
     */
    getTemplateNames(): string[] {
        return Object.keys(this.templates);
    }

    /**
     * Get all templates
     */
    getAll(): Record<string, Function> {
        return { ...this.templates };
    }
}

export default TemplateEngine;
