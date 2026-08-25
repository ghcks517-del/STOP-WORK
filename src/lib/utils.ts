import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isRunningAsPWA(): boolean {
  // Check standard display-mode
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  // Check iOS standalone property (deprecated but still useful for older iOS)
  const iosStandalone = (window.navigator as any).standalone === true;

  return standalone || iosStandalone;
}
