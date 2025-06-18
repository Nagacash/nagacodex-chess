import { SquareId, Piece, PieceType, PieceColor } from '../types';
import { BOARD_ROWS, BOARD_COLS, COLUMN_NAMES, INITIAL_ROOK_POSITIONS, INITIAL_KING_POSITION } from '../constants';

export const getSquareCoordinates = (squareId: SquareId): { row: number, col: number } | null => {
  if (squareId.length !== 2) return null;
  const colChar = squareId[0];
  const rowChar = squareId[1];
  const col = COLUMN_NAMES.indexOf(colChar);
  const row = BOARD_ROWS - parseInt(rowChar, 10);
  if (col === -1 || isNaN(row) || row < 0 || row >= BOARD_ROWS) return null;
  return { row, col };
};

export const getSquareId = (row: number, col: number): SquareId | null => {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null;
  const colChar = COLUMN_NAMES[col];
  const rowChar = (BOARD_ROWS - row).toString();
  return `${colChar}${rowChar}`;
};

export const createInitialBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

  const placePiece = (squareId: SquareId, piece: Piece) => {
    const coords = getSquareCoordinates(squareId);
    if (coords) {
      board[coords.row][coords.col] = piece;
    }
  };

  // Pawns
  for (let i = 0; i < BOARD_COLS; i++) {
    placePiece(getSquareId(1, i)!, { type: PieceType.PAWN, color: PieceColor.BLACK, hasMoved: false });
    placePiece(getSquareId(6, i)!, { type: PieceType.PAWN, color: PieceColor.WHITE, hasMoved: false });
  }

  // Rooks
  placePiece(INITIAL_ROOK_POSITIONS[PieceColor.BLACK].queenSide, { type: PieceType.ROOK, color: PieceColor.BLACK, hasMoved: false });
  placePiece(INITIAL_ROOK_POSITIONS[PieceColor.BLACK].kingSide, { type: PieceType.ROOK, color: PieceColor.BLACK, hasMoved: false });
  placePiece(INITIAL_ROOK_POSITIONS[PieceColor.WHITE].queenSide, { type: PieceType.ROOK, color: PieceColor.WHITE, hasMoved: false });
  placePiece(INITIAL_ROOK_POSITIONS[PieceColor.WHITE].kingSide, { type: PieceType.ROOK, color: PieceColor.WHITE, hasMoved: false });
  
  // Knights
  placePiece('b8', { type: PieceType.KNIGHT, color: PieceColor.BLACK });
  placePiece('g8', { type: PieceType.KNIGHT, color: PieceColor.BLACK });
  placePiece('b1', { type: PieceType.KNIGHT, color: PieceColor.WHITE });
  placePiece('g1', { type: PieceType.KNIGHT, color: PieceColor.WHITE });

  // Bishops
  placePiece('c8', { type: PieceType.BISHOP, color: PieceColor.BLACK });
  placePiece('f8', { type: PieceType.BISHOP, color: PieceColor.BLACK });
  placePiece('c1', { type: PieceType.BISHOP, color: PieceColor.WHITE });
  placePiece('f1', { type: PieceType.BISHOP, color: PieceColor.WHITE });

  // Queens
  placePiece('d8', { type: PieceType.QUEEN, color: PieceColor.BLACK });
  placePiece('d1', { type: PieceType.QUEEN, color: PieceColor.WHITE });
  
  // Kings
  placePiece(INITIAL_KING_POSITION[PieceColor.BLACK], { type: PieceType.KING, color: PieceColor.BLACK, hasMoved: false });
  placePiece(INITIAL_KING_POSITION[PieceColor.WHITE], { type: PieceType.KING, color: PieceColor.WHITE, hasMoved: false });

  return board; 
};
