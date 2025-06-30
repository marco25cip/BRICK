export * from './types';
export * from './recorder';
export * from './player';
export * from './mcp';
export * from './database';
export * from './task-generator';
export * from './absolute-zero-generator';

// BRICK Protocol Version 1.0
export const BRICK_VERSION = '1.0';

/**
 * BRICK (Behavioral Recording & Interaction Capture Kit) Protocol
 * 
 * Purpose:
 * - Capture and standardize computer interactions
 * - Work in synergy with MCP (Model Context Protocol)
 * - Enable precise replay of user actions
 * - Generate structured instructions for LLMs
 * - Store and retrieve task recordings from database
 * - Generate synthetic task variations for training
 * - Implement Absolute Zero learning for future task generation
 * 
 * Features:
 * - Automatic task recording
 * - Mouse event recording (clicks, movements, etc.)
 * - Keyboard input capture
 * - System event monitoring
 * - Action serialization and playback
 * - MCP instruction generation
 * - Database integration for task storage
 * - Process and system call tracking
 * - Synthetic task generation
 * - Absolute Zero learning from successful executions
 * 
 * Integration with MCP:
 * - Provides structured interaction data
 * - Enables context-aware automation
 * - Facilitates learning from user behavior
 * - Generates executable instructions
 * - Stores recordings for LLM training
 * - Learns optimal patterns without human examples
 * 
 * Note: This browser implementation is a proof of concept.
 * For full system-level integration, native modules would be required
 * for Windows/Mac system function access.
 */