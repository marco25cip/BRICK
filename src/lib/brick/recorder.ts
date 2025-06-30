import { 
  BrickAction, 
  BrickMouseEvent, 
  BrickKeyboardEvent, 
  BrickSystemEvent,
  BrickProcessInfo,
  BrickEnvironmentContext,
  BrickSystemCall,
  BrickGUIElement
} from './types';
import { GUIScraper } from './gui-scraper';

export class BrickRecorder {
  private actions: BrickAction[] = [];
  private isRecording: boolean = false;
  private startTime: number = 0;
  private processMonitor?: any;
  private serviceMonitor?: any;
  private guiScraper: GUIScraper;
  private guiUpdateInterval?: number;

  constructor() {
    this.guiScraper = GUIScraper.getInstance();
    this.setupListeners();
    this.initializeSystemMonitors();
  }

  private setupListeners() {
    if (typeof window !== 'undefined') {
      // Mouse events with enhanced tracking
      window.addEventListener('click', this.handleMouseEvent.bind(this));
      window.addEventListener('dblclick', this.handleMouseEvent.bind(this));
      window.addEventListener('contextmenu', this.handleMouseEvent.bind(this));
      window.addEventListener('mousemove', this.handleMouseEvent.bind(this));
      window.addEventListener('wheel', this.handleMouseEvent.bind(this));
      window.addEventListener('mousedown', this.handleMouseEvent.bind(this));
      window.addEventListener('mouseup', this.handleMouseEvent.bind(this));

      // Keyboard events with hotkey support
      window.addEventListener('keydown', this.handleKeyboardEvent.bind(this));
      window.addEventListener('keyup', this.handleKeyboardEvent.bind(this));
      window.addEventListener('keypress', this.handleKeyboardEvent.bind(this));

      // Window/System events
      window.addEventListener('focus', this.handleSystemEvent.bind(this));
      window.addEventListener('blur', this.handleSystemEvent.bind(this));
      window.addEventListener('resize', this.handleSystemEvent.bind(this));
    }
  }

  private initializeSystemMonitors() {
    if (typeof window !== 'undefined') {
      // Process monitoring
      this.processMonitor = setInterval(() => {
        if (this.isRecording) {
          this.captureProcessInfo();
        }
      }, 1000);

      // Service monitoring
      this.serviceMonitor = setInterval(() => {
        if (this.isRecording) {
          this.captureServiceInfo();
        }
      }, 5000);

      // GUI monitoring
      this.guiUpdateInterval = setInterval(async () => {
        if (this.isRecording) {
          await this.guiScraper.captureScreen();
        }
      }, 1000);
    }
  }

  private async handleMouseEvent(event: MouseEvent): Promise<void> {
    if (!this.isRecording) return;

    // Get GUI element at click position
    const guiElement = this.guiScraper.findElementAtPosition(event.clientX, event.clientY);

    const mouseEvent: BrickMouseEvent = {
      type: event.type as any,
      coordinates: {
        x: event.clientX,
        y: event.clientY,
        relative: true,
      },
      target: {
        element: (event.target as HTMLElement).tagName.toLowerCase(),
        selector: this.generateSelector(event.target as HTMLElement),
        text: guiElement?.text || (event.target as HTMLElement).textContent || undefined,
        attributes: {
          ...this.getElementAttributes(event.target as HTMLElement),
          ...(guiElement?.attributes || {}),
        },
        role: guiElement?.attributes?.role || (event.target as HTMLElement).getAttribute('role') || undefined,
      },
      button: event.button,
      pressure: (event as PointerEvent).pressure,
      timestamp: Date.now() - this.startTime,
    };

    this.recordAction({
      id: crypto.randomUUID(),
      type: 'mouse',
      event: mouseEvent,
      context: await this.getCurrentContext(),
    });
  }

  private handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    const keyboardEvent: BrickKeyboardEvent = {
      type: event.type as any,
      key: event.key,
      keyCode: event.keyCode,
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
        fn: event.getModifierState('Fn'),
      },
      repeat: event.repeat,
      timestamp: Date.now() - this.startTime,
    };

    if (this.isHotkey(event)) {
      keyboardEvent.type = 'hotkey';
    }

    this.recordAction({
      id: crypto.randomUUID(),
      type: 'keyboard',
      event: keyboardEvent,
      context: this.getCurrentContext(),
    });
  }

  private handleSystemEvent(event: Event): void {
    if (!this.isRecording) return;

    const systemEvent: BrickSystemEvent = {
      type: event.type as any,
      process: this.getCurrentProcess(),
      window: {
        title: document.title,
        bounds: {
          x: window.screenX,
          y: window.screenY,
          width: window.innerWidth,
          height: window.innerHeight,
        },
        isFullscreen: document.fullscreenElement !== null,
        isMinimized: document.hidden,
        isMaximized: window.outerWidth === screen.availWidth && window.outerHeight === screen.availHeight,
      },
      timestamp: Date.now() - this.startTime,
    };

    this.recordAction({
      id: crypto.randomUUID(),
      type: 'system',
      event: systemEvent,
      context: this.getCurrentContext(),
    });
  }

  private getCurrentProcess(): BrickProcessInfo {
    return {
      name: 'browser',
      pid: 0,
      path: window.location.href,
      startTime: performance.timing.navigationStart,
      status: 'running',
      cpu: performance.now() / 1000,
      memory: performance.memory?.usedJSHeapSize,
    };
  }

  public getCurrentEnvironment(): BrickEnvironmentContext {
    return {
      os: {
        name: navigator.platform,
        version: navigator.userAgent,
        arch: navigator.platform,
      },
      display: {
        screens: [{
          id: 0,
          bounds: {
            x: 0,
            y: 0,
            width: screen.width,
            height: screen.height,
          },
          primary: true,
          scaleFactor: window.devicePixelRatio,
        }],
      },
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private async getCurrentContext() {
    const guiElements = this.guiScraper.getGuiElements();

    return {
      windowTitle: document.title,
      activeApp: 'browser',
      screenResolution: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      environment: this.getCurrentEnvironment(),
      processChain: [this.getCurrentProcess()],
      systemState: {
        cpuUsage: performance.now() / 1000,
        memoryUsage: performance.memory?.usedJSHeapSize || 0,
        activeProcesses: 1,
        activeServices: 0,
      },
      guiState: {
        elements: guiElements,
      },
    };
  }

  private getElementAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  private generateSelector(element: HTMLElement): string {
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList).map(c => `.${c}`).join('');
    const attributes = Array.from(element.attributes)
      .filter(attr => attr.name !== 'id' && attr.name !== 'class')
      .map(attr => {
        // Handle boolean attributes or empty values
        if (attr.value === '' || attr.value === attr.name) {
          return `[${attr.name}]`;
        }
        return `[${attr.name}="${attr.value}"]`;
      })
      .join('');
    return `${element.tagName.toLowerCase()}${id}${classes}${attributes}`;
  }

  private isHotkey(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey || event.altKey) && event.key.length === 1;
  }

  private async captureProcessInfo() {
    const systemCall: BrickSystemCall = {
      type: 'processInfo',
      module: 'os',
      function: 'getProcesses',
      timestamp: Date.now() - this.startTime,
    };

    this.recordAction({
      id: crypto.randomUUID(),
      type: 'system',
      event: {
        type: 'systemCall',
        systemCall,
        timestamp: Date.now() - this.startTime,
      },
      context: await this.getCurrentContext(),
    });
  }

  private async captureServiceInfo() {
    const systemCall: BrickSystemCall = {
      type: 'serviceInfo',
      module: 'os',
      function: 'getServices',
      timestamp: Date.now() - this.startTime,
    };

    this.recordAction({
      id: crypto.randomUUID(),
      type: 'system',
      event: {
        type: 'systemCall',
        systemCall,
        timestamp: Date.now() - this.startTime,
      },
      context: await this.getCurrentContext(),
    });
  }

  private recordAction(action: BrickAction): void {
    this.actions.push(action);
    this.emit('action', action);
  }

  private emit(event: string, data: any): void {
    console.log(`BRICK Event: ${event}`, data);
  }

  public start(): void {
    this.isRecording = true;
    this.startTime = Date.now();
    this.actions = [];
  }

  public stop(): BrickAction[] {
    this.isRecording = false;
    return this.actions;
  }

  public export(): string {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      actions: this.actions,
      environment: this.getCurrentEnvironment(),
    }, null, 2);
  }

  public dispose(): void {
    if (this.processMonitor) {
      clearInterval(this.processMonitor);
    }
    if (this.serviceMonitor) {
      clearInterval(this.serviceMonitor);
    }
    if (this.guiUpdateInterval) {
      clearInterval(this.guiUpdateInterval);
    }
    this.guiScraper.dispose();
  }
}