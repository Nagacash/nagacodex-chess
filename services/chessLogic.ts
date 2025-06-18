
import {
  Piece, PieceType, PieceColor, SquareId, Move,
  CastlingAvailability, GameState, SquareState
} from '../types';
import { BOARD_ROWS, BOARD_COLS, INITIAL_KING_POSITION, INITIAL_ROOK_POSITIONS, COLUMN_NAMES, PROMOTION_PIECES } from '../constants';
import { getSquareCoordinates, getSquareId, createInitialBoard as createInitialPieceArray } from '../utils/boardUtils';


export class ChessLogic {
  private board: (Piece | null)[][];
  private currentPlayer: PieceColor;
  private castlingAvailability: CastlingAvailability;
  private enPassantTarget: SquareId | null;
  private halfMoveClock: number;
  private fullMoveNumber: number;
  private moveHistory: Move[];

  constructor(initialGameState?: Partial<GameState>) {
    if (initialGameState && initialGameState.boardState) {
        this.board = initialGameState.boardState.map(row =>
            row.map(sq => sq.piece ? {...sq.piece} : null) // Deep copy pieces
        );
        this.currentPlayer = initialGameState.currentPlayer || PieceColor.WHITE;
        this.castlingAvailability = initialGameState.castlingAvailability ? {...initialGameState.castlingAvailability} : { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true };
        this.enPassantTarget = initialGameState.enPassantTarget || null;
        this.halfMoveClock = initialGameState.halfMoveClock || 0;
        this.fullMoveNumber = initialGameState.fullMoveNumber || 1;
        this.moveHistory = initialGameState.moveHistory ? [...initialGameState.moveHistory] : [];
    } else {
        this.board = createInitialPieceArray();
        this.currentPlayer = PieceColor.WHITE;
        this.castlingAvailability = { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.moveHistory = [];
    }
  }

  private isValidSquare(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
  }

  getBoard(): (Piece | null)[][] {
    return this.board.map(row => row.map(piece => piece ? {...piece} : null)); // Return a deep copy
  }

  getCurrentPlayer(): PieceColor {
    return this.currentPlayer;
  }

  getCastlingAvailability(): CastlingAvailability {
    return {...this.castlingAvailability};
  }

  getEnPassantTarget(): SquareId | null {
    return this.enPassantTarget;
  }

  getMoveNumber(): number {
    return this.fullMoveNumber;
  }

  getHalfMoveClock(): number {
    return this.halfMoveClock;
  }

  getPieceAt(squareId: SquareId): Piece | null {
    const coords = getSquareCoordinates(squareId);
    if (!coords) return null;
    const piece = this.board[coords.row][coords.col];
    return piece ? {...piece} : null; // Return a copy
  }

  private isSquareAttacked(squareId: SquareId, attackerColor: PieceColor, board: (Piece | null)[][]): boolean {
    const targetCoords = getSquareCoordinates(squareId);
    if (!targetCoords) return false;

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.color === attackerColor) {
          const fromCoords = { row: r, col: c };
          // Check pawn attacks (special)
          if (piece.type === PieceType.PAWN) {
            const direction = piece.color === PieceColor.WHITE ? -1 : 1;
            if (fromCoords.row + direction === targetCoords.row) {
              if (fromCoords.col + 1 === targetCoords.col || fromCoords.col - 1 === targetCoords.col) {
                return true;
              }
            }
          } else { // Check other pieces
            const pseudoMoves = this.generatePseudoLegalMovesForPiece(getSquareId(r,c)!, board, piece);
            if (pseudoMoves.some(moveTargetId => moveTargetId === squareId)) {
                return true;
            }
          }
        }
      }
    }
    return false;
  }

  isKingInCheck(kingColor: PieceColor, boardToCheck?: (Piece | null)[][]): boolean {
    const currentBoard = boardToCheck || this.board;
    let kingSquareId: SquareId | null = null;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.type === PieceType.KING && piece.color === kingColor) {
          kingSquareId = getSquareId(r, c);
          break;
        }
      }
      if (kingSquareId) break;
    }

    if (!kingSquareId) return false; // Should not happen in a valid game

    const opponentColor = kingColor === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    return this.isSquareAttacked(kingSquareId, opponentColor, currentBoard);
  }

  // Generates moves without checking for check legality (used by isSquareAttacked and as a first pass)
  private generatePseudoLegalMovesForPiece(squareId: SquareId, board: (Piece | null)[][], piece: Piece): SquareId[] {
    const fromCoords = getSquareCoordinates(squareId);
    if (!fromCoords) return [];
    let moves: SquareId[] = [];

    if (piece.type === PieceType.PAWN) {
        const direction = piece.color === PieceColor.WHITE ? -1 : 1;
        // Move one forward
        let toCoords = { row: fromCoords.row + direction, col: fromCoords.col };
        if (this.isValidSquare(toCoords.row, toCoords.col) && !board[toCoords.row][toCoords.col]) {
            const toSqId = getSquareId(toCoords.row, toCoords.col);
            if(toSqId) moves.push(toSqId);
            // Move two forward (initial move)
            if (!piece.hasMoved) {
                toCoords = { row: fromCoords.row + 2 * direction, col: fromCoords.col };
                if (this.isValidSquare(toCoords.row, toCoords.col) && !board[toCoords.row][toCoords.col] && !board[fromCoords.row+direction][fromCoords.col]) {
                   const toSqId2 = getSquareId(toCoords.row, toCoords.col);
                   if(toSqId2) moves.push(toSqId2);
                }
            }
        }
        // Captures (diagonal)
        [-1, 1].forEach(colOffset => {
            toCoords = { row: fromCoords.row + direction, col: fromCoords.col + colOffset };
            if (this.isValidSquare(toCoords.row, toCoords.col)) {
                const targetPiece = board[toCoords.row][toCoords.col];
                const toSqIdCand = getSquareId(toCoords.row, toCoords.col);
                if (toSqIdCand) {
                    if (targetPiece && targetPiece.color !== piece.color) {
                        moves.push(toSqIdCand);
                    }
                    // En Passant (target square must exist, but capture is on board)
                    const enPassantTargetCoords = this.enPassantTarget ? getSquareCoordinates(this.enPassantTarget) : null;
                    if (enPassantTargetCoords && toCoords.row === enPassantTargetCoords.row && toCoords.col === enPassantTargetCoords.col) {
                       moves.push(toSqIdCand);
                    }
                }
            }
        });
    } else if (piece.type === PieceType.KNIGHT) {
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        knightMoves.forEach(([dr, dc]) => {
            const toCoords = { row: fromCoords.row + dr, col: fromCoords.col + dc };
            if (this.isValidSquare(toCoords.row, toCoords.col)) {
                const targetPiece = board[toCoords.row][toCoords.col];
                if (!targetPiece || targetPiece.color !== piece.color) {
                    const toSqId = getSquareId(toCoords.row, toCoords.col);
                    if(toSqId) moves.push(toSqId);
                }
            }
        });
    } else if (piece.type === PieceType.ROOK || piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN) {
        const directions =
            piece.type === PieceType.ROOK ? [[-1, 0], [1, 0], [0, -1], [0, 1]] :
            piece.type === PieceType.BISHOP ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]; // Queen
        directions.forEach(([dr, dc]) => {
            for (let i = 1; i < BOARD_ROWS; i++) {
                const toRow = fromCoords.row + dr * i;
                const toCol = fromCoords.col + dc * i;
                if (!this.isValidSquare(toRow, toCol)) break;
                const targetPieceOnPath = board[toRow][toCol];
                 const toSqId = getSquareId(toRow, toCol);
                if(toSqId){
                    if (targetPieceOnPath) {
                        if (targetPieceOnPath.color !== piece.color) moves.push(toSqId);
                        break; 
                    }
                    moves.push(toSqId);
                } else { break; }
            }
        });
    } else if (piece.type === PieceType.KING) {
        const kingMoves = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
        kingMoves.forEach(([dr, dc]) => {
            const toRow = fromCoords.row + dr;
            const toCol = fromCoords.col + dc;
            if (this.isValidSquare(toRow, toCol)) {
                const targetPiece = board[toRow][toCol];
                if (!targetPiece || targetPiece.color !== piece.color) {
                   const toSqId = getSquareId(toRow, toCol);
                   if(toSqId) moves.push(toSqId);
                }
            }
        });
    }
    return moves;
  }


  getValidMovesForPiece(squareId: SquareId): SquareId[] {
    const piece = this.getPieceAt(squareId);
    if (!piece || piece.color !== this.currentPlayer) return [];

    const pseudoLegalTargetSquares = this.generatePseudoLegalMovesForPiece(squareId, this.board, piece);
    const legalMoves: SquareId[] = [];

    pseudoLegalTargetSquares.forEach(targetSquareId => {
      const tempBoard = this.board.map(row => row.map(p => p ? {...p} : null));
      const fromCoords = getSquareCoordinates(squareId)!;
      const toCoords = getSquareCoordinates(targetSquareId)!;
      
      const movedPiece = tempBoard[fromCoords.row][fromCoords.col];
      if (movedPiece) { // Should always be true
          tempBoard[toCoords.row][toCoords.col] = movedPiece;
          tempBoard[fromCoords.row][fromCoords.col] = null;

          // Special handling for en passant capture
          if (movedPiece.type === PieceType.PAWN && targetSquareId === this.enPassantTarget) {
            const capturedPawnRow = fromCoords.row; // Pawn captured is on same row as moving pawn was
            const capturedPawnCol = toCoords.col; // Pawn captured is on same col as target square
            if (this.isValidSquare(capturedPawnRow, capturedPawnCol)) {
                tempBoard[capturedPawnRow][capturedPawnCol] = null;
            }
          }
      }

      if (!this.isKingInCheck(this.currentPlayer, tempBoard)) {
        legalMoves.push(targetSquareId);
      }
    });

    // Castling
    if (piece.type === PieceType.KING && !piece.hasMoved) {
        const kingRow = piece.color === PieceColor.WHITE ? 7 : 0; // Assuming 0,0 is a8
        // King-side
        if ( (piece.color === PieceColor.WHITE && this.castlingAvailability.whiteKingSide) ||
             (piece.color === PieceColor.BLACK && this.castlingAvailability.blackKingSide) ) {
            if (!this.board[kingRow][5] && !this.board[kingRow][6]) { // Squares between king and rook are empty
                const rookSquareId = piece.color === PieceColor.WHITE ? INITIAL_ROOK_POSITIONS.white.kingSide : INITIAL_ROOK_POSITIONS.black.kingSide;
                const rook = this.getPieceAt(rookSquareId);
                if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
                    const kingStartSquare = getSquareId(kingRow, 4)!;
                    const kingPathSquare1 = getSquareId(kingRow, 5)!;
                    const kingPathSquare2 = getSquareId(kingRow, 6)!;
                    if (!this.isSquareAttacked(kingStartSquare, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) &&
                        !this.isSquareAttacked(kingPathSquare1, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) &&
                        !this.isSquareAttacked(kingPathSquare2, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) ) {
                        legalMoves.push(kingPathSquare2);
                    }
                }
            }
        }
        // Queen-side
        if ( (piece.color === PieceColor.WHITE && this.castlingAvailability.whiteQueenSide) ||
             (piece.color === PieceColor.BLACK && this.castlingAvailability.blackQueenSide) ) {
            if (!this.board[kingRow][1] && !this.board[kingRow][2] && !this.board[kingRow][3]) { // Squares between king and rook are empty
                const rookSquareId = piece.color === PieceColor.WHITE ? INITIAL_ROOK_POSITIONS.white.queenSide : INITIAL_ROOK_POSITIONS.black.queenSide;
                const rook = this.getPieceAt(rookSquareId);
                 if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
                    const kingStartSquare = getSquareId(kingRow, 4)!;
                    const kingPathSquare1 = getSquareId(kingRow, 3)!; // d-file
                    const kingPathSquare2 = getSquareId(kingRow, 2)!; // c-file
                    const kingPathSquareRookPass = getSquareId(kingRow, 1)!; // b-file (rook passes, king doesn't land)
                    if (!this.isSquareAttacked(kingStartSquare, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) &&
                        !this.isSquareAttacked(kingPathSquare1, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) &&
                        !this.isSquareAttacked(kingPathSquare2, piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE, this.board) ) {
                       legalMoves.push(kingPathSquare2);
                    }
                }
            }
        }
    }
    return legalMoves;
  }

  makeMove(move: Move): boolean {
    const fromCoords = getSquareCoordinates(move.from);
    const toCoords = getSquareCoordinates(move.to);

    if (!fromCoords || !toCoords) return false;
    const pieceToMove = this.board[fromCoords.row][fromCoords.col];

    if (!pieceToMove || pieceToMove.color !== this.currentPlayer) return false;

    // --- Start of move execution ---
    const capturedPiece = this.board[toCoords.row][toCoords.col];
    let isPawnMove = pieceToMove.type === PieceType.PAWN;
    let isCapture = !!capturedPiece;

    // Update halfMoveClock
    if (isPawnMove || isCapture) {
        this.halfMoveClock = 0;
    } else {
        this.halfMoveClock++;
    }
    
    // Actual move on board
    this.board[toCoords.row][toCoords.col] = pieceToMove;
    this.board[fromCoords.row][fromCoords.col] = null;
    pieceToMove.hasMoved = true;

    let oldEnPassantTarget = this.enPassantTarget;
    this.enPassantTarget = null; // Reset en passant target by default

    // Handle En Passant capture
    if (isPawnMove && move.to === oldEnPassantTarget && !capturedPiece) { // No direct capture on target square
        const capturedPawnRow = fromCoords.row; // En passant captured pawn is on the same rank as the moving pawn started
        const capturedPawnCol = toCoords.col;  // and on the same file as the pawn landed
        if(this.isValidSquare(capturedPawnRow, capturedPawnCol)){
             this.board[capturedPawnRow][capturedPawnCol] = null;
        }
    }

    // Handle Pawn Promotion
    if (pieceToMove.type === PieceType.PAWN && move.promotion) {
        if ((pieceToMove.color === PieceColor.WHITE && toCoords.row === 0) ||
            (pieceToMove.color === PieceColor.BLACK && toCoords.row === BOARD_ROWS - 1)) {
            this.board[toCoords.row][toCoords.col] = { ...pieceToMove, type: move.promotion };
        }
    }

    // Handle Pawn Double Step (setting new en passant target)
    if (pieceToMove.type === PieceType.PAWN && Math.abs(toCoords.row - fromCoords.row) === 2) {
        const enPassantRow = (fromCoords.row + toCoords.row) / 2;
        this.enPassantTarget = getSquareId(enPassantRow, fromCoords.col);
    }
    
    // Handle Castling
    if (pieceToMove.type === PieceType.KING && Math.abs(toCoords.col - fromCoords.col) === 2) {
        let rookFromCol: number, rookToCol: number;
        if (toCoords.col > fromCoords.col) { // King-side castle
            rookFromCol = BOARD_COLS - 1; // h-file
            rookToCol = toCoords.col - 1; // f-file
        } else { // Queen-side castle
            rookFromCol = 0; // a-file
            rookToCol = toCoords.col + 1; // d-file
        }
        const rook = this.board[fromCoords.row][rookFromCol];
        if (rook && rook.type === PieceType.ROOK) {
            this.board[fromCoords.row][rookToCol] = rook;
            this.board[fromCoords.row][rookFromCol] = null;
            rook.hasMoved = true;
        }
    }

    // Update castling availability
    if (pieceToMove.type === PieceType.KING) {
        if (pieceToMove.color === PieceColor.WHITE) {
            this.castlingAvailability.whiteKingSide = false;
            this.castlingAvailability.whiteQueenSide = false;
        } else {
            this.castlingAvailability.blackKingSide = false;
            this.castlingAvailability.blackQueenSide = false;
        }
    }
    if (pieceToMove.type === PieceType.ROOK) {
        if (pieceToMove.color === PieceColor.WHITE) {
            if (move.from === INITIAL_ROOK_POSITIONS.white.kingSide) this.castlingAvailability.whiteKingSide = false;
            if (move.from === INITIAL_ROOK_POSITIONS.white.queenSide) this.castlingAvailability.whiteQueenSide = false;
        } else {
            if (move.from === INITIAL_ROOK_POSITIONS.black.kingSide) this.castlingAvailability.blackKingSide = false;
            if (move.from === INITIAL_ROOK_POSITIONS.black.queenSide) this.castlingAvailability.blackQueenSide = false;
        }
    }
    // If a rook is captured on its starting square
    if (capturedPiece && capturedPiece.type === PieceType.ROOK) {
        const capturedRookInitialPosWhiteKS = INITIAL_ROOK_POSITIONS.white.kingSide;
        const capturedRookInitialPosWhiteQS = INITIAL_ROOK_POSITIONS.white.queenSide;
        const capturedRookInitialPosBlackKS = INITIAL_ROOK_POSITIONS.black.kingSide;
        const capturedRookInitialPosBlackQS = INITIAL_ROOK_POSITIONS.black.queenSide;

        if (move.to === capturedRookInitialPosWhiteKS) this.castlingAvailability.whiteKingSide = false;
        if (move.to === capturedRookInitialPosWhiteQS) this.castlingAvailability.whiteQueenSide = false;
        if (move.to === capturedRookInitialPosBlackKS) this.castlingAvailability.blackKingSide = false;
        if (move.to === capturedRookInitialPosBlackQS) this.castlingAvailability.blackQueenSide = false;
    }


    // Switch player
    this.currentPlayer = this.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

    // Increment fullMoveNumber if black just moved (meaning it's now white's turn)
    if (this.currentPlayer === PieceColor.WHITE) {
        this.fullMoveNumber++;
    }
    
    this.moveHistory.push(move);
    return true;
  }

  getAllValidMovesForPlayer(playerColor: PieceColor): Move[] {
    const allMoves: Move[] = [];
    if (playerColor !== this.currentPlayer) return []; // Only current player can have valid moves requested like this typically

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === playerColor) {
          const fromSquareId = getSquareId(r, c)!;
          const validTargetSquares = this.getValidMovesForPiece(fromSquareId);

          validTargetSquares.forEach(targetSquareId => {
            const toCoords = getSquareCoordinates(targetSquareId)!;
            // Check for promotion
            if (piece.type === PieceType.PAWN &&
                ((piece.color === PieceColor.WHITE && toCoords.row === 0) ||
                 (piece.color === PieceColor.BLACK && toCoords.row === BOARD_ROWS - 1))) {
              PROMOTION_PIECES.forEach(promoType => {
                allMoves.push({ from: fromSquareId, to: targetSquareId, promotion: promoType });
              });
            } else {
              allMoves.push({ from: fromSquareId, to: targetSquareId });
            }
          });
        }
      }
    }
    return allMoves;
  }

  isCheckmate(playerColor: PieceColor): boolean {
    if (!this.isKingInCheck(playerColor, this.board)) {
      return false;
    }
    const validMoves = this.getAllValidMovesForPlayer(playerColor);
    return validMoves.length === 0;
  }

  isStalemate(playerColor: PieceColor): boolean {
    if (this.isKingInCheck(playerColor, this.board)) {
      return false; // Cannot be stalemate if in check (that would be checkmate if no moves)
    }
    const validMoves = this.getAllValidMovesForPlayer(playerColor);
    return validMoves.length === 0;
  }
  
  private pieceToFenChar(piece: Piece): string {
    let char;
    switch (piece.type) {
        case PieceType.PAWN: char = 'p'; break;
        case PieceType.KNIGHT: char = 'n'; break;
        case PieceType.BISHOP: char = 'b'; break;
        case PieceType.ROOK: char = 'r'; break;
        case PieceType.QUEEN: char = 'q'; break;
        case PieceType.KING: char = 'k'; break;
        default: return '';
    }
    return piece.color === PieceColor.WHITE ? char.toUpperCase() : char;
  }

  boardToFEN(): string {
    let fen = '';
    // 1. Piece placement
    for (let r = 0; r < BOARD_ROWS; r++) {
        let emptyCount = 0;
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = this.board[r][c];
            if (piece) {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                fen += this.pieceToFenChar(piece);
            } else {
                emptyCount++;
            }
        }
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        if (r < BOARD_ROWS - 1) {
            fen += '/';
        }
    }
    fen += ' ';

    // 2. Active color
    fen += this.currentPlayer === PieceColor.WHITE ? 'w' : 'b';
    fen += ' ';

    // 3. Castling availability
    let castleFen = '';
    if (this.castlingAvailability.whiteKingSide) castleFen += 'K';
    if (this.castlingAvailability.whiteQueenSide) castleFen += 'Q';
    if (this.castlingAvailability.blackKingSide) castleFen += 'k';
    if (this.castlingAvailability.blackQueenSide) castleFen += 'q';
    fen += castleFen.length > 0 ? castleFen : '-';
    fen += ' ';

    // 4. En passant target
    fen += this.enPassantTarget ? this.enPassantTarget : '-';
    fen += ' ';

    // 5. Halfmove clock
    fen += this.halfMoveClock;
    fen += ' ';

    // 6. Fullmove number
    fen += this.fullMoveNumber;

    return fen;
  }
}
