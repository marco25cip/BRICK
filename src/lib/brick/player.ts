import { BrickAction, BrickSystemCall } from './types';

export class BrickPlayer {
  private actions: BrickAction[] = [];
  private isPlaying: boolean = false;
  private currentIndex: number = 0;
  private systemCallHandlers: Map<string, (call: BrickSystemCall) => Promise<void>>;

  constructor(recording?: BrickAction[]) {
    if (recording) {
      this.actions = recording;
    }
    this.systemCallHandlers = this.initializeSystemCallHandlers();
  }

  private initializeSystemCallHandlers(): Map<string, (call: BrickSystemCall) => Promise<void>> {
    const handlers = new Map();
    
    // Register system call handlers
    handlers.set('processStart', async (call) => {
      console.log('Starting process:', call.parameters?.path);
      // In a real implementation, this would use OS APIs to start processes
    });

    handlers.set('serviceControl', async (call) => {
      console.log('Controlling service:', call.parameters?.name, call.parameters?.action);
      // In a real implementation, this would use OS APIs to control services
    });

    handlers.set('windowManagement', async (call) => {
      if (call.parameters?.action === 'focus') {
        window.focus();
      } else if (call.parameters?.action === 'maximize') {
        // Request full screen as a demonstration
        document.documentElement.requestFullscreen();
      }
    });

    return handlers;
  }

  public async play(): Promise<void> {
    if (this.isPlaying || this.actions.length === 0) return;

    this.isPlaying = true;
    this.currentIndex = 0;

    try {
      while (this.currentIndex < this.actions.length && this.isPlaying) {
        const action = this.actions[this.currentIndex];
        await this.executeAction(action);
        this.currentIndex++;

        // Respect the original timing between actions
        if (this.currentIndex < this.actions.length) {
          const nextAction = this.actions[this.currentIndex];
          const delay = nextAction.event.timestamp - action.event.timestamp;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      this.isPlaying = false;
    }
  }

  public stop(): void {
    this.isPlaying = false;
  }

  private async executeAction(action: BrickAction): Promise<void> {
    try {
      switch (action.type) {
        case 'mouse':
          await this.executeMouseAction(action);
          break;
        case 'keyboard':
          await this.executeKeyboardAction(action);
          break;
        case 'system':
          await this.executeSystemAction(action);
          break;
      }
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
      throw error;
    }
  }

  private async executeMouseAction(action: BrickAction): Promise<void> {
    if ('target' in action.event) {
      const element = document.querySelector(action.event.target?.selector || '');
      if (element) {
        // Create and dispatch a more detailed mouse event
        const eventInit: MouseEventInit = {
          bubbles: true,
          cancelable: true,
          clientX: action.event.coordinates.x,
          clientY: action.event.coordinates.y,
          button: (action.event as any).button || 0,
          buttons: (action.event as any).button ? 1 << (action.event as any).button : 0,
          relatedTarget: null,
          screenX: action.event.coordinates.x,
          screenY: action.event.coordinates.y,
        };

        element.dispatchEvent(new MouseEvent(action.event.type, eventInit));

        // Handle scrolling if needed
        if (action.event.type === 'scroll' && 'scrollTo' in element) {
          (element as Element).scrollTo({
            top: action.event.coordinates.y,
            left: action.event.coordinates.x,
            behavior: 'smooth'
          });
        }
      }
    }
  }

  private async executeKeyboardEvent(action: BrickAction): Promise<void> {
    if ('key' in action.event) {
      const eventInit: KeyboardEventInit = {
        key: action.event.key,
        code: action.event.keyCode?.toString(),
        keyCode: action.event.keyCode,
        ctrlKey: action.event.modifiers?.ctrl,
        altKey: action.event.modifiers?.alt,
        shiftKey: action.event.modifiers?.shift,
        metaKey: action.event.modifiers?.meta,
        repeat: action.event.repeat,
        bubbles: true,
        cancelable: true,
      };

      // Handle both document-level and focused element keyboard events
      const targets = [
        document,
        document.activeElement,
      ].filter(Boolean);

      for (const target of targets) {
        target?.dispatchEvent(new KeyboardEvent(action.event.type, eventInit));
      }

      // Handle text input events separately
      if (action.event.type === 'textInput' && document.activeElement instanceof HTMLInputElement) {
        document.activeElement.value += action.event.key;
        document.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  private async executeSystemAction(action: BrickAction): Promise<void> {
    if ('systemCall' in action.event && action.event.systemCall) {
      const handler = this.systemCallHandlers.get(action.event.systemCall.type);
      if (handler) {
        await handler(action.event.systemCall);
      } else {
        console.warn('Unhandled system call type:', action.event.systemCall.type);
      }
    }

    if ('window' in action.event && action.event.window) {
      // Handle window-related actions
      const { window: windowState } = action.event;
      
      if (windowState.isFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  public load(recording: BrickAction[]): void {
    this.actions = recording;
    this.currentIndex = 0;
  }

  public getProgress(): number {
    return this.actions.length ? (this.currentIndex / this.actions.length) * 100 : 0;
  }
}