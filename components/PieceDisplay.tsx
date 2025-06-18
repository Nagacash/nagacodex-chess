
import React from 'react';
import { Piece } from '../types'; // PieceColor is implicitly part of Piece type via enum value
import { PIECE_UNICODE } from '../constants';

interface PieceDisplayProps {
  piece: Piece;
  sizeClass?: string; // e.g., 'text-4xl', 'text-5xl'
}

const PieceDisplay: React.FC<PieceDisplayProps> = ({ piece, sizeClass = 'text-4xl' }) => {
  const unicodeChar = PIECE_UNICODE[piece.color][piece.type];

  // White pieces are 'text-white'. Black pieces are 'text-neutral-800' (a very dark gray).
  // 'text-neutral-800' provides strong contrast on light squares for black pieces,
  // and is slightly better than pure black on the dark green squares.
  const colorClass = piece.color === 'white' ? 'text-white' : 'text-neutral-800';
  
  // Apply a drop shadow only to white pieces.
  // This helps them "pop" on light-colored squares, addressing the main visibility concern.
  // The 'filter' class enables drop-shadow utilities in Tailwind.
  const shadowAndFilterClass = piece.color === 'white' ? 'filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]' : '';

  return (
    <span 
      className={`${sizeClass} ${colorClass} ${shadowAndFilterClass} select-none`}
      // optimizeLegibility can sometimes improve rendering of text-based symbols
      style={{ textRendering: 'optimizeLegibility' }}
    >
      {unicodeChar}
    </span>
  );
};

export default PieceDisplay;
