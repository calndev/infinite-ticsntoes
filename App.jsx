const { useState, useRef } = React;

function InfiniteTacsNToes() {
  // ===== STATE =====
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [xMoves, setXMoves] = useState([]);
  const [oMoves, setOMoves] = useState([]);

  const [gameMode, setGameMode] = useState("menu"); // menu | local | ai | hosting | joining | playing
  const [mySymbol, setMySymbol] = useState(null);

  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  const [showOpponentLeftModal, setShowOpponentLeftModal] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const peerRef = useRef(null);
  const connRef = useRef(null);

  // ===== GAME LOGIC =====
  const calculateWinner = (b) => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b2,c] of lines) {
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  const placeMove = (index, symbol) => {
    const newBoard = [...board];
    const moves = symbol === "X" ? [...xMoves] : [...oMoves];

    moves.push(index);
    newBoard[index] = symbol;

    if (moves.length > 3) {
      const removed = moves.shift();
      newBoard[removed] = null;
    }

    setBoard(newBoard);
    symbol === "X" ? setXMoves(moves) : setOMoves(moves);
    setIsXNext(symbol === "O");

    return { newBoard, newX: symbol === "X" ? moves : xMoves, newO: symbol === "O" ? moves : oMoves };
  };

  const handleClick = (i) => {
    if (board[i] || calculateWinner(board)) return;

    if (gameMode === "local") {
      placeMove(i, isXNext ? "X" : "O");
      return;
    }

    if (gameMode === "ai") {
      if (!isXNext || isAIThinking) return;
      placeMove(i, "X");
      setIsAIThinking(true);

      setTimeout(() => {
        const empty = board.map((v,i)=>v===null?i:null).filter(v=>v!==null);
        if (!empty.length) return;
        placeMove(empty[Math.floor(Math.random()*empty.length)], "O");
        setIsAIThinking(false);
      }, 500);
      return;
    }

    if (gameMode === "playing") {
      const myTurn =
        (mySymbol === "X" && isXNext) ||
        (mySymbol === "O" && !isXNext);

      if (!myTurn) return;

      const result = placeMove(i, mySymbol);
      connRef.current?.send({
        type: "move",
        board: result.newBoard,
        xMoves: result.newX,
        oMoves: result.newO,
        isXNext: !isXNext
      });
    }
  };

  // ===== ONLINE =====
  const createRoom = () => {
    const code = Math.random().toString(36).slice(2,8).toUpperCase();
    const peer = new Peer(code);
    peerRef.current = peer;

    peer.on("open", () => {
      setRoomCode(code);
      setMySymbol("X");
      setGameMode("hosting");
      setConnectionStatus("Waiting for opponent...");
    });

    peer.on("connection", (conn) => {
      connRef.current = conn;
      setGameMode("playing");
      conn.send({ type: "init", symbol: "O" });

      conn.on("data", handleIncoming);
      conn.on("close", () => setShowOpponentLeftModal(true));
    });
  };

  const joinRoom = () => {
    if (!joinCode.trim()) return;
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(joinCode.trim());
      connRef.current = conn;

      conn.on("data", handleIncoming);
      conn.on("close", () => setShowOpponentLeftModal(true));
    });

    setGameMode("joining");
  };

  const handleIncoming = (data) => {
    if (data.type === "init") {
      setMySymbol(data.symbol);
      setGameMode("playing");
    }
    if (data.type === "move") {
      setBoard(data.board);
      setXMoves(data.xMoves);
      setOMoves(data.oMoves);
      setIsXNext(data.isXNext);
    }
  };

  const resetAll = () => {
    setBoard(Array(9).fill(null));
    setXMoves([]);
    setOMoves([]);
    setIsXNext(true);
    setGameMode("menu");
    setMySymbol(null);
    setRoomCode("");
    setJoinCode("");
    setConnectionStatus("");
    peerRef.current?.destroy();
    connRef.current?.close();
  };

  // ===== RENDER =====
  const winner = calculateWinner(board);
  const status =
    winner ? `${winner} wins!`
    : gameMode === "ai" ? (isXNext ? "Your turn" : "AI thinking...")
    : gameMode === "playing"
      ? ((mySymbol === "X") === isXNext ? "Your turn" : "Opponent's turn")
      : isXNext ? "X's turn" : "O's turn";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {gameMode === "menu" && (
          <>
            <h1 className="text-4xl font-bold text-center">Infinite TacsNToes</h1>
            <button className="w-full bg-white text-black p-4" onClick={()=>setGameMode("local")}>Local</button>
            <button className="w-full bg-white text-black p-4" onClick={()=>{setGameMode("ai");setMySymbol("X");}}>Vs AI</button>
            <button className="w-full bg-neutral-800 p-4" onClick={createRoom}>Create Room</button>
            <input className="w-full p-3 bg-neutral-900" placeholder="Room code" value={joinCode} onChange={e=>setJoinCode(e.target.value)} />
            <button className="w-full bg-neutral-800 p-4" onClick={joinRoom}>Join Room</button>
          </>
        )}

        {gameMode !== "menu" && (
          <>
            <div className="text-center">{status}</div>
            <div className="grid grid-cols-3 gap-2">
              {board.map((v,i)=>(
                <button key={i} onClick={()=>handleClick(i)} className="aspect-square bg-neutral-900 text-7xl">
                  {v}
                </button>
              ))}
            </div>
            <button className="w-full bg-neutral-800 p-3" onClick={resetAll}>Leave</button>
          </>
        )}

      </div>
    </div>
  );
}
