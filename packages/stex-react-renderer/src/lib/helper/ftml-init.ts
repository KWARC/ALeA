
let flamsInitialized = false;
const initStartTime = Date.now();

export function getFlamsInitialized(): boolean {
  return flamsInitialized;
}

export function setFlamsInitialized(value: boolean): void {
  flamsInitialized = value;
}

export function getInitStartTime(): number {
  return initStartTime;
}

