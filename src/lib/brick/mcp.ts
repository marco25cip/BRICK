import { BrickAction, BrickSystemCall } from './types';

export interface MCPInstruction {
  type: 'click' | 'type' | 'navigate' | 'system' | 'wait';
  target?: string;
  value?: string;
  selector?: string;
  systemCall?: BrickSystemCall;
  description: string;
  context?: string;
}

export class MCPTranslator {
  private static instance: MCPTranslator;
  
  private constructor() {}

  public static getInstance(): MCPTranslator {
    if (!MCPTranslator.instance) {
      MCPTranslator.instance = new MCPTranslator();
    }
    return MCPTranslator.instance;
  }

  public translateToInstructions(actions: BrickAction[]): MCPInstruction[] {
    const instructions: MCPInstruction[] = [];
    let currentContext = '';

    for (const action of actions) {
      // Update context if window or application changes
      if (action.context.windowTitle && action.context.windowTitle !== currentContext) {
        currentContext = action.context.windowTitle;
        instructions.push({
          type: 'system',
          description: `Focus window: ${currentContext}`,
          context: currentContext
        });
      }

      switch (action.type) {
        case 'mouse':
          if ('target' in action.event) {
            instructions.push({
              type: 'click',
              target: action.event.target?.text || action.event.target?.element,
              selector: action.event.target?.selector,
              description: `Click ${action.event.target?.text || action.event.target?.element}`,
              context: currentContext
            });
          }
          break;

        case 'keyboard':
          if ('key' in action.event && action.event.type === 'textInput') {
            instructions.push({
              type: 'type',
              value: action.event.key,
              description: `Type "${action.event.key}"`,
              context: currentContext
            });
          }
          break;

        case 'system':
          if ('systemCall' in action.event && action.event.systemCall) {
            instructions.push({
              type: 'system',
              systemCall: action.event.systemCall,
              description: `Execute system call: ${action.event.systemCall.type} - ${action.event.systemCall.function}`,
              context: currentContext
            });
          }
          break;
      }
    }

    return this.optimizeInstructions(instructions);
  }

  private optimizeInstructions(instructions: MCPInstruction[]): MCPInstruction[] {
    const optimized: MCPInstruction[] = [];
    let currentTextInput = '';
    let currentContext = '';

    for (const instruction of instructions) {
      // Group consecutive text inputs
      if (instruction.type === 'type' && instruction.context === currentContext) {
        currentTextInput += instruction.value || '';
        continue;
      } else if (currentTextInput) {
        optimized.push({
          type: 'type',
          value: currentTextInput,
          description: `Type "${currentTextInput}"`,
          context: currentContext
        });
        currentTextInput = '';
      }

      // Add the current instruction
      optimized.push(instruction);
      currentContext = instruction.context || currentContext;
    }

    // Add any remaining text input
    if (currentTextInput) {
      optimized.push({
        type: 'type',
        value: currentTextInput,
        description: `Type "${currentTextInput}"`,
        context: currentContext
      });
    }

    return optimized;
  }

  public generateLLMPrompt(instructions: MCPInstruction[]): string {
    let prompt = 'To complete this task, follow these steps:\n\n';
    
    instructions.forEach((instruction, index) => {
      prompt += `${index + 1}. ${instruction.description}\n`;
      if (instruction.context) {
        prompt += `   Context: ${instruction.context}\n`;
      }
      if (instruction.selector) {
        prompt += `   Target: ${instruction.selector}\n`;
      }
      prompt += '\n';
    });

    return prompt;
  }

  public generateExecutableCode(instructions: MCPInstruction[]): string {
    let code = `async function executeTask() {\n`;
    
    instructions.forEach(instruction => {
      switch (instruction.type) {
        case 'click':
          code += `  await click('${instruction.selector}');\n`;
          break;
        case 'type':
          code += `  await type('${instruction.value}');\n`;
          break;
        case 'system':
          if (instruction.systemCall) {
            code += `  await executeSystemCall('${instruction.systemCall.type}', ${JSON.stringify(instruction.systemCall.parameters)});\n`;
          }
          break;
        case 'wait':
          code += `  await wait(1000);\n`;
          break;
      }
    });

    code += `}\n`;
    return code;
  }
}