/**
 * SSRViewDataParser - Parse SSR data from server-rendered HTML
 * Handles hydration by extracting view data from HTML comments
 */

export interface SSRViewDataItem {
  viewId: string;
  viewName: string;
  data: Record<string, any>;
  children: Array<{ name: string; id: string }>;
  events: Array<{ type: string; handler: string }>;
  outputComponents?: Array<{ id: string; keys: string[] }>;
  attributes?: Array<{ element: string; attrs: Record<string, any> }>;
}

export class SSRViewData {
  private instances: Map<string, SSRViewDataItem> = new Map();
  private indexMap: string[] = [];
  private index: number = 0;

  constructor(viewData: Record<string, SSRViewDataItem>) {
    const { instances, indexMap } = this.parseViewData(viewData);
    this.instances = instances;
    this.indexMap = indexMap;
  }

  private parseViewData(viewData: Record<string, SSRViewDataItem>): {
    instances: Map<string, SSRViewDataItem>;
    indexMap: string[];
  } {
    const instances = new Map<string, SSRViewDataItem>();
    const keys = Object.keys(viewData);

    keys.forEach(key => {
      instances.set(key, viewData[key]);
    });

    return {
      instances,
      indexMap: keys,
    };
  }

  get(index: number | null = null): SSRViewDataItem | null {
    if (index === null) {
      index = this.index;
    }
    this.index = index;
    return this.instances.get(this.indexMap[index]) ?? null;
  }

  next(): SSRViewDataItem | null {
    this.index++;
    return this.get(this.index);
  }

  prev(): SSRViewDataItem | null {
    this.index--;
    return this.get(this.index);
  }

  getById(id: string): SSRViewDataItem | null {
    return this.instances.get(id) ?? null;
  }

  scan(): SSRViewDataItem | null {
    const index = this.index;
    this.index++;
    const instance = this.get(index);
    
    if (!instance) {
      this.index--;
      return null;
    }
    
    return instance;
  }
}

export class SSRViewDataCollection {
  private views: Map<string, SSRViewData> = new Map();

  constructor(views?: Record<string, Record<string, SSRViewDataItem>>) {
    if (views) {
      this.setViews(views);
    }
  }

  setViews(views: Record<string, Record<string, SSRViewDataItem>>): void {
    if (typeof views !== 'object' || !views || Object.keys(views).length === 0) {
      return;
    }

    Object.keys(views).forEach(name => {
      this.views.set(name, new SSRViewData(views[name]));
    });
  }

  get(name: string): SSRViewData | null {
    return this.views.get(name) ?? null;
  }

  scan(name: string): SSRViewDataItem | null {
    return this.get(name)?.scan() ?? null;
  }

  getInstance(name: string, id: string): SSRViewDataItem | null {
    return this.get(name)?.getById(id) ?? null;
  }
}

/**
 * Parse SSR data from HTML comments in the DOM
 */
export class SSRViewDataParser {
  /**
   * Parse all SSR data from document
   */
  static parseDocument(): Record<string, Record<string, SSRViewDataItem>> {
    const views: Record<string, Record<string, SSRViewDataItem>> = {};

    // Find all SSR data comments in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT,
      null
    );

    let node: Comment | null;
    while ((node = walker.nextNode() as Comment | null)) {
      if (node.nodeValue && node.nodeValue.includes('[one:view-data')) {
        try {
          const data = this.parseComment(node.nodeValue);
          if (data) {
            const { viewName, viewId } = data;
            if (!views[viewName]) {
              views[viewName] = {};
            }
            views[viewName][viewId] = data;
          }
        } catch (error) {
          console.error('[SSRViewDataParser] Error parsing comment:', error);
        }
      }
    }

    return views;
  }

  /**
   * Parse SSR data from comment node
   */
  static parseComment(comment: string): SSRViewDataItem | null {
    try {
      // Format: <!-- [one:view-data name="web.home" id="view_123"] {...data} [/one:view-data] -->
      const match = comment.match(/\[one:view-data[^\]]*\]\s*({.*})\s*\[\/one:view-data\]/);
      
      if (!match) {
        return null;
      }

      const jsonData = match[1];
      const data = JSON.parse(jsonData);

      // Parse attributes from opening tag
      const attrMatch = comment.match(/\[one:view-data\s+([^\]]+)\]/);
      const attrs: Record<string, string> = {};
      
      if (attrMatch) {
        const attrString = attrMatch[1];
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatchResult;
        
        while ((attrMatchResult = attrRegex.exec(attrString)) !== null) {
          attrs[attrMatchResult[1]] = attrMatchResult[2];
        }
      }

      return {
        viewId: attrs.id || '',
        viewName: attrs.name || '',
        data: data.data || {},
        children: data.children || [],
        events: data.events || [],
        outputComponents: data.outputComponents || [],
        attributes: data.attributes || [],
      };
    } catch (error) {
      console.error('[SSRViewDataParser] Error parsing comment:', error);
      return null;
    }
  }

  /**
   * Extract view data for specific view instance
   */
  static findViewData(viewName: string, viewId: string): SSRViewDataItem | null {
    const allData = this.parseDocument();
    return allData[viewName]?.[viewId] ?? null;
  }

  /**
   * Check if document has SSR data
   */
  static hasSSRData(): boolean {
    return document.body.innerHTML.includes('[one:view-data');
  }
}

export default SSRViewDataParser;
