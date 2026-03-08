type Listener = () => void;

let _uri: string | null = null;
const _listeners = new Set<Listener>();

export function setSnapshot(uri: string): void {
  _uri = uri;
  _listeners.forEach((fn) => fn());
}

export function getSnapshot(): string | null {
  return _uri;
}

export function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
