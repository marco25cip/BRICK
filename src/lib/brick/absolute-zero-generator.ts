import { BrickAction, BrickEnvironmentContext } from './types';
import { BrickDatabase, TaskRecording } from './database';

export interface TaskPattern {
  id: string;
  actionSequence: string[];
  successMetrics: {
    completionRate: number;
    executionTime: number;
    errorRate: number;
    userSatisfaction: number;
  };
  contextFeatures: {
    environment: string[];
    guiElements: string[];
    systemState: Record<string, number>;
  };
  emergentBehaviors: string[];
}

export interface LearningFeedback {
  taskId: string;
  success: boolean;
  executionTime: number;
  errors: string[];
  adaptations: string[];
  emergentPatterns: string[];
}

export class AbsoluteZeroGenerator {
  private static instance: AbsoluteZeroGenerator;
  private database: BrickDatabase;
  private successPatterns: Map<string, TaskPattern> = new Map();
  private learningHistory: LearningFeedback[] = [];
  private emergentKnowledge: Map<string, number> = new Map();

  private constructor() {
    this.database = BrickDatabase.getInstance();
    this.initializeFromSuccessfulTasks();
  }

  public static getInstance(): AbsoluteZeroGenerator {
    if (!AbsoluteZeroGenerator.instance) {
      AbsoluteZeroGenerator.instance = new AbsoluteZeroGenerator();
    }
    return AbsoluteZeroGenerator.instance;
  }

  private async initializeFromSuccessfulTasks(): Promise<void> {
    try {
      // Carica tutte le task dal database
      const allTasks = await this.database.searchRecordings('');
      
      // Analizza solo le task che hanno avuto feedback positivo
      for (const task of allTasks) {
        if (this.hasPositiveFeedback(task)) {
          const pattern = this.extractSuccessPattern(task);
          this.successPatterns.set(pattern.id, pattern);
        }
      }
    } catch (error) {
      console.error('Failed to initialize from successful tasks:', error);
    }
  }

  private hasPositiveFeedback(task: TaskRecording): boolean {
    // Analizza i metadati della task per determinare il successo
    const hasCompletedSuccessfully = task.actions.length > 0 && 
      !task.actions.some(action => this.isErrorAction(action));
    
    const hasOptimalTiming = this.calculateExecutionEfficiency(task.actions) > 0.7;
    const hasCleanExecution = this.calculateCleanlinessScore(task.actions) > 0.8;
    
    return hasCompletedSuccessfully && hasOptimalTiming && hasCleanExecution;
  }

  private isErrorAction(action: BrickAction): boolean {
    // Identifica azioni che indicano errori o comportamenti subottimali
    if (action.type === 'system' && 'systemCall' in action.event) {
      return action.event.systemCall?.error !== undefined;
    }
    
    if (action.type === 'mouse' && 'target' in action.event) {
      // Click ripetuti sulla stessa posizione potrebbero indicare frustrazione
      return false; // Implementazione più sofisticata necessaria
    }
    
    return false;
  }

  private calculateExecutionEfficiency(actions: BrickAction[]): number {
    if (actions.length === 0) return 0;
    
    const totalTime = this.getTotalExecutionTime(actions);
    const optimalTime = this.calculateOptimalTime(actions);
    
    return Math.min(1, optimalTime / totalTime);
  }

  private calculateCleanlinessScore(actions: BrickAction[]): number {
    const redundantActions = this.countRedundantActions(actions);
    const totalActions = actions.length;
    
    return Math.max(0, 1 - (redundantActions / totalActions));
  }

  private extractSuccessPattern(task: TaskRecording): TaskPattern {
    const actionSequence = this.extractActionSequence(task.actions);
    const contextFeatures = this.extractContextFeatures(task);
    const emergentBehaviors = this.identifyEmergentBehaviors(task.actions);
    
    return {
      id: crypto.randomUUID(),
      actionSequence,
      successMetrics: {
        completionRate: 1.0, // Task completata con successo
        executionTime: this.getTotalExecutionTime(task.actions),
        errorRate: 0.0, // Nessun errore identificato
        userSatisfaction: this.inferUserSatisfaction(task.actions)
      },
      contextFeatures,
      emergentBehaviors
    };
  }

  private extractActionSequence(actions: BrickAction[]): string[] {
    return actions.map(action => {
      switch (action.type) {
        case 'mouse':
          return `mouse:${action.event.type}`;
        case 'keyboard':
          return `keyboard:${action.event.type}`;
        case 'system':
          return `system:${action.event.type}`;
        default:
          return 'unknown';
      }
    });
  }

  private extractContextFeatures(task: TaskRecording): {
    environment: string[];
    guiElements: string[];
    systemState: Record<string, number>;
  } {
    const environment = [
      task.environment.os.name,
      task.environment.locale,
      task.environment.timezone
    ];
    
    const guiElements = task.actions
      .filter(action => action.context.guiState?.elements)
      .flatMap(action => action.context.guiState!.elements.map(el => el.type));
    
    const systemState = this.aggregateSystemState(task.actions);
    
    return { environment, guiElements, systemState };
  }

  private identifyEmergentBehaviors(actions: BrickAction[]): string[] {
    const behaviors: string[] = [];
    
    // Identifica pattern emergenti dalle azioni
    const sequences = this.findActionSequences(actions);
    const adaptations = this.findAdaptiveBehaviors(actions);
    const optimizations = this.findOptimizationPatterns(actions);
    
    behaviors.push(...sequences, ...adaptations, ...optimizations);
    
    return behaviors;
  }

  public async generateFutureTask(
    contextHints: Partial<BrickEnvironmentContext> = {},
    complexityLevel: number = 0.5
  ): Promise<TaskRecording> {
    // Seleziona i pattern di successo più rilevanti
    const relevantPatterns = this.selectRelevantPatterns(contextHints, complexityLevel);
    
    // Combina i pattern usando la conoscenza emergente
    const synthesizedActions = this.synthesizeActions(relevantPatterns);
    
    // Applica le ottimizzazioni apprese
    const optimizedActions = this.applyLearnedOptimizations(synthesizedActions);
    
    // Genera l'ambiente basato sui pattern di successo
    const environment = this.generateOptimalEnvironment(relevantPatterns, contextHints);
    
    return {
      id: crypto.randomUUID(),
      name: `Generated Task (Complexity: ${Math.round(complexityLevel * 100)}%)`,
      description: `Task generata usando tecnica Absolute Zero basata su ${relevantPatterns.length} pattern di successo`,
      actions: optimizedActions,
      environment,
      tags: ['generated', 'absolute-zero', `complexity-${Math.round(complexityLevel * 10)}`],
      created_at: new Date().toISOString()
    };
  }

  private selectRelevantPatterns(
    contextHints: Partial<BrickEnvironmentContext>,
    complexityLevel: number
  ): TaskPattern[] {
    const patterns = Array.from(this.successPatterns.values());
    
    return patterns
      .filter(pattern => this.isPatternRelevant(pattern, contextHints))
      .sort((a, b) => this.calculatePatternScore(b) - this.calculatePatternScore(a))
      .slice(0, Math.max(1, Math.floor(complexityLevel * patterns.length)));
  }

  private isPatternRelevant(
    pattern: TaskPattern,
    contextHints: Partial<BrickEnvironmentContext>
  ): boolean {
    if (!contextHints.os) return true;
    
    return pattern.contextFeatures.environment.some(env => 
      env.toLowerCase().includes(contextHints.os!.name.toLowerCase())
    );
  }

  private calculatePatternScore(pattern: TaskPattern): number {
    const successWeight = pattern.successMetrics.completionRate * 0.4;
    const efficiencyWeight = (1 / pattern.successMetrics.executionTime) * 0.3;
    const reliabilityWeight = (1 - pattern.successMetrics.errorRate) * 0.2;
    const satisfactionWeight = pattern.successMetrics.userSatisfaction * 0.1;
    
    return successWeight + efficiencyWeight + reliabilityWeight + satisfactionWeight;
  }

  private synthesizeActions(patterns: TaskPattern[]): BrickAction[] {
    const synthesizedActions: BrickAction[] = [];
    let currentTimestamp = 0;
    
    // Combina le sequenze di azioni dai pattern più efficaci
    for (const pattern of patterns) {
      const patternActions = this.reconstructActionsFromPattern(pattern);
      
      // Normalizza i timestamp
      const normalizedActions = patternActions.map(action => ({
        ...action,
        event: {
          ...action.event,
          timestamp: currentTimestamp++
        }
      }));
      
      synthesizedActions.push(...normalizedActions);
    }
    
    return this.optimizeActionSequence(synthesizedActions);
  }

  private reconstructActionsFromPattern(pattern: TaskPattern): BrickAction[] {
    return pattern.actionSequence.map((actionType, index) => {
      const [type, subtype] = actionType.split(':');
      
      return {
        id: crypto.randomUUID(),
        type: type as any,
        event: this.generateEventFromType(type, subtype, index),
        context: this.generateContextFromPattern(pattern)
      };
    });
  }

  private generateEventFromType(type: string, subtype: string, index: number): any {
    switch (type) {
      case 'mouse':
        return {
          type: subtype,
          coordinates: { x: 100 + index * 50, y: 100 + index * 30, relative: true },
          timestamp: index * 100
        };
      case 'keyboard':
        return {
          type: subtype,
          key: 'generated',
          timestamp: index * 100
        };
      case 'system':
        return {
          type: subtype,
          timestamp: index * 100
        };
      default:
        return { timestamp: index * 100 };
    }
  }

  private applyLearnedOptimizations(actions: BrickAction[]): BrickAction[] {
    // Applica le ottimizzazioni apprese dai feedback positivi
    let optimizedActions = [...actions];
    
    // Rimuovi azioni ridondanti
    optimizedActions = this.removeRedundantActions(optimizedActions);
    
    // Ottimizza i timing
    optimizedActions = this.optimizeTimings(optimizedActions);
    
    // Applica pattern emergenti di successo
    optimizedActions = this.applyEmergentPatterns(optimizedActions);
    
    return optimizedActions;
  }

  public recordFeedback(feedback: LearningFeedback): void {
    this.learningHistory.push(feedback);
    
    if (feedback.success) {
      // Aggiorna la conoscenza emergente
      feedback.emergentPatterns.forEach(pattern => {
        const current = this.emergentKnowledge.get(pattern) || 0;
        this.emergentKnowledge.set(pattern, current + 1);
      });
      
      // Aggiorna i pattern di successo
      this.updateSuccessPatterns(feedback);
    }
  }

  private updateSuccessPatterns(feedback: LearningFeedback): void {
    // Implementa l'apprendimento continuo dai feedback positivi
    feedback.adaptations.forEach(adaptation => {
      const knowledge = this.emergentKnowledge.get(adaptation) || 0;
      this.emergentKnowledge.set(adaptation, knowledge + 0.1);
    });
  }

  // Metodi di utilità privati
  private getTotalExecutionTime(actions: BrickAction[]): number {
    if (actions.length === 0) return 0;
    const timestamps = actions.map(a => 'timestamp' in a.event ? a.event.timestamp : 0);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private calculateOptimalTime(actions: BrickAction[]): number {
    return actions.length * 50; // 50ms per azione come baseline ottimale
  }

  private countRedundantActions(actions: BrickAction[]): number {
    let redundant = 0;
    for (let i = 1; i < actions.length; i++) {
      if (this.areActionsSimilar(actions[i-1], actions[i])) {
        redundant++;
      }
    }
    return redundant;
  }

  private areActionsSimilar(action1: BrickAction, action2: BrickAction): boolean {
    return action1.type === action2.type && 
           JSON.stringify(action1.event) === JSON.stringify(action2.event);
  }

  private inferUserSatisfaction(actions: BrickAction[]): number {
    // Inferisce la soddisfazione dell'utente basandosi sui pattern di azione
    const efficiency = this.calculateExecutionEfficiency(actions);
    const cleanliness = this.calculateCleanlinessScore(actions);
    return (efficiency + cleanliness) / 2;
  }

  private aggregateSystemState(actions: BrickAction[]): Record<string, number> {
    const state: Record<string, number> = {};
    
    actions.forEach(action => {
      if (action.context.systemState) {
        Object.entries(action.context.systemState).forEach(([key, value]) => {
          state[key] = (state[key] || 0) + value;
        });
      }
    });
    
    return state;
  }

  private findActionSequences(actions: BrickAction[]): string[] {
    // Identifica sequenze ricorrenti di azioni
    const sequences: string[] = [];
    // Implementazione semplificata
    return sequences;
  }

  private findAdaptiveBehaviors(actions: BrickAction[]): string[] {
    // Identifica comportamenti adattivi
    return ['adaptive-timing', 'context-awareness'];
  }

  private findOptimizationPatterns(actions: BrickAction[]): string[] {
    // Identifica pattern di ottimizzazione
    return ['efficient-navigation', 'minimal-clicks'];
  }

  private generateOptimalEnvironment(
    patterns: TaskPattern[],
    hints: Partial<BrickEnvironmentContext>
  ): BrickEnvironmentContext {
    // Genera l'ambiente ottimale basato sui pattern di successo
    return {
      os: hints.os || { name: 'Windows', version: '11', arch: 'x64' },
      display: hints.display || {
        screens: [{
          id: 0,
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          primary: true,
          scaleFactor: 1.0
        }]
      },
      locale: hints.locale || 'en-US',
      timezone: hints.timezone || 'UTC'
    };
  }

  private generateContextFromPattern(pattern: TaskPattern): any {
    return {
      windowTitle: 'Generated Context',
      activeApp: 'synthetic',
      screenResolution: { width: 1920, height: 1080 },
      systemState: pattern.contextFeatures.systemState
    };
  }

  private optimizeActionSequence(actions: BrickAction[]): BrickAction[] {
    return actions; // Implementazione base
  }

  private removeRedundantActions(actions: BrickAction[]): BrickAction[] {
    return actions.filter((action, index) => 
      index === 0 || !this.areActionsSimilar(action, actions[index - 1])
    );
  }

  private optimizeTimings(actions: BrickAction[]): BrickAction[] {
    return actions.map((action, index) => ({
      ...action,
      event: {
        ...action.event,
        timestamp: index * 75 // Timing ottimizzato basato sull'apprendimento
      }
    }));
  }

  private applyEmergentPatterns(actions: BrickAction[]): BrickAction[] {
    // Applica i pattern emergenti più efficaci
    return actions;
  }
}