
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Board from './components/Board';
import GameControls from './components/GameControls';
import StatusBar from './components/StatusBar';
import PromotionModal from './components/PromotionModal';
import { ChessLogic } from './services/chessLogic';
import { getAIMove } from './services/geminiService';
import {
  BoardState as FullBoardState,
  SquareId,
  PieceColor,
  Move,
  Difficulty,
  GameState,
  PieceType,
  SquareState,
  Piece
} from './types';
import { DEFAULT_DIFFICULTY, BOARD_ROWS, BOARD_COLS } from './constants';
import { getSquareCoordinates, getSquareId } from './utils/boardUtils';

const App: React.FC = () => {
  const initialLogicInstance = useMemo(() => new ChessLogic(), []);
  const [chessLogicInstance, setChessLogicInstance] = useState<ChessLogic>(initialLogicInstance);
  const [gameState, setGameState] = useState<GameState>(() => getInitialGameState(initialLogicInstance));
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [isAITurn, setIsAITurn] = useState<boolean>(false);
  const [isGameInProgress, setIsGameInProgress] = useState<boolean>(false);

  function getInitialGameState(logicInstance: ChessLogic): GameState {
    const initialBoardPieces: (Piece | null)[][] = logicInstance.getBoard();
    const fullBoardState: FullBoardState = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
        const rowSquares: SquareState[] = [];
        for (let c = 0; c < BOARD_COLS; c++) {
            const id = getSquareId(r, c)!;
            rowSquares.push({
                id,
                piece: initialBoardPieces[r][c],
                isValidMove: false,
                isCheck: false,
                isSelected: false,
            });
        }
        fullBoardState.push(rowSquares);
    }

    return {
      boardState: fullBoardState,
      currentPlayer: logicInstance.getCurrentPlayer(),
      castlingAvailability: logicInstance.getCastlingAvailability(),
      enPassantTarget: logicInstance.getEnPassantTarget(),
      halfMoveClock: logicInstance.getHalfMoveClock(),
      fullMoveNumber: logicInstance.getMoveNumber(),
      selectedSquare: null,
      validMoves: [],
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
      promotingPawn: null,
      gameStatusMessage: "Select difficulty and click 'Start New Game'. White to move.",
      moveHistory: [],
    };
  }

  const findKingSquare = (kingColor: PieceColor, board: (Piece | null)[][]): SquareId | null => {
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = board[r][c];
        if (piece && piece.type === PieceType.KING && piece.color === kingColor) {
          return getSquareId(r, c);
        }
      }
    }
    return null;
  };

  const performMove = useCallback((move: Move) => {
    const currentInstance = chessLogicInstance;
    const moveSuccessful = currentInstance.makeMove(move);

    if (moveSuccessful) {
        setIsGameInProgress(true);

        const playerWhoseTurnIsNext = currentInstance.getCurrentPlayer();
        const playerWhoJustMoved = playerWhoseTurnIsNext === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

        const checkmate = currentInstance.isCheckmate(playerWhoseTurnIsNext);
        const stalemate = currentInstance.isStalemate(playerWhoseTurnIsNext);

        setGameState(prev => ({
            ...prev,
            currentPlayer: playerWhoseTurnIsNext,
            castlingAvailability: currentInstance.getCastlingAvailability(),
            enPassantTarget: currentInstance.getEnPassantTarget(),
            halfMoveClock: currentInstance.getHalfMoveClock(),
            fullMoveNumber: currentInstance.getMoveNumber(),
            selectedSquare: null,
            validMoves: [],
            isCheck: currentInstance.isKingInCheck(playerWhoseTurnIsNext),
            isCheckmate: checkmate,
            isStalemate: stalemate,
            winner: checkmate ? playerWhoJustMoved : null,
            moveHistory: [...prev.moveHistory, move],
            promotingPawn: null,
        }));

      if (!checkmate && !stalemate) {
        setIsAITurn(playerWhoseTurnIsNext === PieceColor.BLACK);
      } else {
        setIsAITurn(false);
      }
    } else {
      console.error("Move failed in chessLogicInstance.makeMove for move:", move);
      setGameState(prev => ({ ...prev, selectedSquare: null, validMoves: [] }));
    }
  }, [chessLogicInstance]);


  const handleSquareClick = useCallback((squareId: SquareId) => {
    if (isAITurn || gameState.isCheckmate || gameState.isStalemate || gameState.promotingPawn || !isGameInProgress) return;

    const pieceOnClickedSquare = chessLogicInstance.getPieceAt(squareId);

    if (gameState.selectedSquare) {
      if (gameState.validMoves.includes(squareId)) {
        const move: Move = { from: gameState.selectedSquare, to: squareId };

        const fromPiece = chessLogicInstance.getPieceAt(gameState.selectedSquare);
        const toCoords = getSquareCoordinates(squareId);
        if (fromPiece?.type === PieceType.PAWN && toCoords &&
            ((fromPiece.color === PieceColor.WHITE && toCoords.row === 0) ||
             (fromPiece.color === PieceColor.BLACK && toCoords.row === BOARD_ROWS - 1))) {
          setGameState(prev => ({ ...prev, promotingPawn: { from: gameState.selectedSquare!, to: squareId }}));
          return;
        }
        performMove(move);
      } else {
        if (pieceOnClickedSquare && pieceOnClickedSquare.color === chessLogicInstance.getCurrentPlayer()) {
          const newValidMoves = chessLogicInstance.getValidMovesForPiece(squareId);
          setGameState(prev => ({ ...prev, selectedSquare: squareId, validMoves: newValidMoves }));
        } else {
          setGameState(prev => ({ ...prev, selectedSquare: null, validMoves: [] }));
        }
      }
    } else {
      if (pieceOnClickedSquare && pieceOnClickedSquare.color === chessLogicInstance.getCurrentPlayer()) {
        const validMoves = chessLogicInstance.getValidMovesForPiece(squareId);
        setGameState(prev => ({ ...prev, selectedSquare: squareId, validMoves: validMoves }));
      }
    }
  }, [isAITurn, gameState.isCheckmate, gameState.isStalemate, gameState.promotingPawn, gameState.selectedSquare, gameState.validMoves, chessLogicInstance, performMove, isGameInProgress]);

  const handlePromotion = useCallback((promotedPieceType: PieceType) => {
    if (!gameState.promotingPawn) return;
    const move: Move = { ...gameState.promotingPawn, promotion: promotedPieceType };
    performMove(move);
  }, [gameState.promotingPawn, performMove]);


  const resetGame = useCallback(() => {
    const newLogicInstance = new ChessLogic();
    setChessLogicInstance(newLogicInstance);
    setGameState(getInitialGameState(newLogicInstance));
    setIsAITurn(false);
    setIsGameInProgress(false);
  }, []);

  const startGame = useCallback(() => {
    const newLogicInstance = new ChessLogic();
    setChessLogicInstance(newLogicInstance);
    setGameState(prev => ({
        ...getInitialGameState(newLogicInstance),
        gameStatusMessage: "Game started. White to move."
    }));
    setIsAITurn(false);
    setIsGameInProgress(true);
  }, []);

  useEffect(() => {
    const currentLogicPlayer = chessLogicInstance.getCurrentPlayer();
    const newBoardPieces: (Piece | null)[][] = chessLogicInstance.getBoard();
    const isCurrentlyInCheck = chessLogicInstance.isKingInCheck(currentLogicPlayer, newBoardPieces);

    let statusMessage: string;
    if (gameState.isCheckmate) {
        const winnerColor = gameState.winner;
        statusMessage = `Checkmate! ${winnerColor ? winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1) : ''} wins!`;
    } else if (gameState.isStalemate) {
        statusMessage = "Stalemate! It's a draw.";
    } else if (isCurrentlyInCheck) {
        statusMessage = `${currentLogicPlayer.charAt(0).toUpperCase() + currentLogicPlayer.slice(1)} is in Check!`;
    } else if (!isGameInProgress && chessLogicInstance.getMoveNumber() === 1 && currentLogicPlayer === PieceColor.WHITE && !gameState.winner) {
        statusMessage = "Select difficulty and click 'Start New Game'. White to move.";
    } else {
        statusMessage = `${currentLogicPlayer.charAt(0).toUpperCase() + currentLogicPlayer.slice(1)}'s turn.`;
    }

    const kingSquareId = findKingSquare(currentLogicPlayer, newBoardPieces);

    setGameState(prev => {
        const updatedFullBoardState = prev.boardState.map((row, rIndex) =>
            row.map((sq, cIndex) => {
                const currentSquareId = getSquareId(rIndex, cIndex)!;
                const pieceOnSquare = newBoardPieces[rIndex][cIndex];
                return {
                    ...sq,
                    id: currentSquareId,
                    piece: pieceOnSquare,
                    isCheck: isCurrentlyInCheck && kingSquareId === currentSquareId && pieceOnSquare?.type === PieceType.KING,
                    isSelected: prev.selectedSquare === currentSquareId,
                    isValidMove: prev.validMoves.includes(currentSquareId)
                };
            })
        );
        return {
            ...prev,
            boardState: updatedFullBoardState,
            currentPlayer: currentLogicPlayer,
            isCheck: isCurrentlyInCheck,
            gameStatusMessage: statusMessage,
            castlingAvailability: chessLogicInstance.getCastlingAvailability(),
            enPassantTarget: chessLogicInstance.getEnPassantTarget(),
            fullMoveNumber: chessLogicInstance.getMoveNumber(),
            halfMoveClock: chessLogicInstance.getHalfMoveClock(),
        };
    });
  }, [
      chessLogicInstance,
      gameState.selectedSquare,
      gameState.validMoves,
      isGameInProgress,
      gameState.isCheckmate,
      gameState.isStalemate,
      gameState.winner
    ]);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (isAITurn && !gameState.isCheckmate && !gameState.isStalemate && isGameInProgress) {
        const aiPlayerColor = chessLogicInstance.getCurrentPlayer();

        if (aiPlayerColor !== PieceColor.BLACK) {
             console.warn(`AI turn inconsistency: Expected Black, got ${aiPlayerColor}. Resetting AI turn.`);
             setIsAITurn(false);
             return; // Exit if current player in logic isn't Black during AI turn
        }

        const validMovesForAIPlayer = chessLogicInstance.getAllValidMovesForPlayer(aiPlayerColor);
        const validMovesUci = validMovesForAIPlayer.map(m => {
            let uci = `${m.from}${m.to}`;
            if (m.promotion) {
                uci += m.promotion.charAt(0).toLowerCase();
            }
            return uci;
        });

        if (validMovesUci.length === 0) {
            const isKingInCheckForAI = chessLogicInstance.isKingInCheck(aiPlayerColor);
            if (isKingInCheckForAI) {
                setGameState(prev => ({
                    ...prev,
                    isCheckmate: true,
                    winner: PieceColor.WHITE, // White (human player) wins
                    gameStatusMessage: "Checkmate! White wins.",
                }));
            } else {
                setGameState(prev => ({
                    ...prev,
                    isStalemate: true,
                    gameStatusMessage: "Stalemate! It's a draw.",
                }));
            }
            setIsAITurn(false);
            return;
        }

        const aiThinkTime = Math.max(100, 100 * difficulty); // Reduced artificial delay

        timeoutId = window.setTimeout(async () => {
            // Re-check game state before making a move, as it might have changed during timeout
            if (gameState.isCheckmate || gameState.isStalemate || !isGameInProgress || !isAITurn) {
                if (isAITurn) setIsAITurn(false);
                return;
            }

            let aiChosenUci = await getAIMove(chessLogicInstance, difficulty, validMovesUci);

            // Ensure the chosen move is actually one of the valid moves from our logic.
            // getAIMove service has its own fallbacks, but we validate its final choice here.
            if (!aiChosenUci || !validMovesUci.includes(aiChosenUci)) {
                 if (validMovesUci.length > 0) { // Should be true if we got past the initial check
                    const originalChoice = aiChosenUci;
                    aiChosenUci = validMovesUci[Math.floor(Math.random() * validMovesUci.length)];
                    console.warn(`AI service chose an invalid ('${originalChoice}') or no move. Forced random valid move: ${aiChosenUci}.`);
                } else {
                    // This state should ideally not be reached due to the initial validMovesUci.length === 0 check.
                    console.error("AI Turn Critical: No valid moves available during AI move execution, and this wasn't caught earlier.");
                    setIsAITurn(false); // Attempt to prevent game getting stuck
                    // Re-evaluate stalemate/checkmate as a safety measure
                     const isKingInCheckForAI = chessLogicInstance.isKingInCheck(aiPlayerColor);
                     if (isKingInCheckForAI && !gameState.isCheckmate) {
                         setGameState(prev => ({ ...prev, isCheckmate: true, winner: PieceColor.WHITE, gameStatusMessage: "Checkmate! White wins (emergency check)." }));
                     } else if (!isKingInCheckForAI && !gameState.isStalemate) {
                         setGameState(prev => ({ ...prev, isStalemate: true, gameStatusMessage: "Stalemate! It's a draw (emergency check)." }));
                     }
                    return;
                }
            }
            
            // Final check for game state before performing the move.
            if (gameState.isCheckmate || gameState.isStalemate || !isGameInProgress || !isAITurn) {
                 if (isAITurn) setIsAITurn(false);
                 return;
            }

            if (aiChosenUci) { // Should always be true if validMovesUci was not empty
              const from = aiChosenUci.substring(0, 2) as SquareId;
              const to = aiChosenUci.substring(2, 4) as SquareId;
              const promotionChar = aiChosenUci.length === 5 ? aiChosenUci.charAt(4) : undefined;
              let promotionPiece: PieceType | undefined = undefined;
              if (promotionChar) {
                switch (promotionChar) {
                  case 'q': promotionPiece = PieceType.QUEEN; break;
                  case 'r': promotionPiece = PieceType.ROOK; break;
                  case 'b': promotionPiece = PieceType.BISHOP; break;
                  case 'n': promotionPiece = PieceType.KNIGHT; break;
                }
              }
              performMove({ from, to, promotion: promotionPiece });
            } else {
                 // This path should ideally not be hit given the checks above.
                 console.error("AI failed to select a move even after all fallbacks. This indicates a serious logic error.");
                 setIsAITurn(false); 
            }
        }, aiThinkTime);
    }
    
    return () => { // Cleanup function
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    };
  }, [isAITurn, gameState.isCheckmate, gameState.isStalemate, chessLogicInstance, difficulty, performMove, isGameInProgress, gameState.currentPlayer]); // Added gameState.currentPlayer

  const handleDifficultyChange = (level: Difficulty) => {
    if (!isGameInProgress) {
      setDifficulty(level);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-emerald-500 selection:text-white">
      <header className="mb-4 sm:mb-6 text-center">
        <h1 className="font-dynapuff text-4xl sm:text-5xl md:text-6xl font-bold text-emerald-400 animate-typewriter">
          Naga Codex AI Chess
        </h1>
      </header>

      <main className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 w-full max-w-4xl mx-auto">
        <div className="w-full md:w-auto flex flex-shrink-0 justify-center md:justify-start shadow-2xl rounded overflow-hidden">
           <Board
            boardState={gameState.boardState}
            onSquareClick={handleSquareClick}
            playerColor={PieceColor.WHITE} // Human player is White, board oriented accordingly
          />
        </div>

        <div className="w-full mt-4 md:mt-0 md:flex-1 space-y-4 min-w-[240px] sm:min-w-[280px]">
          <StatusBar message={gameState.gameStatusMessage} />
          <GameControls
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
            onResetGame={isGameInProgress ? resetGame : startGame}
            isGameInProgress={isGameInProgress}
          />
        </div>
      </main>

      {gameState.promotingPawn && (
        <PromotionModal
          // The current player in chessLogicInstance is the one whose pawn is promoting
          playerColor={chessLogicInstance.getCurrentPlayer()} 
          onPromote={handlePromotion}
        />
      )}

      <footer className="mt-6 sm:mt-8 text-center text-slate-400 text-sm">
        <div className="flex justify-center items-center space-x-4 mb-2">
          <a
            href="https://www.linkedin.com/in/maurice-holda/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile of Maurice Holda"
            className="text-slate-400 hover:text-emerald-400 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.54 1.54 0 0013 14.19a1.55 1.55 0 00-.09.56V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.39.93 3.39 3.62V19z"></path>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/naga_apparel"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Profile of Naga Apparel"
            className="text-slate-400 hover:text-emerald-400 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.053 1.805.248 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.168.422.362 1.059.413 2.228.058 1.265.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.053 1.17-.248 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.168-1.059.362-2.228.413-1.265.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.053-1.805.248-2.227-.413-.562-.217-.96-.477-1.382-.896-.419-.42-.679-.819-.896-1.381-.168.422-.362 1.059-.413-2.228-.058-1.265-.07-1.646-.07-4.85s.012-3.584.07-4.85c.053-1.17.248 1.805.413-2.227.217.562.477.96.896-1.382.42-.419.819.679-1.381-.896.422-.168 1.059.362 2.228.413 1.265-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.28.058-2.148.272-2.912.578a4.912 4.912 0 00-1.748 1.15 4.912 4.912 0 00-1.15 1.748c-.306.764-.52 1.632-.578 2.912C2.014 8.333 2 8.741 2 12s.014 3.667.072 4.947c.058 1.28.272 2.148.578 2.912a4.912 4.912 0 001.15 1.748 4.912 4.912 0 001.748 1.15c.764.306 1.632.52 2.912.578 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.28-.058 2.148.272 2.912.578a4.912 4.912 0 001.748-1.15 4.912 4.912 0 001.15-1.748c.306-.764.52 1.632.578-2.912.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.058-1.28-.272-2.148-.578-2.912a4.912 4.912 0 00-1.15-1.748 4.912 4.912 0 00-1.748-1.15c-.764-.306-1.632-.52-2.912-.578C15.667 2.014 15.259 2 12 2zm0 5.838a4.162 4.162 0 100 8.324 4.162 4.162 0 000-8.324zm0 6.662a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm5.705-6.611a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z"></path>
            </svg>
          </a>
        </div>
        <p>Powered by Naga Apparel.</p>
      </footer>
    </div>
  );
};

export default App;
