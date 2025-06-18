
export enum PieceType {
  PAWN = 'PAWN',
  ROOK = 'ROOK',
  KNIGHT = 'KNIGHT',
  BISHOP = 'BISHOP',
  QUEEN = 'QUEEN',
  KING = 'KING',
}

export enum PieceColor {
  WHITE = 'white',
  BLACK = 'black',
}

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean; // For castling and pawn's first move
}

export type SquareId = string; // e.g., "a1", "h8"

export interface SquareState {
  id: SquareId;
  piece: Piece | null;
  isHighlighted?: boolean;
  isValidMove?: boolean;
  isCheck?: boolean;
  isSelected?: boolean;
}

export type BoardState = SquareState[][]; // 8x8 grid

export interface Move {
  from: SquareId;
  to: SquareId;
  promotion?: PieceType; // For pawn promotion
}

export interface CastlingAvailability {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export interface GameState {
  boardState: BoardState;
  currentPlayer: PieceColor;
  castlingAvailability: CastlingAvailability;
  enPassantTarget: SquareId | null;
  halfMoveClock: number; // For 50-move rule
  fullMoveNumber: number;
  selectedSquare: SquareId | null;
  validMoves: SquareId[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean; // Could be due to 50-move, threefold repetition, insufficient material
  winner: PieceColor | null;
  promotingPawn: { from: SquareId, to: SquareId } | null;
  gameStatusMessage: string;
  moveHistory: Move[]; // For FEN history and potential future features
}

export type Difficulty = 1 | 2 | 3 | 4;
    