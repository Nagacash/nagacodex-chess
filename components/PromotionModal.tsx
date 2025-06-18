
import React from 'react';
import { PieceType, PieceColor } from '../types';
import { PIECE_UNICODE, PROMOTION_PIECES } from '../constants';
import PieceDisplay from './PieceDisplay';


interface PromotionModalProps {
  playerColor: PieceColor;
  onPromote: (pieceType: PieceType) => void;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ playerColor, onPromote }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-700 p-6 rounded-lg shadow-xl w-full max-w-xs sm:max-w-sm">
        <h3 className="text-xl font-semibold text-white mb-4 text-center">Promote Pawn To:</h3>
        <div className="flex justify-around space-x-2 sm:space-x-3">
          {PROMOTION_PIECES.map((type) => (
            <button
              key={type}
              onClick={() => onPromote(type)}
              className="p-2 sm:p-3 bg-slate-600 hover:bg-emerald-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={`Promote to ${type}`}
            >
              <PieceDisplay piece={{ type, color: playerColor }} sizeClass="text-4xl sm:text-5xl" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;