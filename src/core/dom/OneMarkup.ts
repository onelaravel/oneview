/**
 * OneMarkup - V2 TypeScript
 * Custom markup element parser and manager (e.g., [one:view], [one:block])
 * Delegates to TemplateDetectorService for parsing
 */

import {TemplateDetectorEngine} from './TemplateDetectorEngine.js';

export interface MarkupAttributes {
    [key: string]: string;
}

export interface MarkupQueryOptions {
    multiple?: boolean;
    recursive?: boolean;
}

export interface MarkupQuery {
    pattern: string;
    attributes?: MarkupAttributes;
    options?: MarkupQueryOptions;
    index?: number;
}

/**
 * OneMarkup Model - Represents a custom markup element
 */
export class OneMarkupModel {
    private __openTag: Comment | Element;
    private __closeTag: Comment | Element;
    private __attributes: MarkupAttributes;
    private __nodes: Array<Node>;
    private __definedAttributes: string[];
    private __tagName: string;
    private __fullName: string;

    constructor(
        fullName: string,
        openTag: Comment | Element,
        closeTag: Comment | Element,
        attributes: MarkupAttributes = {},
        nodes: Array<Node> = []
    ) {
        this.__fullName = fullName;
        this.__tagName = fullName.split(':')[1] || fullName;
        this.__openTag = openTag;
        this.__closeTag = closeTag;
        this.__attributes = attributes;
        this.__nodes = nodes;
        this.__definedAttributes = [];
        
        this.__defineAttributes(Object.keys(attributes));
    }

    /**
     * Update model data
     */
    __update(
        fullName: string,
        openTag: Comment | Element,
        closeTag: Comment | Element,
        attributes: MarkupAttributes = {},
        nodes: Array<Node> = []
    ): this {
        this.__fullName = fullName;
        this.__tagName = fullName.split(':')[1] || fullName;
        this.__openTag = openTag;
        this.__closeTag = closeTag;
        this.__attributes = attributes;
        this.__nodes = nodes;
        this.__defineAttributes(Object.keys(attributes));
        return this;
    }

    /**
     * Define dynamic property accessors for attributes
     * @private
     */
    private __defineAttributes(attributeKeys: string[]): this {
        attributeKeys.forEach(key => this.__defineAttribute(key));
        return this;
    }

    /**
     * Define single attribute accessor
     * @private
     */
    private __defineAttribute(name: string): this {
        if (this.__definedAttributes.includes(name)) {
            return this;
        }

        this.__definedAttributes.push(name);
        Object.defineProperty(this, name, {
            get: () => this.__attributes[name],
            set: (value: string) => {
                this.__attributes[name] = value;
            },
            enumerable: true,
            configurable: true,
        });

        return this;
    }

    /**
     * Get tag name (without namespace)
     */
    get tagName(): string {
        return this.__tagName;
    }

    /**
     * Get full name (with namespace)
     */
    get fullName(): string {
        return this.__fullName;
    }

    /**
     * Get open tag node
     */
    get openTag(): Comment | Element {
        return this.__openTag;
    }

    /**
     * Get close tag node
     */
    get closeTag(): Comment | Element {
        return this.__closeTag;
    }

    /**
     * Get all attributes
     */
    get attributes(): MarkupAttributes {
        return this.__attributes;
    }

    /**
     * Get nodes between open and close tags
     */
    get nodes(): Array<Node> {
        return this.__nodes;
    }

    /**
     * Get outer HTML including open/close tags and content
     */
    get outerHTML(): string {
        let html = '';
        html += this.__getNodeHTML(this.__openTag);

        let currentNode = this.__openTag.nextSibling;
        while (currentNode && currentNode !== this.__closeTag) {
            html += this.__getNodeHTML(currentNode);
            currentNode = currentNode.nextSibling;
        }

        html += this.__getNodeHTML(this.__closeTag);
        return html;
    }

    /**
     * Get HTML representation of a node
     * @private
     */
    private __getNodeHTML(node: Node | null): string {
        if (!node) return '';

        switch (node.nodeType) {
            case Node.COMMENT_NODE:
                return `<!--${(node as Comment).nodeValue}-->`;
            case Node.TEXT_NODE:
                return node.textContent || '';
            case Node.ELEMENT_NODE:
                return (node as Element).outerHTML || '';
            default:
                return node.textContent || '';
        }
    }

    /**
     * Get attribute value
     */
    getAttribute(name: string): string | undefined {
        return this.__attributes[name];
    }

    /**
     * Set attribute value
     */
    setAttribute(name: string, value: string): this {
        this.__defineAttribute(name);
        this.__attributes[name] = value;
        return this;
    }

    /**
     * Check if model matches query attributes
     * @private
     */
    __match(attributes: Record<string, any>): boolean {
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'tagName') {
                if (this.__tagName !== value) return false;
            } else if (key === 'openTag') {
                if (this.__openTag !== value) return false;
            } else if (key === 'closeTag') {
                if (this.__closeTag !== value) return false;
            } else if (key === 'attributes' || key === 'nodes') {
                continue;
            } else if (this.__attributes[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Scan and update nodes between open/close tags
     */
    __scan(): Array<Node> {
        const nodes: Array<Node> = [];
        let currentNode = this.__openTag.nextSibling;

        while (currentNode && currentNode !== this.__closeTag) {
            nodes.push(currentNode);
            currentNode = currentNode.nextSibling;
        }

        this.__nodes = nodes;
        return this.__nodes;
    }

    /**
     * Sync with DOM (re-query and update)
     */
    __sync(): boolean {
        // Placeholder for sync logic
        // In V1, this uses oms.find() which requires OneMarkupService
        return false;
    }

    /**
     * Update nodes array
     */
    updateNodes(nodes: Array<Node>): this {
        this.__nodes = nodes;
        return this;
    }

    /**
     * Replace content between open and close tags
     */
    replaceContent(content: string | Node | Array<Node>): this {
        // Remove existing nodes
        this.__nodes.forEach(node => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
        this.__nodes = [];

        // Insert new content
        const closeTag = this.__closeTag;
        if (typeof content === 'string') {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            const fragment = document.createDocumentFragment();
            Array.from(temp.childNodes).forEach(node => fragment.appendChild(node));
            
            if (closeTag.parentNode) {
                closeTag.parentNode.insertBefore(fragment, closeTag);
            }
        } else if (content instanceof Node) {
            if (closeTag.parentNode) {
                closeTag.parentNode.insertBefore(content, closeTag);
            }
        } else if (Array.isArray(content)) {
            const fragment = document.createDocumentFragment();
            content.forEach(node => fragment.appendChild(node));
            if (closeTag.parentNode) {
                closeTag.parentNode.insertBefore(fragment, closeTag);
            }
        }

        // Rescan nodes
        this.__scan();
        return this;
    }

    /**
     * Remove element and its content from DOM
     */
    remove(): void {
        // Remove all nodes
        this.__nodes.forEach(node => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });

        // Remove open and close tags
        if (this.__openTag.parentNode) {
            this.__openTag.parentNode.removeChild(this.__openTag);
        }
        if (this.__closeTag.parentNode) {
            this.__closeTag.parentNode.removeChild(this.__closeTag);
        }

        this.__nodes = [];
    }
}

/**
 * OneMarkup Service - Manages custom markup elements
 * Uses TemplateDetectorEngine for actual parsing
 */
export class OneMarkupService {
    private models: Map<string, OneMarkupModel> = new Map();
    private detector: TemplateDetectorEngine;

    constructor(rootElement?: Element | Document | null) {
        this.detector = new TemplateDetectorEngine(rootElement || document.body);
    }

    /**
     * Find markup elements by pattern/attributes
     * Delegates to TemplateDetectorEngine
     * 
     * @param pattern - Pattern like 'one:view' or 'one:view:profile'
     * @param attributes - Attributes to match
     * @param options - Query options (multiple, recursive)
     * @param index - Index for single result
     * @param _sync - Whether to rescan first (not used, detector handles caching)
     * @returns Single model, array of models, or null
     */
    find(
        pattern: string,
        attributes?: MarkupAttributes,
        options?: MarkupQueryOptions,
        index?: number,
        _sync?: boolean
    ): OneMarkupModel | OneMarkupModel[] | null {
        const multiple = options?.multiple ?? false;
        
        // Use detector to find all pairs matching pattern
        const pairs = this.detector.find(`one:${pattern}`, { useCache: !_sync });
        
        // Filter by attributes if provided
        let results = pairs;
        if (attributes) {
            results = pairs.filter(pair => {
                for (const [key, value] of Object.entries(attributes)) {
                    if (pair.attributes[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        
        // Convert pairs to models
        const models = results.map(pair => 
            new OneMarkupModel(
                pair.fullName,
                pair.openTag as Comment | Element,
                pair.closeTag as Comment | Element,
                pair.attributes,
                pair.nodes
            )
        );
        
        // Store in models map
        models.forEach(model => this.models.set(model.fullName, model));
        
        // Return based on options
        if (models.length === 0) {
            return null;
        }
        
        if (index !== undefined && !multiple) {
            return models[index] || null;
        }
        
        if (multiple) {
            return models;
        }
        
        // Default: return first result
        return models[0];
    }

    /**
     * Parse document for custom markup elements
     * Scans container for all custom markup patterns (one:view, one:block, etc)
     * 
     * @param container - Container to scan (default: document.body)
     * @returns Array of found OneMarkupModel elements
     */
    parse(container: HTMLElement = document.body): OneMarkupModel[] {
        // Set root element for detector
        this.detector.setRootElement(container);
        
        // Find all 'one:*' patterns
        const pairs = this.detector.find('one:*', { useCache: false });
        
        // Convert to models
        const models = pairs.map(pair => 
            new OneMarkupModel(
                pair.fullName,
                pair.openTag as Comment | Element,
                pair.closeTag as Comment | Element,
                pair.attributes,
                pair.nodes
            )
        );
        
        // Store in models map
        models.forEach(model => this.models.set(model.fullName, model));
        
        return models;
    }

    /**
     * Register markup model
     */
    register(key: string, model: OneMarkupModel): void {
        this.models.set(key, model);
    }

    /**
     * Get registered model
     */
    get(key: string): OneMarkupModel | undefined {
        return this.models.get(key);
    }

    /**
     * Clear all models
     */
    clear(): void {
        this.models.clear();
    }
}

// Singleton instance
export const OneMarkup = new OneMarkupService();
export default OneMarkup;
