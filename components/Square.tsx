
import React from 'react';
import { SquareState, Piece as PieceTypeOnly } from '../types'; // Renamed Piece to avoid conflict
import PieceDisplay from './PieceDisplay';

interface SquareProps {
  squareData: SquareState;
  onSquareClick: (squareId: string) => void;
  isDark: boolean;
}

const Square: React.FC<SquareProps> = ({ squareData, onSquareClick, isDark }) => {
  const { id, piece, isSelected, isValidMove, isCheck } = squareData;

  let bgColor = isDark ? 'bg-emerald-700' : 'bg-emerald-100'; // Dark and light square colors

  if (isSelected) {
    bgColor = 'bg-yellow-400'; // Selected square color
  } else if (isCheck && piece && piece.type === 'KING') {
    bgColor = 'bg-red-500'; // King in check color
  } else if (isValidMove) {
    // Highlight for capturing a piece remains
    // Highlight for moving to an empty square is removed
    if (piece) { // If there's a piece on the valid move square (i.e., a capture)
        bgColor = 'bg-red-400'; 
    } else {
        // No specific highlight for empty valid move squares anymore
        // It will retain its original dark/light square color unless selected or check.
    }
  }
  
  return (
    <div
      className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center cursor-pointer transition-colors duration-150 ${bgColor}`}
      onClick={() => onSquareClick(id)}
      title={id}
    >
      {piece && <PieceDisplay piece={piece} sizeClass="text-xl sm:text-3xl md:text-4xl lg:text-5xl" />}
    </div>
  );
};

export default Square;
