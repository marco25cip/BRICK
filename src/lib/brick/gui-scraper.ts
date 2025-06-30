import { createWorker } from 'tesseract.js';
import { BrickAction, BrickGUIElement, BrickScreenRegion } from './types';

export class GUIScraper {
  private static instance: GUIScraper;
  private ocrWorker: Tesseract.Worker | null = null;
  private lastScreenshot: string | null = null;
  private guiElements: Map<string, BrickGUIElement> = new Map();

  private constructor() {
    this.initializeOCR();
  }

  public static getInstance(): GUIScraper {
    if (!GUIScraper.instance) {
      GUIScraper.instance = new GUIScraper();
    }
    return GUIScraper.instance;
  }

  private async initializeOCR() {
    try {
      this.ocrWorker = await createWorker('eng');
      console.log('OCR worker initialized');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }

  public async captureScreen(): Promise<void> {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size to viewport size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Convert the current page to an image using html2canvas
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          const styles = window.getComputedStyle(element);
          
          context.save();
          context.fillStyle = styles.backgroundColor;
          context.fillRect(rect.left, rect.top, rect.width, rect.height);
          
          if (element.textContent) {
            context.fillStyle = styles.color;
            context.font = `${styles.fontSize} ${styles.fontFamily}`;
            context.fillText(element.textContent, rect.left, rect.top + parseInt(styles.fontSize));
          }
          
          context.restore();
        }
      });

      // Convert canvas to base64
      this.lastScreenshot = canvas.toDataURL('image/png');
      
      // Process the screenshot to extract GUI elements
      await this.processScreenshot(this.lastScreenshot);
      
      console.log('Screen captured and processed');
    } catch (error) {
      console.error('Screen capture failed:', error);
    }
  }

  private async processScreenshot(screenshot: string): Promise<void> {
    if (!this.ocrWorker) {
      console.error('OCR worker not initialized');
      return;
    }

    try {
      // Clear previous elements
      this.guiElements.clear();

      // Perform OCR on the screenshot
      const { data: { text, words } } = await this.ocrWorker.recognize(screenshot);
      console.log('OCR completed:', { text, wordCount: words.length });

      // Extract GUI elements from the OCR results
      for (const word of words) {
        const element: BrickGUIElement = {
          type: 'text',
          text: word.text,
          confidence: word.confidence,
          bounds: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          },
          attributes: {
            isClickable: this.isLikelyClickable(word.text),
            role: this.inferElementRole(word.text)
          }
        };

        this.guiElements.set(word.text, element);
        console.log('Added GUI element:', element);
      }

      // Analyze layout and hierarchy
      this.analyzeLayout();
    } catch (error) {
      console.error('Screenshot processing failed:', error);
    }
  }

  private isLikelyClickable(text: string): boolean {
    const clickablePatterns = [
      /button/i,
      /click/i,
      /submit/i,
      /send/i,
      /save/i,
      /cancel/i,
      /close/i,
      /open/i,
      /menu/i
    ];

    return clickablePatterns.some(pattern => pattern.test(text));
  }

  private inferElementRole(text: string): string {
    if (this.isLikelyClickable(text)) return 'button';
    if (/input|text|field/i.test(text)) return 'textbox';
    if (/menu|dropdown|select/i.test(text)) return 'menu';
    if (/checkbox|radio/i.test(text)) return 'checkbox';
    if (/link|href/i.test(text)) return 'link';
    return 'text';
  }

  private analyzeLayout() {
    // Group elements by their vertical position to identify rows
    const rows = new Map<number, BrickGUIElement[]>();
    
    this.guiElements.forEach(element => {
      const rowKey = Math.round(element.bounds.y / 10) * 10;
      if (!rows.has(rowKey)) rows.set(rowKey, []);
      rows.get(rowKey)!.push(element);
    });

    // Sort elements within each row by x position
    rows.forEach(elements => {
      elements.sort((a, b) => a.bounds.x - b.bounds.x);
    });

    // Identify containers and hierarchical relationships
    this.identifyContainers(Array.from(rows.values()));
  }

  private identifyContainers(rows: BrickGUIElement[][]) {
    const containers: BrickScreenRegion[] = [];

    // Look for patterns that suggest containers (e.g., groups of related elements)
    rows.forEach((row, rowIndex) => {
      if (row.length > 1) {
        const avgSpacing = this.calculateAverageSpacing(row);
        const groups = this.groupElementsBySpacing(row, avgSpacing);

        groups.forEach(group => {
          if (group.length > 1) {
            containers.push({
              type: 'container',
              elements: group,
              bounds: this.calculateGroupBounds(group)
            });
          }
        });
      }
    });

    // Update element hierarchy
    containers.forEach(container => {
      container.elements.forEach(element => {
        element.container = container;
      });
    });
  }

  private calculateAverageSpacing(elements: BrickGUIElement[]): number {
    if (elements.length < 2) return 0;

    const spacings = elements
      .slice(1)
      .map((element, i) => element.bounds.x - (elements[i].bounds.x + elements[i].bounds.width));

    return spacings.reduce((a, b) => a + b, 0) / spacings.length;
  }

  private groupElementsBySpacing(elements: BrickGUIElement[], avgSpacing: number): BrickGUIElement[][] {
    const groups: BrickGUIElement[][] = [[]];
    let currentGroup = 0;

    elements.forEach((element, i) => {
      if (i === 0) {
        groups[currentGroup].push(element);
        return;
      }

      const spacing = element.bounds.x - (elements[i - 1].bounds.x + elements[i - 1].bounds.width);
      
      if (spacing > avgSpacing * 2) {
        currentGroup++;
        groups[currentGroup] = [];
      }

      groups[currentGroup].push(element);
    });

    return groups;
  }

  private calculateGroupBounds(elements: BrickGUIElement[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const x = Math.min(...elements.map(e => e.bounds.x));
    const y = Math.min(...elements.map(e => e.bounds.y));
    const right = Math.max(...elements.map(e => e.bounds.x + e.bounds.width));
    const bottom = Math.max(...elements.map(e => e.bounds.y + e.bounds.height));

    return {
      x,
      y,
      width: right - x,
      height: bottom - y
    };
  }

  public getGuiElements(): BrickGUIElement[] {
    return Array.from(this.guiElements.values());
  }

  public findElementAtPosition(x: number, y: number): BrickGUIElement | null {
    for (const element of this.guiElements.values()) {
      if (
        x >= element.bounds.x &&
        x <= element.bounds.x + element.bounds.width &&
        y >= element.bounds.y &&
        y <= element.bounds.y + element.bounds.height
      ) {
        return element;
      }
    }
    return null;
  }

  public async dispose() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}