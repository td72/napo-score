import { useEffect, useState } from "react";
import { type State, emptyState } from "./types";
import { load, save, clear } from "./lib/persistence";
import { decodeState, extractCode } from "./lib/encode";
import { addToHistory } from "./lib/playerHistory";
import { SET_LENGTH } from "./types";
import { Setup } from "./screens/Setup";
import { Game } from "./screens/Game";
import { Toast } from "./components/Toast";
import { useToast } from "./lib/useToast";

function bootState(): State {
  const hash = location.hash;
  if (hash && hash.length > 1) {
    const decoded = decodeState(extractCode(hash));
    if (decoded) {
      addToHistory(decoded.players);
      history.replaceState(null, "", location.pathname + location.search);
      return decoded;
    }
  }
  return load();
}

function App() {
  const [state, _setState] = useState<State>(bootState);
  const { message, show } = useToast();

  const setState = (next: State) => {
    save(next);
    _setState(next);
  };

  const updatePlayer = (i: number, name: string) => {
    const players = state.players.slice() as State["players"];
    players[i] = name;
    setState({ ...state, players });
  };

  const startSet = () => {
    const players = state.players.map((n, i) => n.trim() || `Player ${i + 1}`) as State["players"];
    addToHistory(state.players);
    history.replaceState(null, "", location.pathname + location.search);
    setState({ players, games: [], started: true });
  };

  const restoreFromCode = (next: State) => {
    addToHistory(next.players);
    setState(next);
  };

  const reset = () => {
    clear();
    history.replaceState(null, "", location.pathname + location.search);
    _setState(emptyState());
  };

  /* Header progress indicator */
  const progress = state.started
    ? `<b>${String(state.games.length).padStart(2, "0")}</b> / ${SET_LENGTH}`
    : "setup";

  useEffect(() => {
    save(state);
  }, [state]);

  return (
    <div className="app">
      <header className="h">
        <div className="brand">
          <span className="mark">N°</span>
          <h1>ナポレオン 記録帳</h1>
        </div>
        <div className="progress" dangerouslySetInnerHTML={{ __html: progress }} />
      </header>
      {state.started ? (
        <Game state={state} setState={setState} onReset={reset} showToast={show} />
      ) : (
        <Setup
          state={state}
          onPlayerChange={updatePlayer}
          onStart={startSet}
          onRestore={restoreFromCode}
          showToast={show}
        />
      )}
      <footer>napoleon ledger · v.2 · stationery</footer>
      <Toast message={message} />
    </div>
  );
}

export default App;
