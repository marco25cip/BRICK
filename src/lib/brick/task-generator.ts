import { BrickAction, BrickEnvironmentContext, BrickGUIElement } from './types';
import { BrickDatabase, TaskRecording } from './database';

export class TaskGenerator {
  private static instance: TaskGenerator;
  private database: BrickDatabase;

  private constructor() {
    this.database = BrickDatabase.getInstance();
  }

  public static getInstance(): TaskGenerator {
    if (!TaskGenerator.instance) {
      TaskGenerator.instance = new TaskGenerator();
    }
    return TaskGenerator.instance;
  }

  public async generateSyntheticTask(
    baseTask: TaskRecording,
    variations: number = 1
  ): Promise<TaskRecording[]> {
    const syntheticTasks: TaskRecording[] = [];

    for (let i = 0; i < variations; i++) {
      const synthetic = await this.createVariation(baseTask);
      syntheticTasks.push(synthetic);
    }

    return syntheticTasks;
  }

  public async generateFromMultipleTasks(
    tasks: TaskRecording[],
    count: number = 1
  ): Promise<TaskRecording[]> {
    const syntheticTasks: TaskRecording[] = [];
    
    for (let i = 0; i < count; i++) {
      const synthetic = await this.mergeTasks(tasks);
      syntheticTasks.push(synthetic);
    }

    return syntheticTasks;
  }

  private async createVariation(task: TaskRecording): Promise<TaskRecording> {
    const actions = this.varyActions(task.actions);
    const environment = this.varyEnvironment(task.environment);

    return {
      id: crypto.randomUUID(),
      name: `${task.name} (Variation)`,
      description: `Synthetic variation of: ${task.description}`,
      actions,
      environment,
      tags: [...task.tags, 'synthetic'],
      created_at: new Date().toISOString()
    };
  }

  private varyActions(actions: BrickAction[]): BrickAction[] {
    return actions.map(action => {
      const variedAction = { ...action };

      switch (action.type) {
        case 'mouse':
          // Vary mouse coordinates within reasonable bounds
          if ('coordinates' in action.event) {
            variedAction.event = {
              ...action.event,
              coordinates: {
                x: action.event.coordinates.x + this.randomVariation(20),
                y: action.event.coordinates.y + this.randomVariation(20),
                relative: action.event.coordinates.relative
              }
            };
          }
          break;

        case 'keyboard':
          // Vary typing speed and potentially add common typos
          if ('timestamp' in action.event) {
            variedAction.event = {
              ...action.event,
              timestamp: action.event.timestamp + this.randomVariation(100)
            };
          }
          break;

        case 'system':
          // Vary system state metrics
          if (variedAction.context.systemState) {
            variedAction.context.systemState = {
              ...variedAction.context.systemState,
              cpuUsage: variedAction.context.systemState.cpuUsage + this.randomVariation(10),
              memoryUsage: variedAction.context.systemState.memoryUsage + this.randomVariation(100000)
            };
          }
          break;
      }

      return variedAction;
    });
  }

  private varyEnvironment(env: BrickEnvironmentContext): BrickEnvironmentContext {
    return {
      ...env,
      display: {
        screens: env.display.screens.map(screen => ({
          ...screen,
          scaleFactor: screen.scaleFactor + this.randomVariation(0.1)
        }))
      }
    };
  }

  private async mergeTasks(tasks: TaskRecording[]): Promise<TaskRecording> {
    // Select random segments from each task
    const mergedActions: BrickAction[] = [];
    const usedTasks = new Set<string>();

    tasks.forEach(task => {
      const segmentSize = Math.floor(Math.random() * task.actions.length);
      const startIndex = Math.floor(Math.random() * (task.actions.length - segmentSize));
      
      const segment = task.actions.slice(startIndex, startIndex + segmentSize);
      mergedActions.push(...this.normalizeActionTimestamps(segment, mergedActions));
      
      usedTasks.add(task.name);
    });

    // Sort actions by timestamp
    mergedActions.sort((a, b) => {
      const aTime = 'timestamp' in a.event ? a.event.timestamp : 0;
      const bTime = 'timestamp' in b.event ? b.event.timestamp : 0;
      return aTime - bTime;
    });

    return {
      id: crypto.randomUUID(),
      name: `Merged Task (${Array.from(usedTasks).join(' + ')})`,
      description: `Synthetic task generated from multiple recordings`,
      actions: mergedActions,
      environment: tasks[0].environment, // Use first task's environment as base
      tags: [...new Set(tasks.flatMap(t => t.tags)), 'synthetic', 'merged'],
      created_at: new Date().toISOString()
    };
  }

  private normalizeActionTimestamps(
    actions: BrickAction[],
    existingActions: BrickAction[]
  ): BrickAction[] {
    const lastTimestamp = existingActions.length > 0 
      ? Math.max(...existingActions.map(a => 'timestamp' in a.event ? a.event.timestamp : 0))
      : 0;

    return actions.map((action, index) => ({
      ...action,
      event: {
        ...action.event,
        timestamp: lastTimestamp + index * 100 // Add 100ms between actions
      }
    }));
  }

  private randomVariation(max: number): number {
    return (Math.random() - 0.5) * max;
  }

  public async saveGeneratedTask(task: TaskRecording): Promise<string> {
    return await this.database.saveRecording(
      task.name,
      task.description,
      task.actions,
      task.environment,
      task.tags
    );
  }

  public async generateAndSaveVariations(
    baseTask: TaskRecording,
    count: number = 1
  ): Promise<string[]> {
    const variations = await this.generateSyntheticTask(baseTask, count);
    const ids = await Promise.all(
      variations.map(task => this.saveGeneratedTask(task))
    );
    return ids;
  }
}