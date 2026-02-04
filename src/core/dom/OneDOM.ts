/**
 * OneDOM - DOM manipulation utilities
 * V2 TypeScript - Clean and type-safe DOM operations
 */

export class OneDOM {
    /**
     * Validate that element is a valid DOM element
     */
    static validateElement(element: any): boolean {
        if (!(element instanceof Element || element instanceof Comment)) {
            throw new Error('Provided value is not a valid DOM Element');
        }
        return true;
    }

    /**
     * Convert various input types to a safe DocumentFragment
     * Supports: string, Element, NodeList, Array<Element|string>
     */
    static toFragment(content: any): DocumentFragment {
        const fragment = document.createDocumentFragment();

        const appendItem = (item: any): void => {
            if (!item) return;
            
            if (typeof item === 'string') {
                const template = document.createElement('template');
                template.innerHTML = item.trim();
                fragment.appendChild(template.content);
            } else if (item instanceof Element || item instanceof DocumentFragment) {
                fragment.appendChild(item);
            } else if (Array.isArray(item) || item instanceof NodeList) {
                Array.from(item).forEach(appendItem);
            } else if (item instanceof Comment) {
                fragment.appendChild(item);
            } else if (item instanceof Text) {
                fragment.appendChild(item);
            } else {
                console.warn('OneDOM: Unsupported content type:', item);
            }
        };

        appendItem(content);
        return fragment;
    }

    /**
     * Insert content before target element
     */
    static before(target: Element | Comment, content: any): void {
        if (!(target instanceof Element || target instanceof Comment)) {
            throw new Error('Target must be a DOM element');
        }
        target.parentNode?.insertBefore(this.toFragment(content), target);
    }

    /**
     * Insert content after target element
     */
    static after(target: Element | Comment, content: any): void {
        if (!(target instanceof Element || target instanceof Comment)) {
            throw new Error('Target must be a DOM element');
        }
        const frag = this.toFragment(content);
        if (target.nextSibling) {
            target.parentNode?.insertBefore(frag, target.nextSibling);
        } else {
            target.parentNode?.appendChild(frag);
        }
    }

    /**
     * Replace target element with content
     */
    static replace(target: Element | Comment, content: any): void {
        if (!(target instanceof Element || target instanceof Comment)) {
            throw new Error('Target must be a DOM element');
        }
        target.replaceWith(this.toFragment(content));
    }

    /**
     * Append content to end of target element
     */
    static append(target: Element, content: any): void {
        if (!(target instanceof Element)) {
            throw new Error('Target must be a DOM element');
        }
        target.appendChild(this.toFragment(content));
    }

    /**
     * Prepend content to beginning of target element
     */
    static prepend(target: Element, content: any): void {
        if (!(target instanceof Element)) {
            throw new Error('Target must be a DOM element');
        }
        if (!target.firstChild) {
            target.appendChild(this.toFragment(content));
            return;
        }
        target.insertBefore(this.toFragment(content), target.firstChild);
    }

    /**
     * Set HTML content of target element (replaces all content)
     */
    static setHTML(target: Element, content: any): void {
        if (!(target instanceof Element)) {
            throw new Error('Target must be a DOM element');
        }
        target.innerHTML = '';
        target.appendChild(this.toFragment(content));
    }

    /**
     * Replace all content of target element
     */
    static replaceContent(target: Element, content: any): void {
        if (!(target instanceof Element)) {
            throw new Error('Target must be a DOM element');
        }
        target.innerHTML = '';
        target.appendChild(this.toFragment(content));
    }

    /**
     * Get or set content of element
     */
    static content(target: Element, content?: any): string | void {
        if (content === undefined) {
            // Get content
            if (!(target instanceof Element)) {
                throw new Error('Target must be a DOM element');
            }
            return target.innerHTML;
        } else {
            // Set content
            this.setHTML(target, content);
        }
    }

    /**
     * Get or set children of element
     */
    static children(target: Element, children?: any): Element[] | void {
        if (!(target instanceof Element)) {
            throw new Error('Target must be a DOM element');
        }
        if (children === null || children === undefined) {
            return Array.from(target.children);
        } else {
            target.innerHTML = '';
            target.appendChild(this.toFragment(children));
        }
    }

    /**
     * Get input value from form element
     */
    static getInputValue(el: any): any {
        if (!el || !(el instanceof Element)) return null;

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();

        // Input
        if (tag === 'input') {
            switch (type) {
                case 'checkbox':
                    return (el as HTMLInputElement).checked;
                case 'radio':
                    return (el as HTMLInputElement).checked 
                        ? ((el as HTMLInputElement).value || false) 
                        : null;
                case 'file':
                    const fileInput = el as HTMLInputElement;
                    return fileInput.multiple 
                        ? Array.from(fileInput.files || []) 
                        : (fileInput.files?.[0] || null);
                case 'number':
                case 'range':
                    const numValue = (el as HTMLInputElement).value;
                    return numValue === '' ? null : Number(numValue);
                default:
                    return (el as HTMLInputElement).value;
            }
        }

        // Select
        if (tag === 'select') {
            const select = el as HTMLSelectElement;
            if (select.multiple) {
                return Array.from(select.selectedOptions).map(o => o.value);
            }
            return select.value;
        }

        // Textarea
        if (tag === 'textarea') {
            return (el as HTMLTextAreaElement).value;
        }

        // Contenteditable
        if ((el as HTMLElement).isContentEditable) {
            return (el as HTMLElement).innerText;
        }

        return null;
    }

    /**
     * Set input value for form element
     */
    static setInputValue(el: any, value: any): void {
        if (!el || !(el instanceof Element)) return;

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();

        // Input
        if (tag === 'input') {
            switch (type) {
                case 'checkbox':
                    (el as HTMLInputElement).checked = Boolean(value);
                    return;

                case 'radio':
                    (el as HTMLInputElement).checked = (el as HTMLInputElement).value === value;
                    return;

                case 'file':
                    // Cannot set file programmatically (security)
                    return;

                case 'number':
                case 'range':
                    (el as HTMLInputElement).value = value ?? '';
                    return;

                default:
                    (el as HTMLInputElement).value = value ?? '';
                    return;
            }
        }

        // Select
        if (tag === 'select') {
            const select = el as HTMLSelectElement;
            if (select.multiple && Array.isArray(value)) {
                Array.from(select.options).forEach(opt => {
                    opt.selected = value.includes(opt.value);
                });
            } else {
                select.value = value ?? '';
            }
            return;
        }

        // Textarea
        if (tag === 'textarea') {
            (el as HTMLTextAreaElement).value = value ?? '';
            return;
        }

        // Contenteditable
        if ((el as HTMLElement).isContentEditable) {
            (el as HTMLElement).innerText = value ?? '';
            return;
        }
    }
}

export default OneDOM;
