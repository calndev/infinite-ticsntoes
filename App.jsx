const { useState, useEffect, useRef } = React;

    function InfiniteTacsNToes() {
      const [board, setBoard] = useState(Array(9).fill(null));
      const [isXNext, setIsXNext] = useState(true);
      const [xMoves, setXMoves] = useState([]);
      const [oMoves, setOMoves] = useState([]);
      const [gameMode, setGameMode] = useState('menu');
      const [myPeerId, setMyPeerId] = useState('');
      const [roomCode, setRoomCode] = useState('');
      const [joinCode, setJoinCode] = useState('');
      const [isHost, setIsHost] = useState(false);
      const [mySymbol, setMySymbol] = useState(null);
      const [connectionStatus, setConnectionStatus] = useState('');
      const [isAIThinking, setIsAIThinking] = useState(false);


      const calculateWinner = (squares) => {
        const lines = [
          [0, 1, 2],
          [3, 4, 5],
          [6, 7, 8],
          [0, 3, 6],
          [1, 4, 7],
          [2, 5, 8],
          [0, 4, 8],
          [2, 4, 6],
        ];
        for (let i = 0; i < lines.length; i++) {
          const [a, b, c] = lines[i];
          if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
          }
        }
        return null;
      };

      const sendGameState = (data) => {
        if (connRef.current && connRef.current.open) {
          connRef.current.send(data);
        }
      };

      const handleClick = (index) => {
        if (gameMode === 'local') {
          handleLocalClick(index);
        } else if (gameMode === 'ai') {
          handleAIClick(index);
        } else if (gameMode === 'playing') {
          handleOnlineClick(index);
        }
      };

      const makeAIMove = (currentBoard, currentXMoves, currentOMoves, currentIsXNext) => {
        setIsAIThinking(true);
        
        setTimeout(() => {
          const emptySquares = currentBoard
            .map((cell, idx) => cell === null ? idx : null)
            .filter(idx => idx !== null);
          
          if (emptySquares.length === 0) {
            setIsAIThinking(false);
            return;
          }

          const aiSymbol = 'O';
          const playerSymbol = 'X';
          
          let bestMove = findWinningMove(currentBoard, aiSymbol);
          
          if (bestMove === null) {
            bestMove = findWinningMove(currentBoard, playerSymbol);
          }
          
          if (bestMove === null) {
            if (emptySquares.includes(4)) {
              bestMove = 4;
            } else {
              bestMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
            }
          }

          const newBoard = [...currentBoard];
          const aiMoves = [...currentOMoves];
          
          aiMoves.push(bestMove);
          newBoard[bestMove] = aiSymbol;

          if (aiMoves.length > 3) {
            const oldestMove = aiMoves.shift();
            newBoard[oldestMove] = null;
          }

          setBoard(newBoard);
          setOMoves(aiMoves);
          setIsXNext(true);
          setIsAIThinking(false);
        }, 500);
      };

      const findWinningMove = (currentBoard, symbol) => {
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6]
        ];

        for (let line of lines) {
          const [a, b, c] = line;
          const values = [currentBoard[a], currentBoard[b], currentBoard[c]];
          const symbolCount = values.filter(v => v === symbol).length;
          const nullCount = values.filter(v => v === null).length;

          if (symbolCount === 2 && nullCount === 1) {
            if (currentBoard[a] === null) return a;
            if (currentBoard[b] === null) return b;
            if (currentBoard[c] === null) return c;
          }
        }
        return null;
      };

      const handleAIClick = (index) => {
        if (!isXNext || board[index] || calculateWinner(board) || isAIThinking) {
          return;
        }

        const newBoard = [...board];
        const playerMoves = [...xMoves];
        
        playerMoves.push(index);
        newBoard[index] = 'X';

        if (playerMoves.length > 3) {
          const oldestMove = playerMoves.shift();
          newBoard[oldestMove] = null;
        }

        setBoard(newBoard);
        setXMoves(playerMoves);
        setIsXNext(false);
        
        if (!calculateWinner(newBoard)) {
          makeAIMove(newBoard, playerMoves, oMoves, false);
        }
      };

      const handleLocalClick = (index) => {
        if (board[index] || calculateWinner(board)) {
          return;
        }

        const newBoard = [...board];
        const currentPlayer = isXNext ? 'X' : 'O';
        const currentMoves = isXNext ? [...xMoves] : [...oMoves];
        
        currentMoves.push(index);
        newBoard[index] = currentPlayer;

        if (currentMoves.length > 3) {
          const oldestMove = currentMoves.shift();
          newBoard[oldestMove] = null;
        }

        setBoard(newBoard);
        if (isXNext) {
          setXMoves(currentMoves);
        } else {
          setOMoves(currentMoves);
        }
        setIsXNext(!isXNext);
      };

      const handleOnlineClick = (index) => {
        const isMyTurn = (mySymbol === 'X' && isXNext) || (mySymbol === 'O' && !isXNext);
        
        if (!isMyTurn || board[index] || calculateWinner(board)) {
          return;
        }

        const newBoard = [...board];
        const currentPlayer = mySymbol;
        const currentMoves = mySymbol === 'X' ? [...xMoves] : [...oMoves];
        
        currentMoves.push(index);
        newBoard[index] = currentPlayer;

        if (currentMoves.length > 3) {
          const oldestMove = currentMoves.shift();
          newBoard[oldestMove] = null;
        }

        const newXMoves = mySymbol === 'X' ? currentMoves : xMoves;
        const newOMoves = mySymbol === 'O' ? currentMoves : oMoves;

        setBoard(newBoard);
        setXMoves(newXMoves);
        setOMoves(newOMoves);
        setIsXNext(!isXNext);

        sendGameState({
          type: 'move',
          board: newBoard,
          xMoves: newXMoves,
          oMoves: newOMoves,
          isXNext: !isXNext
        });
      };

      const resetGame = () => {
        const currentWinner = calculateWinner(board);
        if (currentWinner) {
          if (gameMode === 'ai') {
            if (currentWinner === 'X') {
              setPlayerScore(playerScore + 1);
            } else {
              setOpponentScore(opponentScore + 1);
            }
          } else if (gameMode === 'playing') {
            if (currentWinner === mySymbol) {
              setPlayerScore(playerScore + 1);
            } else {
              setOpponentScore(opponentScore + 1);
            }
          }
        }

        const newBoard = Array(9).fill(null);
        setBoard(newBoard);
        setXMoves([]);
        setOMoves([]);
        setIsXNext(true);

        if (gameMode === 'playing') {
          sendGameState({
            type: 'reset',
            board: newBoard,
            xMoves: [],
            oMoves: [],
            isXNext: true
          });
        }
      };

      const createRoom = () => {
        const simpleCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const peer = new Peer(simpleCode);
        peerRef.current = peer;

        peer.on('open', (id) => {
          setMyPeerId(id);
          setRoomCode(simpleCode);
          setIsHost(true);
          setMySymbol('X');
          setGameMode('hosting');
          setConnectionStatus('Waiting for opponent...');
        });

        peer.on('connection', (conn) => {
          connRef.current = conn;
          setConnectionStatus('Opponent connected!');
          
          conn.on('open', () => {
            setGameMode('playing');
            conn.send({ type: 'init', symbol: 'O' });
          });

          conn.on('data', (data) => {
            handleReceivedData(data);
          });

          conn.on('close', () => {
            setShowOpponentLeftModal(true);
          });
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setConnectionStatus('Connection error');
        });
      };

      const joinRoom = () => {
        if (!joinCode.trim()) return;

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
          setMyPeerId(id);
          setConnectionStatus('Connecting...');
          
          const conn = peer.connect(joinCode.trim());
          connRef.current = conn;

          conn.on('open', () => {
            setConnectionStatus('Connected!');
            setGameMode('joining');
          });

          conn.on('data', (data) => {
            if (data.type === 'init') {
              setMySymbol(data.symbol);
              setGameMode('playing');
            }
            handleReceivedData(data);
          });

          conn.on('close', () => {
            setShowOpponentLeftModal(true);
          });

          conn.on('error', (err) => {
            console.error('Connection error:', err);
            setConnectionStatus('Failed to connect. Check the room code.');
          });
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setConnectionStatus('Connection error');
        });
      };

      const handleReceivedData = (data) => {
        if (data.type === 'move' || data.type === 'reset') {
          setBoard(data.board);
          setXMoves(data.xMoves);
          setOMoves(data.oMoves);
          setIsXNext(data.isXNext);
        }
      };

      const resetGameFull = () => {
        setBoard(Array(9).fill(null));
        setXMoves([]);
        setOMoves([]);
        setIsXNext(true);
        setMySymbol(null);
        setIsHost(false);
        setRoomCode('');
        setJoinCode('');
        setConnectionStatus('');
        setPlayerScore(0);
        setOpponentScore(0);
        if (connRef.current) {
          connRef.current.close();
        }
        if (peerRef.current) {
          peerRef.current.destroy();
        }
      };

      const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        setConnectionStatus('Room code copied!');
        setTimeout(() => setConnectionStatus('Waiting for opponent...'), 2000);
      };

      const winner = calculateWinner(board);
      
      let status = '';
      if (gameMode === 'local') {
        status = winner ? `Winner: ${winner}!` : `Next player: ${isXNext ? 'X' : 'O'}`;
      } else if (gameMode === 'ai') {
        if (winner) {
          status = winner === 'X' ? 'You won!' : 'AI wins!';
        } else {
          status = isXNext ? 'Your turn' : (isAIThinking ? 'AI is thinking...' : "AI's turn");
        }
      } else if (gameMode === 'playing') {
        if (winner) {
          status = winner === mySymbol ? 'You won!' : 'You lost!';
        } else {
          const isMyTurn = (mySymbol === 'X' && isXNext) || (mySymbol === 'O' && !isXNext);
          status = isMyTurn ? 'Your turn' : "Opponent's turn";
        }
      }

      if (gameMode === 'menu') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-4">
            <div className="w-full max-w-md">
              <h1 className="text-4xl font-semibold text-center mb-2 text-neutral-100">
                Infinite TacsNToes
              </h1>
              <p className="text-center text-neutral-400 mb-12 text-sm">
                Each player can only have 3 pieces on the board
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => setGameMode('local')}
                  className="w-full bg-neutral-100 text-neutral-950 font-medium py-4 px-6 
                             hover:bg-white transition-all duration-150"
                >
                  Play Locally (Same Device)
                </button>
                
                <button
                  onClick={() => {
                    setGameMode('ai');
                    setMySymbol('X');
                  }}
                  className="w-full bg-neutral-100 text-neutral-950 font-medium py-4 px-6 
                             hover:bg-white transition-all duration-150"
                >
                  Play vs AI
                </button>
                
                <button
                  onClick={createRoom}
                  className="w-full bg-neutral-800 text-neutral-100 font-medium py-4 px-6 
                             hover:bg-neutral-700 transition-all duration-150"
                >
                  Create Room (Host)
                </button>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full bg-neutral-900 text-neutral-100 border border-neutral-800 
                               py-3 px-4 focus:outline-none focus:border-neutral-600"
                  />
                  <button
                    onClick={joinRoom}
                    className="w-full bg-neutral-800 text-neutral-100 font-medium py-4 px-6 
                               hover:bg-neutral-700 transition-all duration-150"
                  >
                    Join Room
                    </button>
                </div>
            </div>
        </div>
        </div>
        )};


        if (gameMode === 'hosting' || gameMode === 'joining') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-4">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-semibold text-center mb-8 text-neutral-100">
                {gameMode === 'hosting' ? 'Room Created' : 'Joining Room'}
              </h1>
              
              {gameMode === 'hosting' && (
                <div className="bg-neutral-900 border border-neutral-800 p-6 mb-6">
                  <p className="text-neutral-400 text-sm mb-2">Share this code with your opponent:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-neutral-950 text-neutral-100 font-mono text-lg py-3 px-4 border border-neutral-800">
                      {roomCode}
                    </div>
                    <button
                      onClick={copyRoomCode}
                      className="bg-neutral-100 text-neutral-950 px-4 hover:bg-white transition-all duration-150"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-center text-neutral-400 mb-8">
                {connectionStatus}
              </p>
              
              <button
                onClick={() => {
                  resetGameFull();
                  setGameMode('menu');
                }}
                className="w-full bg-neutral-800 text-neutral-100 font-medium py-3 px-6 
                           hover:bg-neutral-700 transition-all duration-150">

                Cancel
              </button>
            </div>
          </div>
            );
          }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-4">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold text-center mb-2 text-neutral-100">
              Infinite TacsNToes
            </h1>
            
            {(gameMode === 'ai' || gameMode === 'playing') && (
              <div className="text-center text-neutral-400 text-sm mb-6">
                You: {playerScore} | {gameMode === 'ai' ? 'AI' : 'Opponent'}: {opponentScore}
              </div>
            )}
            
            <p className="text-center text-neutral-400 mb-8 text-sm">
              Each player can only have 3 pieces on the board
            </p>
            
            <div className="text-xl font-medium text-center mb-6 text-neutral-200">
              {status}
            </div>

            <style>
              {`
                @keyframes pulse-glow {
                  0%, 100% {
                    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
                  }
                  50% {
                    filter: drop-shadow(0 0 16px rgba(239, 68, 68, 1));
                  }
                }
                .pulse-red {
                  animation: pulse-glow 1.5s ease-in-out infinite;
                }
              `}
            </style>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {board.map((cell, index) => {
                const isXTurn = isXNext;
                const willBeRemoved = cell === 'X' && isXTurn && xMoves.length === 3 && xMoves[0] === index ||
                                     cell === 'O' && !isXTurn && oMoves.length === 3 && oMoves[0] === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleClick(index)}
                    className="aspect-square bg-neutral-900 border border-neutral-800 
                               hover:bg-neutral-800 hover:border-neutral-700 
                               transition-all duration-150 
                               text-8xl font-black flex items-center justify-center
                               disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontFamily: '"Rounded Mplus 1c", "M PLUS Rounded 1c", ui-rounded, "Nunito", "Quicksand", system-ui, sans-serif', lineHeight: 1 }}
                    disabled={winner !== null}
                  >
                    <span className={`${cell === 'X' ? 'text-neutral-100' : 'text-neutral-400'} ${willBeRemoved ? 'pulse-red' : ''}`}>
                      {cell}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-sm text-neutral-400 mb-6 px-1">
              <div>
                <span className="text-neutral-100">X:</span> {xMoves.length}/3
              </div>
              <div>
                <span className="text-neutral-400">O:</span> {oMoves.length}/3
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={resetGame}
                className="w-full bg-neutral-100 text-neutral-950 font-medium py-3 px-6 
                           hover:bg-white transition-all duration-150"
              >
                Reset Game
              </button>
              
              <button
                onClick={() => {
                  resetGameFull();
                  setGameMode('menu');
                }}
                className="w-full bg-neutral-800 text-neutral-100 font-medium py-3 px-6 
                           hover:bg-neutral-700 transition-all duration-150"
              >
                Leave Game
              </button>
            </div>
          </div>
          
          {showOpponentLeftModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-neutral-900 border border-neutral-800 p-8 max-w-sm w-full mx-4">
                <h2 className="text-2xl font-semibold text-center mb-6 text-neutral-100">
                  Opponent left :
                </h2>
                <button
                  onClick={() => {
                    setShowOpponentLeftModal(false);
                    resetGameFull();
                    setGameMode('menu');
                  }}
                  className="w-full bg-neutral-100 text-neutral-950 font-medium py-3 px-6 
                             hover:bg-white transition-all duration-150"
                >
                  Back to menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
