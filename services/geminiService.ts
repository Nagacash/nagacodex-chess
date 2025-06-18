
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PieceColor, Difficulty } from '../types';
import { ChessLogic } from './chessLogic';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("API_KEY environment variable not set. Gemini API calls will be disabled. AI will use random moves.");
}

const getSystemPrompt = (difficulty: Difficulty): string => {
  let systemMessageBase = `You are a chess AI. You will be given the current board state in FEN (Forsyth-Edwards Notation) and whose turn it is. 
Your goal is to choose a valid chess move for the specified player. 
Output ONLY the move in UCI format (e.g., e2e4, e7e8q for promotion to Queen). Do not include any other text, reasoning, or apologies.
The current player is indicated in the FEN string. If it's 'w', it's White's turn. If it's 'b', it's Black's turn.`;

  switch (difficulty) {
    case 1:
      systemMessageBase += "\nPlay as a beginner. Prefer simple pawn moves or developing knights and bishops. Try to capture opponent pieces if a safe capture is available. Avoid leaving your pieces where they can be captured for free (hanging pieces).";
      break;
    case 2:
      systemMessageBase += "\nPlay as an improving beginner. Focus on developing your pieces towards the center, ensuring your king is safe (consider castling), and capturing opponent's pieces. Look for simple one-move attacks or captures. Avoid obvious blunders and hanging your pieces.";
      break;
    case 3:
      systemMessageBase += "\nPlay as an intermediate club player. Aim for material advantage, control of central squares, and good piece coordination. Look for basic tactical opportunities like forks, pins, and skewers (1-2 moves ahead). Defend against your opponent's immediate threats. Consider pawn structure and open files.";
      break;
    case 4:
      systemMessageBase += "\nPlay as a strong, advanced chess player. Analyze the position for tactical combinations (forks, pins, skewers, discovered attacks) and strategic advantages (outposts, pawn weaknesses, space). Calculate variations carefully (2-3 moves ahead or more). Your goal is to play precise, strong chess, build up pressure, and convert advantages into a win. Be very mindful of king safety for both sides.";
      break;
  }
  return systemMessageBase;
};

const getTemperatureForDifficulty = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 1: return 0.7;
    case 2: return 0.5;
    case 3: return 0.3;
    case 4: return 0.1;
    default: return 0.5;
  }
}

export const getAIMove = async (
  chessLogic: ChessLogic, // Pass the whole instance
  difficulty: Difficulty,
  validMovesForAI: string[] // e.g. ["e2e4", "g1f3"]
): Promise<string | null> => {
  if (!ai) {
    console.warn("Gemini AI not initialized. Falling back to random move.");
    if (validMovesForAI.length > 0) {
      return validMovesForAI[Math.floor(Math.random() * validMovesForAI.length)];
    }
    return null;
  }

  const fen = chessLogic.boardToFEN();
  const currentPlayer = chessLogic.getCurrentPlayer();
  const systemPrompt = getSystemPrompt(difficulty);
  const temperature = getTemperatureForDifficulty(difficulty);
  const userPrompt = `Current board (FEN): ${fen}\nIt is ${currentPlayer === PieceColor.WHITE ? 'White (w)' : 'Black (b)'}'s turn. Choose your move in UCI format. Valid moves include: ${validMovesForAI.join(', ')}.`;
  
  // console.log("Sending to Gemini:", { systemPrompt, userPrompt, fen, temperature });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: temperature, 
        topP: 0.95, // Setting topP might not be strictly necessary with very low temperatures, but can be kept
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    const aiMoveUci = response.text.trim().toLowerCase(); // Normalize to lowercase
    // console.log("Gemini raw response:", aiMoveUci);

    const uciRegex = /^[a-h][1-8][a-h][1-8][qrnb]?$/; // Validates UCI format e.g. e2e4, e7e8q
    if (!uciRegex.test(aiMoveUci)) {
      console.warn("Gemini proposed an invalidly formatted move:", aiMoveUci, "Falling back to random.");
      if (validMovesForAI.length > 0) return validMovesForAI[Math.floor(Math.random() * validMovesForAI.length)];
      return null;
    }
    
    // Check if Gemini's move is in the list of pre-calculated valid moves
    if (validMovesForAI.includes(aiMoveUci)) {
      // console.log("Gemini proposed valid move:", aiMoveUci);
      return aiMoveUci;
    } else {
      console.warn("Gemini proposed a move not in the pre-calculated valid list:", aiMoveUci, "Valid moves:", validMovesForAI, "Falling back to random.");
      if (validMovesForAI.length > 0) return validMovesForAI[Math.floor(Math.random() * validMovesForAI.length)];
      return null;
    }

  } catch (error) {
    console.error("Error fetching AI move from Gemini:", error);
    if (validMovesForAI.length > 0) {
        console.warn("Falling back to random move due to API error.");
        return validMovesForAI[Math.floor(Math.random() * validMovesForAI.length)];
    }
    return null;
  }
};
