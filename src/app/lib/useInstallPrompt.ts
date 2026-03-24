import { useCallback, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  platforms: string[];
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIosLikeDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1 &&
      typeof navigatorWithStandalone.standalone !== 'undefined')
  );
}

function isRunningStandalone() {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

export interface InstallPromptState {
  canPromptInstall: boolean;
  isInstalled: boolean;
  isIosLike: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosLike, setIsIosLike] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateStandaloneState = () => {
      const standalone = isRunningStandalone();
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    setIsIosLike(isIosLikeDevice());
    updateStandaloneState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsStandalone(true);
    };

    mediaQuery.addEventListener('change', updateStandaloneState);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', updateStandaloneState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return useMemo(
    () => ({
      canPromptInstall: deferredPrompt !== null,
      isInstalled,
      isIosLike,
      isStandalone,
      promptInstall,
    }),
    [deferredPrompt, isInstalled, isIosLike, isStandalone, promptInstall],
  );
}
