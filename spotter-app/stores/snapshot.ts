type Listener = () => void;

// ── Snapshot (image URI) ──────────────────────────────────
let _uri: string | null = null;
const _uriListeners = new Set<Listener>();

export function setSnapshot(uri: string): void {
  _uri = uri;
  _uriListeners.forEach((fn) => fn());
}

export function getSnapshot(): string | null {
  return _uri;
}

export function subscribe(listener: Listener): () => void {
  _uriListeners.add(listener);
  return () => _uriListeners.delete(listener);
}

// ── Last voice command result ─────────────────────────────
export type LastCommand = {
  transcript: string;
  intent: string;
  response: string;
  espPlaybackOk: boolean;
  time: string;
};

let _lastCommand: LastCommand | null = null;
const _cmdListeners = new Set<Listener>();

export function setLastCommand(cmd: LastCommand): void {
  _lastCommand = cmd;
  _cmdListeners.forEach((fn) => fn());
}

export function getLastCommand(): LastCommand | null {
  return _lastCommand;
}

export function subscribeCommand(listener: Listener): () => void {
  _cmdListeners.add(listener);
  return () => _cmdListeners.delete(listener);
}
