import type { RemoteControlContentMode } from '../../features/remote-control/remote-control.models';

export function modeLabel(mode: RemoteControlContentMode): string {
  if (mode === 'iframe') {
    return 'Iframe';
  }
  if (mode === 'fixed') {
    return 'Fijo';
  }
  return 'Rotación';
}

export function adsLabel(visible: boolean): string {
  return visible ? 'Visible' : 'Ocultos';
}

export function displayLabel(online: boolean | null | undefined): string {
  if (online === null || online === undefined) {
    return 'Estado desconocido';
  }
  return online ? 'Display en línea' : 'Display desconectado';
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return 'nunca';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'nunca';
  }
  const now = new Date();
  const deltaMs = now.getTime() - date.getTime();
  if (deltaMs < 0) {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
  const deltaSec = Math.floor(deltaMs / 1000);
  if (deltaSec < 30) {
    return 'hace un momento';
  }
  if (deltaSec < 60) {
    return `hace ${deltaSec} segundos`;
  }
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return deltaMin === 1 ? 'hace 1 minuto' : `hace ${deltaMin} minutos`;
  }
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toISOString().slice(0, 16).replace('T', ' ');
}
