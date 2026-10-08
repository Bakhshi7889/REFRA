/**
 * Refra Google Cast (Chromecast) & AirPlay Service
 * Powered by CastJS (Default Media Receiver CC1AD845) + Native Web Sender & AirPlay
 */

declare global {
  interface Window {
    Castjs?: any;
    chrome?: any;
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
}

export interface CastState {
  isAvailable: boolean;
  isConnected: boolean;
  deviceName: string;
  state: 'idle' | 'buffering' | 'playing' | 'paused';
  currentTime: number;
  time: number; // alias for currentTime
  duration: number;
  volume: number; // 0 to 100
  isMuted: boolean;
  muted: boolean; // alias for isMuted
  paused: boolean; // true when state === 'paused' or state === 'idle'
  mediaTitle: string;
  mediaPoster?: string;
}

type CastListener = (state: CastState) => void;

class CastService {
  private cjsInstance: any = null;
  private listeners: Set<CastListener> = new Set();
  private state: CastState = {
    isAvailable: false,
    isConnected: false,
    deviceName: '',
    state: 'idle',
    currentTime: 0,
    time: 0,
    duration: 0,
    volume: 85,
    isMuted: false,
    muted: false,
    paused: true,
    mediaTitle: '',
    mediaPoster: '',
  };
  private initAttempts = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initCastJs();
      // Also check native Cast/AirPlay presence
      this.checkNativeAvailability();
    }
  }

  private initCastJs() {
    if (typeof window === 'undefined') return;

    if (window.Castjs) {
      try {
        this.cjsInstance = new window.Castjs({
          receiver: 'CC1AD845', // Default Media Receiver
          joinpolicy: 'tab_and_origin_scoped',
        });
        this.attachEventListeners();
        this.updateState();
      } catch (err) {
        console.warn('[CastService] Error initializing Castjs:', err);
      }
    } else if (this.initAttempts < 20) {
      this.initAttempts++;
      setTimeout(() => this.initCastJs(), 500);
    }
  }

  private checkNativeAvailability() {
    if (typeof window === 'undefined') return;
    const hasChromeCast = Boolean(window.chrome?.cast);
    const hasPresentation = 'PresentationRequest' in window;
    const hasRemote = typeof HTMLVideoElement !== 'undefined' && 'remote' in HTMLVideoElement.prototype;
    const hasAirplay = 'WebKitPlaybackTargetAvailabilityEvent' in window;

    if (hasChromeCast || hasPresentation || hasRemote || hasAirplay) {
      if (!this.state.isAvailable) {
        this.state.isAvailable = true;
        this.notify();
      }
    }
  }

  private attachEventListeners() {
    if (!this.cjsInstance) return;

    this.cjsInstance.on('available', () => {
      this.state.isAvailable = true;
      this.notify();
    });

    this.cjsInstance.on('connect', () => {
      this.state.isConnected = true;
      this.state.deviceName = this.cjsInstance.device || 'Chromecast Screen';
      this.state.mediaTitle = this.cjsInstance.title || this.state.mediaTitle;
      this.state.mediaPoster = this.cjsInstance.poster || this.state.mediaPoster;
      this.notify();
    });

    this.cjsInstance.on('disconnect', () => {
      this.state.isConnected = false;
      this.state.deviceName = '';
      this.state.state = 'idle';
      this.state.currentTime = 0;
      this.notify();
    });

    this.cjsInstance.on('statechange', () => {
      const s = this.cjsInstance.state;
      if (s === 'playing' || s === 'paused' || s === 'buffering') {
        this.state.state = s;
      } else {
        this.state.state = 'idle';
      }
      this.notify();
    });

    this.cjsInstance.on('timeupdate', () => {
      this.state.currentTime = this.cjsInstance.time || 0;
      this.state.duration = this.cjsInstance.duration || 0;
      this.notify();
    });

    this.cjsInstance.on('volumechange', () => {
      const vol = this.cjsInstance.volumeLevel !== undefined ? Math.round(this.cjsInstance.volumeLevel * 100) : 85;
      this.state.volume = vol;
      this.state.isMuted = Boolean(this.cjsInstance.muted);
      this.notify();
    });
  }

  private updateState() {
    if (!this.cjsInstance) return;
    this.state.isAvailable = Boolean(this.cjsInstance.available) || this.state.isAvailable;
    this.state.isConnected = Boolean(this.cjsInstance.connected);
    if (this.cjsInstance.device) {
      this.state.deviceName = this.cjsInstance.device;
    }
    this.notify();
  }

  public subscribe(listener: CastListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): CastState {
    return {
      ...this.state,
      time: this.state.currentTime,
      muted: this.state.isMuted,
      paused: this.state.state === 'paused' || this.state.state === 'idle',
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch (e) {
        console.error('[CastService] listener error:', e);
      }
    });
  }

  /**
   * Cast a direct media URL (MP4, HLS m3u8) to Google Cast / Chromecast
   */
  public async cast(
    videoUrl: string,
    metadata: {
      title: string;
      poster?: string;
      description?: string;
      time?: number;
    }
  ): Promise<boolean> {
    if (!this.cjsInstance && window.Castjs) {
      this.initCastJs();
    }

    if (this.cjsInstance) {
      try {
        this.state.mediaTitle = metadata.title;
        this.state.mediaPoster = metadata.poster;
        this.cjsInstance.cast(videoUrl, {
          title: metadata.title,
          poster: metadata.poster || '',
          description: metadata.description || 'Streaming via Refra 4K',
          time: metadata.time || 0,
        });
        return true;
      } catch (err) {
        console.warn('[CastService] Castjs cast invocation error:', err);
      }
    }

    // Fallback: Check if native Google Cast / Presentation API is available
    return this.triggerNativeCast(videoUrl);
  }

  /**
   * Fallback for AirPlay, Presentation API, or Screen Mirroring
   */
  public async triggerNativeCast(videoElementOrUrl?: HTMLVideoElement | string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. AirPlay on Safari HTMLVideoElement
    if (
      videoElementOrUrl &&
      typeof videoElementOrUrl !== 'string' &&
      'webkitShowPlaybackTargetPicker' in videoElementOrUrl
    ) {
      try {
        (videoElementOrUrl as any).webkitShowPlaybackTargetPicker();
        this.state.isConnected = true;
        this.state.deviceName = 'Apple TV / AirPlay';
        this.notify();
        return true;
      } catch (e) {
        console.warn('[CastService] webkitShowPlaybackTargetPicker error:', e);
      }
    }

    // 2. Presentation API (Chromecast, Smart TV screen mirroring)
    if ('PresentationRequest' in window && typeof videoElementOrUrl === 'string') {
      try {
        // @ts-expect-error PresentationRequest constructor
        const presentation = new window.PresentationRequest([videoElementOrUrl]);
        await presentation.start();
        this.state.isConnected = true;
        this.state.deviceName = 'Living Room Display';
        this.notify();
        return true;
      } catch (e) {
        console.warn('[CastService] PresentationRequest error:', e);
      }
    }

    // 3. Screen Cast / Display Media
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        this.state.isConnected = true;
        this.state.deviceName = 'Browser Cast / Screen Mirror';
        this.notify();
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          this.disconnect();
        });
        return true;
      } catch (e) {
        console.warn('[CastService] getDisplayMedia error:', e);
      }
    }

    return false;
  }

  public play() {
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.play();
    }
  }

  public pause() {
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.pause();
    }
  }

  public togglePlayPause() {
    if (this.state.state === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number) {
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.seek(seconds, false);
    }
  }

  public setVolume(volumePercent: number) {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    this.state.volume = clamped;
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.volume(clamped / 100);
    }
    this.notify();
  }

  public volume(volumeRatioOrPercent: number) {
    const vol = volumeRatioOrPercent <= 1 && volumeRatioOrPercent > 0 ? volumeRatioOrPercent * 100 : volumeRatioOrPercent;
    this.setVolume(vol);
  }

  public mute() {
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.mute();
      this.state.isMuted = true;
      this.state.muted = true;
      this.notify();
    }
  }

  public unmute() {
    if (this.cjsInstance && this.state.isConnected) {
      this.cjsInstance.unmute();
      this.state.isMuted = false;
      this.state.muted = false;
      this.notify();
    }
  }

  public toggleMute() {
    if (this.cjsInstance && this.state.isConnected) {
      if (this.state.isMuted) {
        this.unmute();
      } else {
        this.mute();
      }
    }
  }

  public disconnect() {
    if (this.cjsInstance && this.state.isConnected) {
      try {
        this.cjsInstance.disconnect();
      } catch {}
    }
    this.state.isConnected = false;
    this.state.deviceName = '';
    this.state.state = 'idle';
    this.notify();
  }
}

export const castService = new CastService();

/**
 * React Hook for real-time Cast state
 */
import { useState, useEffect } from 'react';

export function useCastState(): CastState {
  const [castState, setCastState] = useState<CastState>(() => castService.getState());

  useEffect(() => {
    return castService.subscribe((newState) => {
      setCastState(newState);
    });
  }, []);

  return castState;
}
