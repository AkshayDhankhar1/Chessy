import { useState, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { getPieceSVG } from './Piece';
import './ChessBoard.css';

// Parse FEN string into 8x8 board array
function parseFEN(fen) {
  const rows = fen.split(' ')[0].split('/');
  const board = [];
  for (const row of rows) {
    const boardRow = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) boardRow.push(null);
      } else {
        boardRow.push(ch);
      }
    }
    board.push(boardRow);
  }
  return board;
}

export default function ChessBoard({ fen, myColor, onMove, isMyTurn, lastMove, isCheck }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [dragPiece, setDragPiece] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [promotionData, setPromotionData] = useState(null);

  const flipped = myColor === 'b';
  const board = useMemo(() => parseFEN(fen), [fen]);

  // Use chess.js on client side for legal move highlighting
  const chess = useMemo(() => {
    const c = new Chess(fen);
    return c;
  }, [fen]);

  const getSquareName = useCallback((row, col) => {
    const file = String.fromCharCode(97 + col); // a-h
    const rank = 8 - row; // 1-8
    return `${file}${rank}`;
  }, []);

  const getDisplayCoords = useCallback((row, col) => {
    if (flipped) return [7 - row, 7 - col];
    return [row, col];
  }, [flipped]);

  const getLegalMovesForSquare = useCallback((square) => {
    try {
      const moves = chess.moves({ square, verbose: true });
      return moves.map(m => m.to);
    } catch { return []; }
  }, [chess]);

  const isLastMove = useCallback((square) => {
    if (!lastMove) return false;
    return square === lastMove.from || square === lastMove.to;
  }, [lastMove]);

  const findKingSquare = useCallback((color) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece === (color === 'w' ? 'K' : 'k')) {
          return getSquareName(r, c);
        }
      }
    }
    return null;
  }, [board, getSquareName]);

  const handleSquareClick = useCallback((row, col) => {
    if (promotionData) return;
    const square = getSquareName(row, col);
    const piece = board[row][col];

    if (selectedSquare) {
      // Try to move
      if (legalMoves.includes(square)) {
        // Check if pawn promotion
        const selPiece = board[selectedSquare.row][selectedSquare.col];
        const isPawn = selPiece === 'P' || selPiece === 'p';
        const isPromotionRank = (myColor === 'w' && row === 0) || (myColor === 'b' && row === 7);
        
        if (isPawn && isPromotionRank) {
          setPromotionData({
            from: getSquareName(selectedSquare.row, selectedSquare.col),
            to: square,
          });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        onMove(getSquareName(selectedSquare.row, selectedSquare.col), square);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Click on own piece — reselect
      if (piece && isMyTurn) {
        const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
        if (pieceColor === myColor) {
          const moves = getLegalMovesForSquare(square);
          setSelectedSquare({ row, col });
          setLegalMoves(moves);
          return;
        }
      }

      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select piece
    if (piece && isMyTurn) {
      const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
      if (pieceColor === myColor) {
        const moves = getLegalMovesForSquare(square);
        setSelectedSquare({ row, col });
        setLegalMoves(moves);
      }
    }
  }, [selectedSquare, legalMoves, board, myColor, isMyTurn, getSquareName, getLegalMovesForSquare, onMove, promotionData]);

  // Drag and drop
  const handleDragStart = useCallback((e, row, col) => {
    if (!isMyTurn) return;
    const piece = board[row][col];
    if (!piece) return;
    const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
    if (pieceColor !== myColor) return;

    const square = getSquareName(row, col);
    const moves = getLegalMovesForSquare(square);
    
    setDragPiece({ row, col, piece });
    setSelectedSquare({ row, col });
    setLegalMoves(moves);
    
    const rect = e.currentTarget.closest('.chess-board').getBoundingClientRect();
    setDragPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [isMyTurn, board, myColor, getSquareName, getLegalMovesForSquare]);

  const handleDragMove = useCallback((e) => {
    if (!dragPiece) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [dragPiece]);

  const handleDragEnd = useCallback((e) => {
    if (!dragPiece) return;
    
    const boardEl = e.currentTarget;
    const rect = boardEl.getBoundingClientRect();
    const squareSize = rect.width / 8;
    
    let col = Math.floor((e.clientX - rect.left) / squareSize);
    let row = Math.floor((e.clientY - rect.top) / squareSize);
    
    if (flipped) {
      row = 7 - row;
      col = 7 - col;
    }

    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const targetSquare = getSquareName(row, col);
      if (legalMoves.includes(targetSquare)) {
        const fromSquare = getSquareName(dragPiece.row, dragPiece.col);
        const isPawn = dragPiece.piece === 'P' || dragPiece.piece === 'p';
        const isPromotionRank = (myColor === 'w' && row === 0) || (myColor === 'b' && row === 7);
        
        if (isPawn && isPromotionRank) {
          setPromotionData({ from: fromSquare, to: targetSquare });
        } else {
          onMove(fromSquare, targetSquare);
        }
      }
    }

    setDragPiece(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [dragPiece, flipped, legalMoves, getSquareName, myColor, onMove]);

  const handlePromotion = useCallback((pieceType) => {
    if (promotionData) {
      onMove(promotionData.from, promotionData.to, pieceType);
      setPromotionData(null);
    }
  }, [promotionData, onMove]);

  // Render
  const renderBoard = () => {
    const squares = [];
    const currentTurn = fen.split(' ')[1];
    const kingSquare = isCheck ? findKingSquare(currentTurn) : null;

    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const [row, col] = flipped
          ? [7 - displayRow, 7 - displayCol]
          : [displayRow, displayCol];

        const square = getSquareName(row, col);
        const piece = board[row][col];
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
        const isLegal = legalMoves.includes(square);
        const isLast = isLastMove(square);
        const isKingInCheck = kingSquare === square;
        const isDragging = dragPiece?.row === row && dragPiece?.col === col;

        let className = `square ${isLight ? 'light' : 'dark'}`;
        if (isSelected) className += ' selected';
        if (isLast) className += ' last-move';
        if (isKingInCheck) className += ' in-check';

        squares.push(
          <div
            key={square}
            className={className}
            onClick={() => handleSquareClick(row, col)}
            onMouseDown={(e) => handleDragStart(e, row, col)}
            data-square={square}
          >
            {/* Coordinate labels */}
            {displayCol === 0 && (
              <span className="coord rank">{8 - (flipped ? 7 - displayRow : displayRow)}</span>
            )}
            {displayRow === 7 && (
              <span className="coord file">{String.fromCharCode(97 + (flipped ? 7 - displayCol : displayCol))}</span>
            )}

            {/* Legal move indicator */}
            {isLegal && (
              <div className={`legal-move ${piece ? 'capture' : ''}`} />
            )}

            {/* Piece */}
            {piece && !isDragging && (
              <div className="piece-container">
                {getPieceSVG(piece)}
              </div>
            )}
          </div>
        );
      }
    }
    return squares;
  };

  return (
    <div className="chess-board-wrapper">
      <div
        className="chess-board"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {renderBoard()}

        {/* Dragging piece */}
        {dragPiece && (
          <div
            className="dragging-piece"
            style={{
              left: dragPos.x - 32,
              top: dragPos.y - 32,
              pointerEvents: 'none',
            }}
          >
            {getPieceSVG(dragPiece.piece)}
          </div>
        )}

        {/* Promotion dialog */}
        {promotionData && (
          <div className="promotion-overlay">
            <div className="promotion-dialog">
              <p>Promote to:</p>
              <div className="promotion-options">
                {['q', 'r', 'b', 'n'].map((p) => (
                  <button
                    key={p}
                    className="promotion-btn"
                    onClick={() => handlePromotion(p)}
                  >
                    {getPieceSVG(myColor === 'w' ? p.toUpperCase() : p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
