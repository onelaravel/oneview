/**
 * ViewTemplateManager - Manages view templates, sections, blocks, and wrappers
 * Port from V1 with TypeScript improvements
 */

export interface WrapperConfig {
  enable: boolean;
  tag: string | null;
  subscribe: boolean;
  attributes: Record<string, string>;
}

export interface SectionMetadata {
  type: 'short' | 'long' | 'html';
  preloader: boolean;
  useVars: boolean;
  script?: Record<string, any>;
}

export class ViewTemplateManager {
  // Parent controller reference
  private controller: any;

  // Wrapper configuration
  public wrapTag: string | null = null;
  public wrapperConfig: WrapperConfig = {
    enable: false,
    tag: null,
    subscribe: true,
    attributes: {},
  };

  // Section management
  public sections: Record<string, SectionMetadata> = {};
  public cachedSections: Record<string, string> = {};
  public renderedSections: Record<string, string> = {};
  public renderedHtml: string = '';

  // Block management
  public blockNameList: string[] = [];
  public blocks: Map<string, any> = new Map();
  public hasBlocks: boolean = false;
  public hasSections: boolean = false;

  // Children tracking
  public childrenConfig: Array<{ name: string; id: string }> = [];
  public childrenIndex: number = 0;
  public refreshChildrenIndex: number = 0;

  // Cache flag
  public isCached: boolean = false;

  constructor(controller: any) {
    this.controller = controller;
  }

  /**
   * Initialize wrapper configuration
   */
  initializeWrapperConfig(config?: Partial<WrapperConfig>): void {
    this.wrapperConfig = {
      ...this.wrapperConfig,
      ...(typeof config === 'object' && config ? config : {}),
    };
  }

  /**
   * Reset children index for re-rendering
   */
  resetChildrenIndex(): void {
    this.childrenIndex = 0;
  }

  /**
   * Get wrapper attribute string
   */
  wrapperAttribute(): string {
    return ` data-view-wrapper="${this.controller.id}"`;
  }

  /**
   * Start wrapper tag with attributes
   */
  startWrapper(tag: string | null = null, attributes: Record<string, string> = {}): string {
    this.wrapTag = null;

    if (typeof tag === 'string') {
      this.wrapTag = tag;
    } else if (typeof tag === 'object' && tag !== null) {
      const tagObj = tag as any;
      this.wrapTag = tagObj.tag || 'div';
      delete tagObj.tag;
      attributes = { ...attributes, ...tagObj.attributes };
    }

    if (typeof attributes !== 'object' || !attributes) {
      attributes = {};
    }

    if (this.wrapTag) {
      const attrString = Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      return `<${this.wrapTag} data-wrap-view="${this.controller.path}" data-wrap-id="${this.controller.id}" ${attrString}>`;
    }

    return `<!-- [one:view name="${this.controller.path}" id="${this.controller.id}"] -->`;
  }

  /**
   * End wrapper tag
   */
  endWrapper(): string {
    if (this.wrapTag) {
      const closeTag = `</${this.wrapTag}>`;
      this.wrapTag = null;
      return closeTag;
    }

    this.wrapTag = null;
    return `<!-- [/one:view] -->`;
  }

  /**
   * Define a section with content
   */
  section(name: string, content: string, type: 'string' | 'html' = 'html'): string {
    const finalContent = String(content || '').trim();
    this.cachedSections[name] = finalContent;
    
    // Delegate to ViewManager's section registry
    if (this.controller.App?.View) {
      return this.controller.App.View.section(name, finalContent, type);
    }
    
    return '';
  }

  /**
   * Yield a section (get content from parent)
   */
  yieldSection(name: string, defaultValue: string = ''): string {
    if (this.controller.App?.View) {
      return this.controller.App.View.yield(name, defaultValue);
    }
    return defaultValue;
  }

  /**
   * Yield content for attribute bindings
   */
  yieldContent(name: string, defaultValue: string = ''): string {
    if (this.controller.App?.View) {
      return this.controller.App.View.yieldContent(name, defaultValue);
    }
    return defaultValue;
  }

  /**
   * Define a block (long-form content section)
   */
  addBlock(name: string, _attributes: Record<string, any> = {}, content: string): string {
    if (typeof name !== 'string' || name === '') {
      return '';
    }

    if (!this.blockNameList.includes(name)) {
      this.blockNameList.push(name);
    }

    const trimContent = String(content || '').trim();
    const blockContent = `<!-- [one:block name="${name}" view="${this.controller.path}" ref="${this.controller.id}"] -->${trimContent}<!-- [/one:block] -->`;
    const key = `block.${name}`;
    
    this.cachedSections[key] = blockContent;
    return this.section(key, blockContent, 'html');
  }

  /**
   * Use a block (mount block content)
   */
  useBlock(name: string, defaultValue: string = ''): string {
    if (typeof name !== 'string' || name === '') {
      return '';
    }

    const content = this.yieldSection(`block.${name}`, defaultValue);
    return `<!-- [one:subscribe type="block" key="${name}"] -->${content}<!-- [/one:subscribe] -->`;
  }

  /**
   * Mount block (alias for useBlock)
   */
  mountBlock(name: string, defaultValue: string = ''): string {
    return this.useBlock(name, defaultValue);
  }

  /**
   * Subscribe to block updates
   */
  subscribeBlock(name: string): string {
    return ` data-subscribe-block="${name}"`;
  }

  /**
   * Store children references for hydration
   */
  storeChildrenReferences(children: Array<{ name: string; id: string }>): void {
    children.forEach((child) => {
      this.childrenConfig.push({ name: child.name, id: child.id });
    });
  }

  /**
   * Push cached sections to ViewManager
   */
  pushCachedSections(): void {
    if (!this.controller.App?.View) return;

    Object.entries(this.cachedSections).forEach(([key, content]) => {
      this.controller.App.View.section(key, content, 'html');
    });
  }

  /**
   * Scan blocks from DOM (SSR hydration)
   */
  scanBlocks(): void {
    if (this.blockNameList.length === 0) return;

    // TODO: Implement DOM scanning logic
    // this.blockNameList.forEach(name => {
    //   const block = OneMarkup.first('block', { name, view: this.controller.path });
    //   if (block) {
    //     this.blocks.set(name, block);
    //   }
    // });
  }

  /**
   * Update block content from DOM
   */
  updateBlockListContent(): void {
    if (this.blockNameList.length === 0) return;

    this.blockNameList.forEach((name) => {
      const block = this.blocks.get(name);
      if (block) {
        const content = block.outerHTML;
        const key = `block.${name}`;
        this.cachedSections[key] = content;
      }
    });
  }

  /**
   * Update HTML cache for re-use
   */
  updateHtmlCache(): void {
    try {
      // Cache block content if this is a child view with superView
      if (this.controller.superView) {
        this.updateBlockListContent();
      }
      // Cache full HTML if this is standalone or root layout
      else if (this.controller.rootElement && this.controller.rootElement instanceof HTMLElement) {
        this.renderedHtml = this.controller.rootElement.outerHTML;
      } else if (this.controller.markup) {
        this.renderedHtml = this.controller.markup.outerHTML;
      } else {
        console.warn(`[ViewTemplateManager] Cannot cache HTML: rootElement not found for view '${this.controller.path}'`);
        return;
      }

      this.isCached = true;
    } catch (error) {
      console.error(`[ViewTemplateManager] Error caching HTML for view '${this.controller.path}':`, error);
      this.isCached = false;
    }
  }
}
