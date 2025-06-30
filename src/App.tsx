import React, { useState, useEffect } from 'react';
import { BrickRecorder, BrickPlayer } from './lib/brick';
import { MCPTranslator } from './lib/brick/mcp';
import { BrickDatabase } from './lib/brick/database';
import { TaskGenerator } from './lib/brick/task-generator';
import { AbsoluteZeroGenerator } from './lib/brick/absolute-zero-generator';
import { Play, Square, Circle, Save, Zap, Brain, Target } from 'lucide-react';

function App() {
  const [recorder] = useState(() => new BrickRecorder());
  const [player] = useState(() => new BrickPlayer());
  const [mcpTranslator] = useState(() => MCPTranslator.getInstance());
  const [database] = useState(() => BrickDatabase.getInstance());
  const [taskGenerator] = useState(() => TaskGenerator.getInstance());
  const [absoluteZeroGen] = useState(() => AbsoluteZeroGenerator.getInstance());
  const [isRecording, setIsRecording] = useState(false);
  const [recordedActions, setRecordedActions] = useState<string>('');
  const [mcpInstructions, setMcpInstructions] = useState<string>('');
  const [executableCode, setExecutableCode] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [generatedTask, setGeneratedTask] = useState<string>('');
  const [absoluteZeroTask, setAbsoluteZeroTask] = useState<string>('');

  // Check for environment variables
  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase configuration is missing. Please connect to Supabase first.');
      return;
    }
    handleStartRecording();
    return () => recorder.dispose();
  }, []);

  const handleStartRecording = () => {
    try {
      recorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Failed to start recording. Please try again.');
      console.error('Recording error:', err);
    }
  };

  const handleStopRecording = () => {
    try {
      const actions = recorder.stop();
      const instructions = mcpTranslator.translateToInstructions(actions);
      const llmPrompt = mcpTranslator.generateLLMPrompt(instructions);
      const code = mcpTranslator.generateExecutableCode(instructions);

      setRecordedActions(JSON.stringify(actions, null, 2));
      setMcpInstructions(llmPrompt);
      setExecutableCode(code);
      setIsRecording(false);
      player.load(actions);
    } catch (err) {
      setError('Failed to stop recording. Please try again.');
      console.error('Stop recording error:', err);
    }
  };

  const handlePlayback = () => {
    try {
      player.play();
    } catch (err) {
      setError('Failed to play recording. Please try again.');
      console.error('Playback error:', err);
    }
  };

  const handleSaveRecording = async () => {
    if (!recordedActions) return;
    
    try {
      const actions = JSON.parse(recordedActions);
      const environment = recorder.getCurrentEnvironment();
      const tags = extractTags(actions);
      
      await database.saveRecording(
        taskName || 'Untitled Task',
        taskDescription || 'No description provided',
        actions,
        environment,
        tags
      );

      alert('Recording saved successfully!');
    } catch (err) {
      setError('Failed to save recording. Please try again.');
      console.error('Save error:', err);
    }
  };

  const handleGenerateSyntheticTask = async () => {
    if (!recordedActions) return;
    
    try {
      const actions = JSON.parse(recordedActions);
      const environment = recorder.getCurrentEnvironment();
      const tags = extractTags(actions);
      
      const baseTask = {
        id: crypto.randomUUID(),
        name: taskName || 'Base Task',
        description: taskDescription || 'Base task for generation',
        actions,
        environment,
        tags,
        created_at: new Date().toISOString()
      };

      const syntheticTasks = await taskGenerator.generateSyntheticTask(baseTask, 1);
      setGeneratedTask(JSON.stringify(syntheticTasks[0], null, 2));
      
      alert('Synthetic task generated successfully!');
    } catch (err) {
      setError('Failed to generate synthetic task. Please try again.');
      console.error('Generation error:', err);
    }
  };

  const handleGenerateAbsoluteZeroTask = async () => {
    try {
      const contextHints = {
        os: { name: 'Browser', version: '1.0', arch: 'web' }
      };
      
      const complexityLevel = 0.7; // Complessità media-alta
      
      const futureTask = await absoluteZeroGen.generateFutureTask(contextHints, complexityLevel);
      setAbsoluteZeroTask(JSON.stringify(futureTask, null, 2));
      
      // Simula feedback positivo per l'apprendimento
      absoluteZeroGen.recordFeedback({
        taskId: futureTask.id,
        success: true,
        executionTime: 1500,
        errors: [],
        adaptations: ['efficient-navigation', 'optimal-timing'],
        emergentPatterns: ['context-aware-clicking', 'predictive-typing']
      });
      
      alert('Absolute Zero task generated successfully!');
    } catch (err) {
      setError('Failed to generate Absolute Zero task. Please try again.');
      console.error('Absolute Zero generation error:', err);
    }
  };

  const extractTags = (actions: any[]) => {
    const tags = new Set<string>();
    
    actions.forEach(action => {
      if (action.context?.activeApp) {
        tags.add(action.context.activeApp);
      }
      if (action.type === 'system' && action.event?.systemCall?.type) {
        tags.add(action.event.systemCall.type);
      }
    });

    return Array.from(tags);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Please click the "Connect to Supabase" button in the top right corner to set up your database connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BRICK Protocol Demo - Absolute Zero Learning
          </h1>
          <p className="text-gray-600 mb-4">
            Sistema avanzato di registrazione e generazione task con apprendimento Absolute Zero. 
            Le nuove task vengono generate esclusivamente dai pattern di successo appresi, senza esempi umani.
          </p>
          
          <div className="flex gap-4 mb-6 flex-wrap">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                <Circle className="w-4 h-4" />
                Resume Recording
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            )}
            
            <button
              onClick={handlePlayback}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              disabled={!recordedActions}
            >
              <Play className="w-4 h-4" />
              Play Recording
            </button>

            <button
              onClick={handleSaveRecording}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              disabled={!recordedActions}
            >
              <Save className="w-4 h-4" />
              Save to Database
            </button>

            <button
              onClick={handleGenerateSyntheticTask}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              disabled={!recordedActions}
            >
              <Zap className="w-4 h-4" />
              Generate Synthetic
            </button>

            <button
              onClick={handleGenerateAbsoluteZeroTask}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded hover:from-orange-600 hover:to-red-600 transition-all"
            >
              <Brain className="w-4 h-4" />
              Absolute Zero Task
            </button>
          </div>

          {!isRecording && recordedActions && (
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">
                  Task Name
                </label>
                <input
                  type="text"
                  id="taskName"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  placeholder="Enter a name for this task"
                />
              </div>
              
              <div>
                <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700">
                  Task Description
                </label>
                <textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows={3}
                  placeholder="Describe what this task does"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded p-4">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  MCP Instructions
                </h2>
                <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {mcpInstructions || 'Instructions will appear here after recording'}
                </pre>
              </div>

              <div className="bg-gray-50 rounded p-4">
                <h2 className="text-lg font-semibold mb-2">Executable Code</h2>
                <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {executableCode || 'Code will appear here after recording'}
                </pre>
              </div>

              <div className="bg-gray-50 rounded p-4">
                <h2 className="text-lg font-semibold mb-2">Raw Recorded Actions</h2>
                <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {recordedActions || 'Recording in progress...'}
                </pre>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-purple-50 rounded p-4">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Generated Synthetic Task
                </h2>
                <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {generatedTask || 'Synthetic task will appear here after generation'}
                </pre>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded p-4 border border-orange-200">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-orange-600" />
                  Absolute Zero Generated Task
                </h2>
                <p className="text-sm text-orange-700 mb-3">
                  Task generata usando solo pattern di successo appresi, senza esempi umani
                </p>
                <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {absoluteZeroTask || 'Absolute Zero task will appear here after generation'}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Interaction Area</h2>
          <p className="text-gray-600 mb-4">
            Your interactions in this area are being recorded and analyzed for pattern learning:
          </p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Type something to create learning patterns..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex gap-4 flex-wrap">
              <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                Success Pattern Button
              </button>
              <button className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors">
                Learning Action
              </button>
              <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                Optimal Behavior
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center cursor-pointer hover:from-blue-200 hover:to-purple-200 transition-colors">
                <span className="text-gray-700 font-medium">Pattern Learning Area A</span>
              </div>
              <div className="h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:from-green-200 hover:to-blue-200 transition-colors">
                <span className="text-gray-700 font-medium">Pattern Learning Area B</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;