
import React from 'react';
import { Difficulty } from '../types';

interface GameControlsProps {
  difficulty: Difficulty;
  onDifficultyChange: (level: Difficulty) => void;
  onResetGame: () => void;
  isGameInProgress: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({ difficulty, onDifficultyChange, onResetGame, isGameInProgress }) => {
  const difficulties: Difficulty[] = [1, 2, 3, 4];

  return (
    <div className="p-4 bg-slate-700 rounded-lg shadow-md space-y-4">
      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-slate-300 mb-1">
          AI Difficulty:
        </label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => onDifficultyChange(Number(e.target.value) as Difficulty)}
          className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={isGameInProgress}
        >
          {difficulties.map((level) => (
            <option key={level} value={level}>
              Level {level} {level === 1 ? '(Beginner)' : level === 2 ? '(Easy)' : level === 3 ? '(Medium)' : '(Hard)'}
            </option>
          ))}
        </select>
        {isGameInProgress && <p className="text-xs text-slate-400 mt-1">Difficulty cannot be changed mid-game. Reset to change.</p>}
      </div>

      <button
        onClick={onResetGame}
        className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors"
      >
        {isGameInProgress ? 'Reset Game' : 'Start New Game'}
      </button>
    </div>
  );
};

export default GameControls;
    