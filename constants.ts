import { PieceType, PieceColor, Piece, Difficulty } from './types';

export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  [PieceColor.WHITE]: {
    [PieceType.KING]: '♔',
    [PieceType.QUEEN]: '♕',
    [PieceType.ROOK]: '♖',
    [PieceType.BISHOP]: '♗',
    [PieceType.KNIGHT]: '♘',
    [PieceType.PAWN]: '♙',
  },
  [PieceColor.BLACK]: {
    [PieceType.KING]: '♚',
    [PieceType.QUEEN]: '♛',
    [PieceType.ROOK]: '♜',
    [PieceType.BISHOP]: '♝',
    [PieceType.KNIGHT]: '♞',
    [PieceType.PAWN]: '♟', // Changed from ♟︎ to ♟ for wider compatibility
  },
};

export const INITIAL_ROOK_POSITIONS: Record<PieceColor, Record<'queenSide' | 'kingSide', string>> = {
  [PieceColor.WHITE]: { queenSide: 'a1', kingSide: 'h1' },
  [PieceColor.BLACK]: { queenSide: 'a8', kingSide: 'h8' },
};

export const INITIAL_KING_POSITION: Record<PieceColor, string> = {
  [PieceColor.WHITE]: 'e1',
  [PieceColor.BLACK]: 'e8',
};

export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;

export const COLUMN_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const PROMOTION_PIECES: PieceType[] = [
  PieceType.QUEEN,
  PieceType.ROOK,
  PieceType.BISHOP,
  PieceType.KNIGHT,
];

export const DEFAULT_DIFFICULTY: Difficulty = 2;