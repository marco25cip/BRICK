import { createWorker } from 'tesseract.js';
import { BrickAction, BrickGUIElement, BrickScreenRegion } from './types';

// BRICK (Behavioral Recording & Interaction Capture Kit) Protocol Types

export type BrickCoordinates = {
  x: number;
  y: number;
  screen?: number; // For multi-monitor setups
  relative?: boolean; // Whether coordinates are relative to window or screen
};

export type BrickMouseEvent = {
  type: 'click' | 'doubleClick' | 'rightClick' | 'drag' | 'move' | 'scroll';
  coordinates: BrickCoordinates;
  target?: {
    element: string;
    selector: string;
    text?: string;
    attributes?: Record<string, string>;
    role?: string; // ARIA role or native role
  };
  button?: number; // Mouse button number
  pressure?: number; // For pressure-sensitive devices
  timestamp: number;
};

export type BrickKeyboardEvent = {
  type: 'keyPress' | 'keyDown' | 'keyUp' | 'textInput' | 'hotkey';
  key: string;
  keyCode?: number;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
    fn?: boolean; // Function key modifier
  };
  repeat?: boolean;
  timestamp: number;
};

export type BrickProcessInfo = {
  name: string;
  pid?: number;
  path?: string;
  commandLine?: string;
  parent?: {
    name: string;
    pid?: number;
  };
  user?: string;
  startTime?: number;
  cpu?: number;
  memory?: number;
  status?: 'running' | 'suspended' | 'terminated';
};

export type BrickServiceInfo = {
  name: string;
  displayName?: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  startType: 'automatic' | 'manual' | 'disabled';
  processId?: number;
  dependencies?: string[];
};

export type BrickSystemCall = {
  type: string;
  module: string;
  function: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: number;
};

export type BrickSystemEvent = {
  type: 'processStart' | 'processEnd' | 'windowFocus' | 'windowBlur' | 'serviceChange' | 'systemCall';
  process?: BrickProcessInfo;
  service?: BrickServiceInfo;
  systemCall?: BrickSystemCall;
  window?: {
    title: string;
    handle?: number;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    isFullscreen?: boolean;
    isMinimized?: boolean;
    isMaximized?: boolean;
  };
  timestamp: number;
};

export type BrickEnvironmentContext = {
  os: {
    name: string;
    version: string;
    arch: string;
  };
  display: {
    screens: Array<{
      id: number;
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      primary: boolean;
      scaleFactor: number;
    }>;
  };
  locale: string;
  timezone: string;
};

export type BrickGUIElement = {
  type: 'text' | 'button' | 'input' | 'menu' | 'container';
  text?: string;
  confidence?: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: {
    isClickable?: boolean;
    role?: string;
    state?: 'enabled' | 'disabled' | 'selected' | 'focused';
  };
  container?: BrickScreenRegion;
  children?: BrickGUIElement[];
};

export type BrickScreenRegion = {
  type: 'container' | 'window' | 'dialog';
  elements: BrickGUIElement[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  parent?: BrickScreenRegion;
};

export type BrickAction = {
  id: string;
  type: 'mouse' | 'keyboard' | 'system';
  event: BrickMouseEvent | BrickKeyboardEvent | BrickSystemEvent;
  context: {
    windowTitle?: string;
    activeApp?: string;
    screenResolution?: {
      width: number;
      height: number;
    };
    environment?: BrickEnvironmentContext;
    processChain?: BrickProcessInfo[]; // Chain of processes involved
    systemState?: {
      cpuUsage: number;
      memoryUsage: number;
      activeProcesses: number;
      activeServices: number;
    };
    guiState?: {
      elements: BrickGUIElement[];
      regions: BrickScreenRegion[];
    };
  };
};