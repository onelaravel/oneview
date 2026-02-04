/**
 * TemplateDetectorService - Parse and find HTML comment tag pairs
 * V2 TypeScript - Find comment tags with pattern matching and wildcard support
 * 
 * @example
 * const detector = new TemplateDetectorEngine(document.body);
 * const pairs = detector.find('one-template:*');
 * detector.display(pairs);
 */

export interface CommentTag {
    type: 'open' | 'close';
    fullName: string;
    attributes?: Record<string, string>;
    node: Comment;
}

export interface TemplateTagPair {
    fullName: string;
    openTag: Comment;
    closeTag: Comment;
    attributes: Record<string, string>;
    nodes: Node[];
    parent: ParentNode;
}

export class TemplateDetectorEngine {
    private rootElement: Element | Document | null;
    private cachedComments: Comment[] | null = null;

    constructor(rootElement?: Element | Document | null) {
        // Handle Node.js environment (no DOM)
        if (typeof document === 'undefined') {
            this.rootElement = null;
        } else {
            this.rootElement = rootElement || document.body;
        }
    }

    /**
     * Set new root element
     */
    setRootElement(element: Element | Document): this {
        this.rootElement = element;
        this.cachedComments = null;
        return this;
    }

    /**
     * Get all comment nodes from rootElement
     */
    getAllComments(useCache: boolean = true): Comment[] {
        if (useCache && this.cachedComments) {
            return this.cachedComments;
        }

        // Return empty array in Node.js environment
        if (!this.rootElement) {
            return [];
        }

        const comments: Comment[] = [];
        const walker = document.createTreeWalker(
            this.rootElement as any,
            NodeFilter.SHOW_COMMENT,
            null
        );

        let node: Comment | null;
        while ((node = walker.nextNode() as Comment)) {
            comments.push(node);
        }

        if (useCache) {
            this.cachedComments = comments;
        }

        return comments;
    }

    /**
     * Parse a comment node to extract tag information
     * @param commentNode - Comment node to parse
     * @returns Tag info or null if not a valid tag
     */
    parseComment(commentNode: Comment): CommentTag | null {
        const text = commentNode.nodeValue?.trim() || '';

        // Open tag pattern: [prefix:name attribute="..."]
        const openMatch = text.match(/^\[([^\/\]]+?)(?:\s+(.+))?\]$/);
        if (openMatch) {
            const fullName = openMatch[1];
            const attributes: Record<string, string> = {};

            if (openMatch[2]) {
                // Parse attributes like subscribe="userState,items"
                const attrMatch = openMatch[2].match(/(\w+)="([^"]+)"/g);
                if (attrMatch) {
                    attrMatch.forEach(attr => {
                        const [key, ...valueParts] = attr.split('=');
                        const value = valueParts.join('=').replace(/"/g, '');
                        attributes[key] = value;
                    });
                }
            }

            return {
                type: 'open',
                fullName,
                attributes,
                node: commentNode
            };
        }

        // Close tag pattern: [/prefix:name]
        const closeMatch = text.match(/^\[\/([^\/\]]+?)\]$/);
        if (closeMatch) {
            return {
                type: 'close',
                fullName: closeMatch[1],
                node: commentNode
            };
        }

        return null;
    }

    /**
     * Get all siblings between two nodes (same parent)
     * @returns Array of nodes or null if different parents
     */
    getNodesBetween(startNode: Node, endNode: Node): Node[] | null {
        // Check if same parent
        if (startNode.parentNode !== endNode.parentNode) {
            return null;
        }

        const nodes: Node[] = [];
        let current = startNode.nextSibling;

        while (current && current !== endNode) {
            nodes.push(current);
            current = current.nextSibling;
        }

        return nodes;
    }

    /**
     * Convert pattern to regex
     * @example
     * patternToRegex('*:*')              // Match all
     * patternToRegex('one-*')            // Match "one-template", "one-component"
     * patternToRegex('one-template:*')   // Match "one-template:profile", etc.
     */
    patternToRegex(pattern: string): RegExp {
        if (!pattern || pattern === '*' || pattern === '*:*') {
            return /.*/;
        }

        // Escape regex special chars except *
        let regexStr = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
            .replace(/\*/g, '.*');                    // Convert * to .*

        // Add ^ and $ for exact match
        regexStr = '^' + regexStr + '$';

        return new RegExp(regexStr);
    }

    /**
     * Check if name matches pattern
     */
    matchPattern(fullName: string, pattern: string): boolean {
        const regex = this.patternToRegex(pattern);
        return regex.test(fullName);
    }

    /**
     * Find all tag pairs matching pattern
     * @example
     * find('*:*')                   // Find all
     * find('one-template:*')        // Only one-template
     * find('one-template:profile')  // Exact match
     */
    find(pattern: string = '*:*', options: { useCache?: boolean } = {}): TemplateTagPair[] {
        const { useCache = true } = options;
        const comments = this.getAllComments(useCache);
        const parsed = comments
            .map(c => this.parseComment(c))
            .filter((p): p is CommentTag => p !== null);

        const pairs: TemplateTagPair[] = [];
        const stack: (CommentTag & { index: number })[] = [];

        for (let i = 0; i < parsed.length; i++) {
            const current = parsed[i];

            // Check if matches pattern
            if (!this.matchPattern(current.fullName, pattern)) {
                continue;
            }

            if (current.type === 'open') {
                // Push open tag to stack
                stack.push({
                    ...current,
                    index: i
                });
            } else if (current.type === 'close') {
                // Find matching open tag
                let foundIndex = -1;
                for (let j = stack.length - 1; j >= 0; j--) {
                    if (stack[j].fullName === current.fullName) {
                        foundIndex = j;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    const openTag = stack[foundIndex];

                    // Get nodes between
                    const nodesBetween = this.getNodesBetween(openTag.node, current.node);

                    // Only add if same parent
                    if (nodesBetween !== null) {
                        pairs.push({
                            fullName: current.fullName,
                            openTag: openTag.node,
                            closeTag: current.node,
                            attributes: openTag.attributes || {},
                            nodes: nodesBetween,
                            parent: openTag.node.parentNode!
                        });
                    }

                    // Remove from stack
                    stack.splice(foundIndex, 1);
                }
            }
        }

        return pairs;
    }

    /**
     * Find single tag pair matching pattern
     */
    findOne(pattern: string): TemplateTagPair | null {
        const pairs = this.find(pattern);
        return pairs.length > 0 ? pairs[0] : null;
    }

    /**
     * Filter tag pairs by custom condition
     */
    filter(
        filterFn: (pair: TemplateTagPair) => boolean,
        pattern: string = '*:*'
    ): TemplateTagPair[] {
        const pairs = this.find(pattern);
        return pairs.filter(filterFn);
    }

    /**
     * Count tag pairs matching pattern
     */
    count(pattern: string = '*:*'): number {
        return this.find(pattern).length;
    }

    /**
     * Get unique tag names
     */
    getUniqueNames(pattern: string = '*:*'): string[] {
        const pairs = this.find(pattern);
        return [...new Set(pairs.map(p => p.fullName))];
    }

    /**
     * Display search results in console
     */
    display(
        pairsOrPattern: TemplateTagPair[] | string,
        options: {
            showAttributes?: boolean;
            showParent?: boolean;
            showNodes?: boolean;
            maxNodePreview?: number;
        } = {}
    ): void {
        const {
            showAttributes = true,
            showParent = true,
            showNodes = true,
            maxNodePreview = 3
        } = options;

        let pairs: TemplateTagPair[];
        let patternInfo = '';

        // If string, search first
        if (typeof pairsOrPattern === 'string') {
            patternInfo = ` with pattern "${pairsOrPattern}"`;
            pairs = this.find(pairsOrPattern);
        } else {
            pairs = pairsOrPattern;
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`Found ${pairs.length} tag pairs${patternInfo}`);
        console.log(`${'='.repeat(80)}\n`);

        if (pairs.length === 0) {
            console.log('❌ No tag pairs found!');
            return;
        }

        pairs.forEach((pair, index) => {
            console.log(`\n📦 Pair ${index + 1}: [${pair.fullName}]`);
            console.log('-'.repeat(60));

            if (showAttributes) {
                console.log(
                    '📋 Attributes:',
                    Object.keys(pair.attributes).length > 0
                        ? pair.attributes
                        : '(none)'
                );
            }

            if (showParent) {
                const parent = pair.parent as any;
                const className = parent.className ? ` class="${parent.className}"` : '';
                console.log(
                    '🔼 Parent:',
                    parent.tagName.toLowerCase() + className
                );
            }

            if (showNodes) {
                console.log(`📄 Content (${pair.nodes.length} nodes):`);

                const previewNodes = pair.nodes.slice(0, maxNodePreview);
                previewNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as Element;
                        const className = el.className ? ` class="${el.className}"` : '';
                        console.log(
                            `   ├─ <${el.tagName.toLowerCase()}${className}>`
                        );
                    } else if (
                        node.nodeType === Node.TEXT_NODE &&
                        node.nodeValue?.trim()
                    ) {
                        const text = node.nodeValue.trim().substring(0, 50);
                        console.log(
                            `   ├─ Text: "${text}${
                                text.length >= 50 ? '...' : ''
                            }"`
                        );
                    }
                });

                if (pair.nodes.length > maxNodePreview) {
                    console.log(
                        `   └─ ... and ${pair.nodes.length - maxNodePreview} more nodes`
                    );
                }
            }
        });

        console.log(`\n${'='.repeat(80)}\n`);
    }

    /**
     * Clear cache to force re-parsing
     */
    clearCache(): this {
        this.cachedComments = null;
        return this;
    }
}

const engine = new TemplateDetectorEngine();

export default engine;
