import { createClient } from '@supabase/supabase-js';
import { BrickAction, BrickEnvironmentContext } from './types';

export interface TaskRecording {
  id: string;
  name: string;
  description: string;
  actions: BrickAction[];
  environment: BrickEnvironmentContext;
  created_at: string;
  tags: string[];
}

export class BrickDatabase {
  private static instance: BrickDatabase;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  public static getInstance(): BrickDatabase {
    if (!BrickDatabase.instance) {
      BrickDatabase.instance = new BrickDatabase();
    }
    return BrickDatabase.instance;
  }

  public async saveRecording(
    name: string,
    description: string,
    actions: BrickAction[],
    environment: BrickEnvironmentContext,
    tags: string[] = []
  ): Promise<string> {
    const recording: Omit<TaskRecording, 'id' | 'created_at'> = {
      name,
      description,
      actions,
      environment,
      tags
    };

    const { data, error } = await this.supabase
      .from('task_recordings')
      .insert(recording)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  public async getRecording(id: string): Promise<TaskRecording> {
    const { data, error } = await this.supabase
      .from('task_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  public async searchRecordings(query: string): Promise<TaskRecording[]> {
    const { data, error } = await this.supabase
      .from('task_recordings')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`);

    if (error) throw error;
    return data;
  }

  public async getRecordingsByProcess(processName: string): Promise<TaskRecording[]> {
    const { data, error } = await this.supabase
      .from('task_recordings')
      .select('*')
      .contains('actions', [{ context: { activeApp: processName } }]);

    if (error) throw error;
    return data;
  }

  public async getRecordingsBySystemCall(systemCallType: string): Promise<TaskRecording[]> {
    const { data, error } = await this.supabase
      .from('task_recordings')
      .select('*')
      .contains('actions', [{ type: 'system', event: { systemCall: { type: systemCallType } } }]);

    if (error) throw error;
    return data;
  }

  public async getSimilarRecordings(taskId: string, limit: number = 5): Promise<TaskRecording[]> {
    const baseTask = await this.getRecording(taskId);
    
    const { data, error } = await this.supabase
      .from('task_recordings')
      .select('*')
      .contains('tags', baseTask.tags)
      .neq('id', taskId)
      .limit(limit);

    if (error) throw error;
    return data;
  }
}