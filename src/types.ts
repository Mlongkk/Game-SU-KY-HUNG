/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Item {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  type: 'artifact' | 'key' | 'tool';
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  type: 'sequence' | 'quiz' | 'pattern';
  question: string;
  options?: string[];
  answer: string | string[];
  hint: string;
  rewardItemId?: string;
  difficulty?: 'easy' | 'hard';
}

export interface RoomObject {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  puzzleId?: string;
  itemId?: string;
  locked?: boolean;
}

export interface Level {
  id: string;
  name: string;
  era: string;
  description: string;
  objects: RoomObject[];
  puzzles: Record<string, Puzzle>;
  background: string;
}

export interface GameState {
  currentLevelId: string;
  inventory: Item[];
  solvedPuzzles: string[];
  completedLevels: string[];
  isGameWon: boolean;
  message: string;
  lives: number;
  isCriticalMessage: boolean;
  aiUsesCount: Record<string, number>;
}
