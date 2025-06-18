import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Board from './components/Board'; // Assuming Board component handles its own responsiveness
import GameControls from './components/GameControls'; // Assuming GameControls handles its own responsiveness
import StatusBar from './components/StatusBar'; // Assuming StatusBar handles its own responsiveness
import PromotionModal from './components/PromotionModal'; // Assuming PromotionModal handles its own responsiveness
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
  // Memoize the initial ChessLogic instance to prevent unnecessary re-creations
  const initialLogicInstance = useMemo(() => new ChessLogic(), []);
  // State to hold the current ChessLogic instance
  const [chessLogicInstance, setChessLogicInstance] = useState<ChessLogic>(initialLogicInstance);
  // State to manage the overall game state, initialized with a memoized logic instance
  const [gameState, setGameState] = useState<GameState>(() => getInitialGameState(initialLogicInstance));
  // State for game difficulty, defaulting to a predefined constant
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  // State to track if it's currently the AI's turn
  const [isAITurn, setIsAITurn] = useState<boolean>(false);
  // State to indicate if a game is currently in progress
  const [isGameInProgress, setIsGameInProgress] = useState<boolean>(false);
  // State to control the visibility of the cookie banner
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(false);
  // State to control the visibility of the scroll-to-top button
  const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false);

  /**
   * Initializes and returns the default game state based on the provided ChessLogic instance.
   * @param logicInstance The ChessLogic instance to base the initial board state on.
   * @returns The initial GameState object.
   */
  function getInitialGameState(logicInstance: ChessLogic): GameState {
    const initialBoardPieces: (Piece | null)[][] = logicInstance.getBoard();
    const fullBoardState: FullBoardState = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      const rowSquares: SquareState[] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        const id = getSquareId(r, c)!; // Get the square ID (e.g., 'a1', 'h8')
        rowSquares.push({
          id,
          piece: initialBoardPieces[r][c], // Piece at this square, or null
          isValidMove: false, // Flag if this square is a valid move target for a selected piece
          isCheck: false, // Flag if this square is currently under check (for king)
          isSelected: false, // Flag if this square is currently selected by the player
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
      selectedSquare: null, // No square is selected initially
      validMoves: [], // No valid moves shown initially
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
      promotingPawn: null, // No pawn promotion in progress
      gameStatusMessage: "Select difficulty and click 'Start New Game'. White to move.",
      moveHistory: [], // Empty move history
    };
  }

  /**
   * Finds the current position of the king of a specific color on the board.
   * @param kingColor The color of the king to find.
   * @param board The current state of the board.
   * @returns The SquareId of the king, or null if not found.
   */
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

  /**
   * Executes a given move using the chess logic instance and updates the game state.
   * Handles checkmate, stalemate, and switches turns.
   * @param move The move object (from, to, optional promotion).
   */
  const performMove = useCallback((move: Move) => {
    const currentInstance = chessLogicInstance;
    const moveSuccessful = currentInstance.makeMove(move);

    if (moveSuccessful) {
      setIsGameInProgress(true); // Ensure game is marked as in progress after the first valid move

      const playerWhoseTurnIsNext = currentInstance.getCurrentPlayer();
      // Determine who just moved to correctly assign winner in case of checkmate
      const playerWhoJustMoved = playerWhoseTurnIsNext === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

      const checkmate = currentInstance.isCheckmate(playerWhoseTurnIsNext);
      const stalemate = currentInstance.isStalemate(playerWhoseTurnIsNext);

      // Update game state based on the successful move
      setGameState(prev => ({
        ...prev,
        currentPlayer: playerWhoseTurnIsNext,
        castlingAvailability: currentInstance.getCastlingAvailability(),
        enPassantTarget: currentInstance.getEnPassantTarget(),
        halfMoveClock: currentInstance.getHalfMoveClock(),
        fullMoveNumber: currentInstance.getMoveNumber(),
        selectedSquare: null, // Clear selected square after a move
        validMoves: [], // Clear valid moves after a move
        isCheck: currentInstance.isKingInCheck(playerWhoseTurnIsNext), // Check if the next player is in check
        isCheckmate: checkmate,
        isStalemate: stalemate,
        winner: checkmate ? playerWhoJustMoved : null, // Assign winner if checkmate
        moveHistory: [...prev.moveHistory, move], // Add move to history
        promotingPawn: null, // Clear promoting pawn state
      }));

      // If game is not over, determine if it's AI's turn
      if (!checkmate && !stalemate) {
        setIsAITurn(playerWhoseTurnIsNext === PieceColor.BLACK);
      } else {
        setIsAITurn(false); // Game over, no AI turn
      }
    } else {
      console.error("Move failed in chessLogicInstance.makeMove for move:", move);
      // If move failed, clear any selected square and valid moves to reset UI
      setGameState(prev => ({ ...prev, selectedSquare: null, validMoves: [] }));
    }
  }, [chessLogicInstance]); // Dependency on chessLogicInstance

  /**
   * Handles a click on a square of the chessboard.
   * Manages piece selection, move validation, and pawn promotion.
   * @param squareId The ID of the clicked square (e.g., 'e2').
   */
  const handleSquareClick = useCallback((squareId: SquareId) => {
    // Prevent interaction during AI turn, game over states, promotion, or if game hasn't started
    if (isAITurn || gameState.isCheckmate || gameState.isStalemate || gameState.promotingPawn || !isGameInProgress) return;

    const pieceOnClickedSquare = chessLogicInstance.getPieceAt(squareId);

    if (gameState.selectedSquare) {
      // If a piece is already selected, try to move it to the clicked square
      if (gameState.validMoves.includes(squareId)) {
        const move: Move = { from: gameState.selectedSquare, to: squareId };

        const fromPiece = chessLogicInstance.getPieceAt(gameState.selectedSquare);
        const toCoords = getSquareCoordinates(squareId);
        // Check for pawn promotion conditions
        if (fromPiece?.type === PieceType.PAWN && toCoords &&
          ((fromPiece.color === PieceColor.WHITE && toCoords.row === 0) ||
            (fromPiece.color === PieceColor.BLACK && toCoords.row === BOARD_ROWS - 1))) {
          // If it's a promotion, set promotingPawn state and wait for user selection
          setGameState(prev => ({ ...prev, promotingPawn: { from: gameState.selectedSquare!, to: squareId } }));
          return; // Exit, move will be performed after promotion selection
        }
        performMove(move); // Perform the move directly if no promotion
      } else {
        // If clicked square is not a valid move for the selected piece
        if (pieceOnClickedSquare && pieceOnClickedSquare.color === chessLogicInstance.getCurrentPlayer()) {
          // If clicked square has a piece of current player's color, select it
          const newValidMoves = chessLogicInstance.getValidMovesForPiece(squareId);
          setGameState(prev => ({ ...prev, selectedSquare: squareId, validMoves: newValidMoves }));
        } else {
          // Otherwise, deselect the current piece and clear valid moves
          setGameState(prev => ({ ...prev, selectedSquare: null, validMoves: [] }));
        }
      }
    } else {
      // No piece selected, try to select the clicked square's piece
      if (pieceOnClickedSquare && pieceOnClickedSquare.color === chessLogicInstance.getCurrentPlayer()) {
        const validMoves = chessLogicInstance.getValidMovesForPiece(squareId);
        setGameState(prev => ({ ...prev, selectedSquare: squareId, validMoves: validMoves }));
      }
    }
  }, [isAITurn, gameState.isCheckmate, gameState.isStalemate, gameState.promotingPawn, gameState.selectedSquare, gameState.validMoves, chessLogicInstance, performMove, isGameInProgress]);

  /**
   * Handles the selection of a piece type during pawn promotion.
   * @param promotedPieceType The type of piece the pawn is promoted to.
   */
  const handlePromotion = useCallback((promotedPieceType: PieceType) => {
    if (!gameState.promotingPawn) return; // Should not happen if modal is shown correctly
    const move: Move = { ...gameState.promotingPawn, promotion: promotedPieceType };
    performMove(move); // Perform the move with promotion
  }, [gameState.promotingPawn, performMove]);


  /**
   * Resets the game to its initial state.
   */
  const resetGame = useCallback(() => {
    const newLogicInstance = new ChessLogic(); // Create a new logic instance
    setChessLogicInstance(newLogicInstance);
    setGameState(getInitialGameState(newLogicInstance)); // Reset game state
    setIsAITurn(false);
    setIsGameInProgress(false);
  }, []);

  /**
   * Starts a new game, resetting the board and setting an initial status message.
   */
  const startGame = useCallback(() => {
    const newLogicInstance = new ChessLogic();
    setChessLogicInstance(newLogicInstance);
    setGameState(prev => ({
      ...getInitialGameState(newLogicInstance), // Get initial state
      gameStatusMessage: "Game started. White to move." // Set initial message
    }));
    setIsAITurn(false);
    setIsGameInProgress(true); // Mark game as in progress
  }, []);

  /**
   * Effect hook to update the board UI and status message whenever the chess logic or game state changes.
   */
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

    // Update the fullBoardState with current pieces, check status, selections, and valid moves
    setGameState(prev => {
      const updatedFullBoardState = prev.boardState.map((row, rIndex) =>
        row.map((sq, cIndex) => {
          const currentSquareId = getSquareId(rIndex, cIndex)!;
          const pieceOnSquare = newBoardPieces[rIndex][cIndex];
          return {
            ...sq,
            id: currentSquareId,
            piece: pieceOnSquare,
            // Mark king square as 'in check' if it is and it's the king's square
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

  /**
   * Effect hook to manage AI's turn, including fetching AI move and executing it.
   */
  useEffect(() => {
    let timeoutId: number | undefined;

    // Only proceed if it's AI's turn, game is in progress, and not in a game-over state
    if (isAITurn && !gameState.isCheckmate && !gameState.isStalemate && isGameInProgress) {
      const aiPlayerColor = chessLogicInstance.getCurrentPlayer();

      // Safety check: ensure AI is supposed to move for the black pieces
      if (aiPlayerColor !== PieceColor.BLACK) {
        console.warn(`AI turn inconsistency: Expected Black, got ${aiPlayerColor}. Resetting AI turn.`);
        setIsAITurn(false);
        return;
      }

      // Get all valid moves for the AI player
      const validMovesForAIPlayer = chessLogicInstance.getAllValidMovesForPlayer(aiPlayerColor);
      const validMovesUci = validMovesForAIPlayer.map(m => {
        let uci = `${m.from}${m.to}`;
        if (m.promotion) {
          uci += m.promotion.charAt(0).toLowerCase(); // Append promotion type for UCI
        }
        return uci;
      });

      // If AI has no valid moves, it's either checkmate or stalemate
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
        setIsAITurn(false); // End AI turn as game is over
        return;
      }

      // Calculate AI thinking time based on difficulty, with a minimum delay
      const aiThinkTime = Math.max(100, 100 * difficulty);

      // Set a timeout for AI to "think" before making a move
      timeoutId = window.setTimeout(async () => {
        // Re-check game state before making a move, as it might have changed during timeout
        if (gameState.isCheckmate || gameState.isStalemate || !isGameInProgress || !isAITurn) {
          if (isAITurn) setIsAITurn(false);
          return;
        }

        // Get AI's chosen move from the service
        let aiChosenUci = await getAIMove(chessLogicInstance, difficulty, validMovesUci);

        // Fallback: If AI service returns an invalid or no move, choose a random valid move
        if (!aiChosenUci || !validMovesUci.includes(aiChosenUci)) {
          if (validMovesUci.length > 0) {
            const originalChoice = aiChosenUci;
            aiChosenUci = validMovesUci[Math.floor(Math.random() * validMovesUci.length)];
            console.warn(`AI service chose an invalid ('${originalChoice}') or no move. Forced random valid move: ${aiChosenUci}.`);
          } else {
            // This case should ideally be caught by the earlier validMovesUci.length === 0 check
            console.error("AI Turn Critical: No valid moves available during AI move execution, and this wasn't caught earlier.");
            setIsAITurn(false);
            // Emergency re-evaluation of game end conditions
            const isKingInCheckForAI = chessLogicInstance.isKingInCheck(aiPlayerColor);
            if (isKingInCheckForAI && !gameState.isCheckmate) {
              setGameState(prev => ({ ...prev, isCheckmate: true, winner: PieceColor.WHITE, gameStatusMessage: "Checkmate! White wins (emergency check)." }));
            } else if (!isKingInCheckForAI && !gameState.isStalemate) {
              setGameState(prev => ({ ...prev, isStalemate: true, gameStatusMessage: "Stalemate! It's a draw (emergency check)." }));
            }
            return;
          }
        }

        // Final safety check before performing the move
        if (gameState.isCheckmate || gameState.isStalemate || !isGameInProgress || !isAITurn) {
          if (isAITurn) setIsAITurn(false);
          return;
        }

        // If a valid AI move is chosen, parse and perform it
        if (aiChosenUci) {
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
          console.error("AI failed to select a move even after all fallbacks. This indicates a serious logic error.");
          setIsAITurn(false);
        }
      }, aiThinkTime);
    }

    // Cleanup function to clear the timeout if the component unmounts or dependencies change
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isAITurn, gameState.isCheckmate, gameState.isStalemate, chessLogicInstance, difficulty, performMove, isGameInProgress, gameState.currentPlayer]);

  /**
   * Handles changes in the selected game difficulty.
   * @param level The new difficulty level.
   */
  const handleDifficultyChange = (level: Difficulty) => {
    // Allow difficulty change only if no game is in progress
    if (!isGameInProgress) {
      setDifficulty(level);
    }
  };

  /**
   * Effect hook to check for cookie acceptance on component mount.
   * If not accepted, show the cookie banner.
   */
  useEffect(() => {
    const hasAcceptedCookies = localStorage.getItem('cookiesAccepted');
    if (hasAcceptedCookies === 'true') {
      setShowCookieBanner(false);
    } else {
      setShowCookieBanner(true);
    }
  }, []);

  /**
   * Handles the action of accepting all cookies.
   * Hides the banner and sets a flag in local storage.
   */
  const handleAcceptAllCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShowCookieBanner(false);
    console.log('All cookies accepted!');
  };

  /**
   * Handles the action of rejecting all cookies.
   * Hides the banner and sets a flag in local storage.
   */
  const handleRejectAllCookies = () => {
    localStorage.setItem('cookiesAccepted', 'false');
    setShowCookieBanner(false);
    console.log('All cookies rejected!');
    // In a real application, you would also disable non-essential cookies here.
  };

  /**
   * Callback function for the window's scroll event.
   * Controls the visibility of the scroll-to-top button.
   */
  const handleScroll = useCallback(() => {
    // Show button if scrolled down more than 300px from the top
    if (window.scrollY > 300) {
      setShowScrollToTop(true);
    } else {
      setShowScrollToTop(false);
    }
  }, []);

  /**
   * Scrolls the window smoothly to the top of the page.
   */
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Enable smooth scrolling animation
    });
  }, []);

  /**
   * Effect hook to add and remove the scroll event listener.
   */
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Cleanup: remove event listener when component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]); // Dependency on handleScroll to ensure it's up-to-date

  return (
    // Main container for the entire application, with responsive padding and centering
    <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-emerald-500 selection:text-white">

      {/* Cookie Banner - Fixed at the bottom, visible only if showCookieBanner is true */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-yellow-300 text-slate-800 text-center py-2 shadow-lg sm:bottom-4">
          <span className="text-sm">Cookie Notice: We use cookies to ensure you get the best experience. Learn more about our
            <a href="/cookie-policy" className="text-blue-700 hover:underline ml-1">cookie policy</a> or
            <a href="/privacy-policy" className="text-blue-700 hover:underline ml-1">privacy policy</a>.
          </span>
          <button onClick={handleAcceptAllCookies} className="ml-2 text-green-700 hover:text-green-600 border border-green-700 rounded px-2 py-1">Accept All</button>
          <button onClick={handleRejectAllCookies} className="ml-2 text-red-700 hover:text-red-600 border border-red-700 rounded px-2 py-1">Reject All</button>
        </div>
      )}

      {/* Scroll to Top Button - Fixed at bottom-right, visible only if showScrollToTop is true */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          // Responsive positioning: bottom-16 on small, bottom-8 on sm+
          // Responsive positioning: right-4 on small, right-8 on sm+
          // Green background, rounded, shadow, smooth transition for hover effects
          className="fixed bottom-16 right-4 sm:bottom-8 sm:right-8 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg z-50 transition-all duration-300 ease-in-out transform hover:scale-105"
          aria-label="Scroll to top"
        >
          {/* SVG icon for up arrow */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Application Header/Title */}
      <h1 className="font-dynapuff text-4xl sm:text-5xl md:text-6xl font-bold text-emerald-400 animate-typewriter flex items-center justify-center space-x-4 mb-8"> {/* Responsive font sizes, increased bottom margin */}
        <img src="/Public/logo.png" alt="Naga Apparel" className="w-12 h-12" /> {/* Fixed size logo, consider making it responsive if needed */}
        Naga Codex AI Chess
      </h1>

      {/* Main content area, uses flexbox for layout */}
      <main className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 w-full max-w-4xl mx-auto">
        {/* Chess Board Container */}
        <div className="w-full md:w-auto flex flex-shrink-0 justify-center md:justify-start shadow-2xl rounded overflow-hidden">
          <Board
            boardState={gameState.boardState}
            onSquareClick={handleSquareClick}
            playerColor={PieceColor.WHITE} // Human player is White, board oriented accordingly
          />
        </div>

        {/* Game Controls and Status Bar Container */}
        <div className="w-full mt-4 md:mt-0 md:flex-1 space-y-4 min-w-[240px] sm:min-w-[280px]"> {/* Responsive width and minimum width */}
          <StatusBar message={gameState.gameStatusMessage} />
          <GameControls
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
            onResetGame={isGameInProgress ? resetGame : startGame}
            isGameInProgress={isGameInProgress}
          />
        </div>
      </main>

      {/* Promotion Modal - Conditionally rendered when a pawn is promoting */}
      {gameState.promotingPawn && (
        <PromotionModal
          playerColor={chessLogicInstance.getCurrentPlayer()}
          onPromote={handlePromotion}
        />
      )}

      {/* Footer section */}
      <footer className="mt-12 sm:mt-16 text-center text-slate-400 text-sm pb-20"> {/* Adjusted top margin, added padding-bottom for fixed banner */}
        <div className="flex justify-center items-center space-x-4 mb-2">
          {/* LinkedIn Icon */}
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
          {/* Instagram Icon */}
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
