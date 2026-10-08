import { useEffect, useRef, useCallback } from 'react';
import { NavTab, Movie } from '../types';

interface PredictiveBackOptions {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedMovie: Movie | null;
  setSelectedMovie: (movie: Movie | null) => void;
  playingMovie: Movie | null;
  setPlayingMovie: (movie: Movie | null) => void;
  serverSelectorMovie: Movie | null;
  setServerSelectorMovie: (movie: Movie | null) => void;
  isCastOpen: boolean;
  setIsCastOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isPrivacyOpen: boolean;
  setIsPrivacyOpen: (open: boolean) => void;
  isTermsOpen: boolean;
  setIsTermsOpen: (open: boolean) => void;
  isContactOpen: boolean;
  setIsContactOpen: (open: boolean) => void;
  is404Active: boolean;
  setIs404Active: (active: boolean) => void;
  isThankYouOpen: boolean;
  setThankYouOpen: (open: boolean) => void;
  categoryModalData?: any;
  setCategoryModalData?: (data: any) => void;
}

export function usePredictiveBack({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedMovie,
  setSelectedMovie,
  playingMovie,
  setPlayingMovie,
  serverSelectorMovie,
  setServerSelectorMovie,
  isCastOpen,
  setIsCastOpen,
  isNotificationsOpen,
  setIsNotificationsOpen,
  isPrivacyOpen,
  setIsPrivacyOpen,
  isTermsOpen,
  setIsTermsOpen,
  isContactOpen,
  setIsContactOpen,
  is404Active,
  setIs404Active,
  isThankYouOpen,
  setThankYouOpen,
  categoryModalData,
  setCategoryModalData,
}: PredictiveBackOptions) {
  const historyStackDepth = useRef<number>(0);
  const ignoreNextPopstate = useRef<boolean>(false);

  // Latest state references so popstate listener always has fresh closures
  const stateRef = useRef({
    activeTab,
    searchQuery,
    selectedMovie,
    playingMovie,
    serverSelectorMovie,
    isCastOpen,
    isNotificationsOpen,
    isPrivacyOpen,
    isTermsOpen,
    isContactOpen,
    is404Active,
    isThankYouOpen,
    categoryModalData,
  });

  useEffect(() => {
    stateRef.current = {
      activeTab,
      searchQuery,
      selectedMovie,
      playingMovie,
      serverSelectorMovie,
      isCastOpen,
      isNotificationsOpen,
      isPrivacyOpen,
      isTermsOpen,
      isContactOpen,
      is404Active,
      isThankYouOpen,
      categoryModalData,
    };
  }, [
    activeTab,
    searchQuery,
    selectedMovie,
    playingMovie,
    serverSelectorMovie,
    isCastOpen,
    isNotificationsOpen,
    isPrivacyOpen,
    isTermsOpen,
    isContactOpen,
    is404Active,
    isThankYouOpen,
    categoryModalData,
  ]);

  // Push new history state when going deeper into the app
  const pushStep = useCallback((layerName: string) => {
    if (typeof window === 'undefined') return;
    historyStackDepth.current += 1;
    window.history.pushState({ refraLayer: layerName, depth: historyStackDepth.current }, '');
  }, []);

  // Pop history silently when user manually closes via UI button
  const popSilently = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (historyStackDepth.current > 0) {
      ignoreNextPopstate.current = true;
      historyStackDepth.current = Math.max(0, historyStackDepth.current - 1);
      try {
        window.history.back();
      } catch {}
    }
  }, []);

  // Track previous opened states to trigger pushStep on transition to open
  const prevStates = useRef({
    serverSelector: Boolean(serverSelectorMovie),
    player: Boolean(playingMovie),
    details: Boolean(selectedMovie),
    cast: isCastOpen,
    notifications: isNotificationsOpen,
    privacy: isPrivacyOpen,
    terms: isTermsOpen,
    contact: isContactOpen,
    thankYou: isThankYouOpen,
    not404: is404Active,
    tab: activeTab,
  });

  useEffect(() => {
    const prev = prevStates.current;

    // Check server selector
    if (!prev.serverSelector && serverSelectorMovie) {
      pushStep('serverSelector');
    }
    // Check player
    if (!prev.player && playingMovie) {
      pushStep('player');
    }
    // Check details
    if (!prev.details && selectedMovie) {
      pushStep('details');
    }
    // Check cast
    if (!prev.cast && isCastOpen) {
      pushStep('cast');
    }
    // Check notifications
    if (!prev.notifications && isNotificationsOpen) {
      pushStep('notifications');
    }
    // Check modals
    if (!prev.privacy && isPrivacyOpen) pushStep('privacy');
    if (!prev.terms && isTermsOpen) pushStep('terms');
    if (!prev.contact && isContactOpen) pushStep('contact');
    if (!prev.thankYou && isThankYouOpen) pushStep('thankYou');
    if (!prev.not404 && is404Active) pushStep('404');
    if (!prev.categoryModal && categoryModalData) pushStep('categoryModal');

    // Check tab switch away from home
    if (prev.tab === 'home' && activeTab !== 'home') {
      pushStep(`tab_${activeTab}`);
    }

    prevStates.current = {
      serverSelector: Boolean(serverSelectorMovie),
      player: Boolean(playingMovie),
      details: Boolean(selectedMovie),
      cast: isCastOpen,
      notifications: isNotificationsOpen,
      privacy: isPrivacyOpen,
      terms: isTermsOpen,
      contact: isContactOpen,
      thankYou: isThankYouOpen,
      not404: is404Active,
      categoryModal: Boolean(categoryModalData),
      tab: activeTab,
    };
  }, [
    serverSelectorMovie,
    playingMovie,
    selectedMovie,
    isCastOpen,
    isNotificationsOpen,
    isPrivacyOpen,
    isTermsOpen,
    isContactOpen,
    isThankYouOpen,
    is404Active,
    categoryModalData,
    activeTab,
    pushStep,
  ]);

  // Main popstate listener for predictive back gestures and hardware back button
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize root state if not already set
    if (!window.history.state || !window.history.state.refraLayer) {
      window.history.replaceState({ refraLayer: 'root', depth: 0 }, '');
    }

    const handlePopState = () => {
      if (ignoreNextPopstate.current) {
        ignoreNextPopstate.current = false;
        return;
      }

      historyStackDepth.current = Math.max(0, historyStackDepth.current - 1);
      const current = stateRef.current;

      // Sequential close hierarchy (one step at a time)
      if (current.serverSelectorMovie) {
        setServerSelectorMovie(null);
        return;
      }

      if (current.isNotificationsOpen) {
        setIsNotificationsOpen(false);
        return;
      }

      if (current.isCastOpen) {
        setIsCastOpen(false);
        return;
      }

      if (current.isThankYouOpen) {
        setThankYouOpen(false);
        return;
      }

      if (current.isPrivacyOpen || current.isTermsOpen || current.isContactOpen) {
        setIsPrivacyOpen(false);
        setIsTermsOpen(false);
        setIsContactOpen(false);
        return;
      }

      if (current.playingMovie) {
        setPlayingMovie(null);
        return;
      }

      if (current.selectedMovie) {
        setSelectedMovie(null);
        return;
      }

      if (current.categoryModalData && setCategoryModalData) {
        setCategoryModalData(null);
        return;
      }

      if (current.is404Active) {
        setIs404Active(false);
        return;
      }

      if (current.activeTab !== 'home') {
        setActiveTab('home');
        setSearchQuery('');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    setActiveTab,
    setSearchQuery,
    setSelectedMovie,
    setPlayingMovie,
    setServerSelectorMovie,
    setIsCastOpen,
    setIsNotificationsOpen,
    setIsPrivacyOpen,
    setIsTermsOpen,
    setIsContactOpen,
    setIs404Active,
    setThankYouOpen,
    setCategoryModalData,
  ]);

  return {
    popSilently,
  };
}
