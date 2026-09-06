import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSpotlight } from './components/HeroSpotlight';
import { ContinueWatching } from './components/ContinueWatching';
import { MovieRow } from './components/MovieRow';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { StreamServerSelectorModal } from './components/StreamServerSelectorModal';
import { BottomNav } from './components/BottomNav';
import { WatchlistView } from './components/WatchlistView';
import { ExploreView } from './components/ExploreView';
import { ProfileView } from './components/ProfileView';
import { FALLBACK_MOVIES } from './data/movies';
import {
  fetchSpotlightMovies,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchAnimeMovies,
  fetchSciFiMovies,
  fetchActionMovies,
  fetchThrillersMovies,
  searchMovies,
} from './services/movieApi';
import { Movie, CategoryFilter, NavTab, ExpansionOrigin, StreamItem } from './types';
import { Search, Star, Loader2, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { getPosterUrl } from './utils/imageHelpers';
import { getValid6HourCache, save6HourCache } from './services/movieCache';
import {
  getIndexedDbWatchlist,
  saveIndexedDbWatchlist,
  saveIndexedDbHistoryItem,
  getIndexedDbHistory,
  HistoryItem,
} from './services/indexedDb';
import { scrobbleToTrakt } from './services/traktApi';
import {
  UiThemeConfig,
  DEFAULT_THEME_CONFIG,
  loadSavedThemeConfig,
  saveThemeConfig,
  applyThemeToDocument,
} from './services/themeStore';
import {
  initGoogleAnalytics,
  trackPageView,
  trackSearchQuery,
  trackMediaView,
  trackStreamStart,
  trackWatchlistAction,
  trackThemeSelection,
} from './services/analytics';
import { forceUnlockScroll } from './utils/scrollLock';

export default function App() {
  const [cachedData] = useState(() => getValid6HourCache());

  const [spotlightMovies, setSpotlightMovies] = useState<Movie[]>(
    () =>
      cachedData?.spotlightMovies ||
      FALLBACK_MOVIES.filter((m) => m.spotlight || m.featured)
  );
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>(
    () => cachedData?.trendingMovies || FALLBACK_MOVIES
  );
  const [animeMovies, setAnimeMovies] = useState<Movie[]>(
    () =>
      cachedData?.animeMovies ||
      FALLBACK_MOVIES.filter(
        (m) =>
          m.genres.includes('Animation') ||
          m.badge?.toLowerCase().includes('anime') ||
          m.badge?.toLowerCase().includes('ghibli')
      )
  );
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>(
    () => cachedData?.topRatedMovies || FALLBACK_MOVIES.slice(1)
  );
  const [scifiMovies, setScifiMovies] = useState<Movie[]>(
    () =>
      cachedData?.scifiMovies ||
      FALLBACK_MOVIES.filter((m) => m.genres.includes('Sci-Fi'))
  );
  const [actionMovies, setActionMovies] = useState<Movie[]>(
    () =>
      cachedData?.actionMovies ||
      FALLBACK_MOVIES.filter((m) => m.genres.includes('Action'))
  );
  const [thrillerMovies, setThrillerMovies] = useState<Movie[]>(
    () =>
      cachedData?.thrillerMovies ||
      FALLBACK_MOVIES.filter(
        (m) => m.genres.includes('Thriller') || m.genres.includes('Drama')
      )
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [expansionOrigin, setExpansionOrigin] = useState<ExpansionOrigin | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [playingEpisodeIndex, setPlayingEpisodeIndex] = useState<number>(0);
  const [autoPlayDetails, setAutoPlayDetails] = useState(false);
  const [serverSelectorMovie, setServerSelectorMovie] = useState<Movie | null>(null);
  const [serverSelectorEpisodeIndex, setServerSelectorEpisodeIndex] = useState<number>(0);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);

  // Dynamic UI Theme & Background State
  const [themeConfig, setThemeConfig] = useState<UiThemeConfig>(DEFAULT_THEME_CONFIG);

  useEffect(() => {
    let isMounted = true;
    initGoogleAnalytics();
    loadSavedThemeConfig().then((cfg) => {
      if (isMounted) {
        setThemeConfig(cfg);
        applyThemeToDocument(cfg);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Track page navigation (Home, Explore, Watchlist, Profile)
  useEffect(() => {
    const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    trackPageView(`Refra - ${tabName}`, `/${activeTab === 'home' ? '' : activeTab}`);
  }, [activeTab]);

  // Guarantee page scrolling is never locked when all modals are closed
  useEffect(() => {
    if (!selectedMovie && !playingMovie && !serverSelectorMovie) {
      forceUnlockScroll();
    }
  }, [selectedMovie, playingMovie, serverSelectorMovie]);

  const handleThemeChange = (newConfig: UiThemeConfig) => {
    setThemeConfig(newConfig);
    saveThemeConfig(newConfig);
    trackThemeSelection(newConfig.selectedPaletteId || 'neutral', newConfig.bgMode);
  };

  // Watchlist state with IndexedDB & localStorage persistence
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('refra_watchlist') || localStorage.getItem('luma_watchlist');
      return saved ? JSON.parse(saved) : ['tmdb_693134', 'tmdb_335984'];
    } catch {
      return ['tmdb_693134', 'tmdb_335984'];
    }
  });

  // Persistent watch history state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Load history from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    getIndexedDbHistory().then((items) => {
      if (isMounted && items && items.length > 0) {
        setHistoryItems(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load watchlist from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    getIndexedDbWatchlist().then((list) => {
      if (isMounted && list && list.length > 0) {
        setWatchlist(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('refra_watchlist', JSON.stringify(watchlist));
      saveIndexedDbWatchlist(watchlist);
    } catch {
      // ignore
    }
  }, [watchlist]);

  // Load dynamic data from TMDB / OMDB / Fanart APIs
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // If valid 6-hour cache is already loaded, skip redundant API fetch & heavy JSON compute
      if (cachedData && cachedData.trendingMovies && cachedData.trendingMovies.length > 0) {
        return;
      }

      try {
        const [spotlights, trending, anime, topRated, scifi, action, thrillers] = await Promise.all([
          fetchSpotlightMovies(),
          fetchTrendingMovies(),
          fetchAnimeMovies(),
          fetchTopRatedMovies(),
          fetchSciFiMovies(),
          fetchActionMovies(),
          fetchThrillersMovies(),
        ]);

        if (isMounted) {
          const finalSpotlights =
            spotlights.length > 0
              ? spotlights
              : cachedData?.spotlightMovies ||
                FALLBACK_MOVIES.filter((m) => m.spotlight || m.featured);
          const finalTrending =
            trending.length > 0
              ? trending
              : cachedData?.trendingMovies || FALLBACK_MOVIES;
          const finalAnime =
            anime.length > 0
              ? anime
              : cachedData?.animeMovies ||
                FALLBACK_MOVIES.filter((m) => m.genres.includes('Animation'));
          const finalTopRated =
            topRated.length > 0
              ? topRated
              : cachedData?.topRatedMovies || FALLBACK_MOVIES.slice(1);
          const finalScifi =
            scifi.length > 0
              ? scifi
              : cachedData?.scifiMovies ||
                FALLBACK_MOVIES.filter((m) => m.genres.includes('Sci-Fi'));
          const finalAction =
            action.length > 0
              ? action
              : cachedData?.actionMovies ||
                FALLBACK_MOVIES.filter((m) => m.genres.includes('Action'));
          const finalThrillers =
            thrillers.length > 0
              ? thrillers
              : cachedData?.thrillerMovies ||
                FALLBACK_MOVIES.filter(
                  (m) => m.genres.includes('Thriller') || m.genres.includes('Drama')
                );

          setSpotlightMovies(finalSpotlights);
          setTrendingMovies(finalTrending);
          setAnimeMovies(finalAnime);
          setTopRatedMovies(finalTopRated);
          setScifiMovies(finalScifi);
          setActionMovies(finalAction);
          setThrillerMovies(finalThrillers);

          // Save to 6-hour cache with image preloading
          save6HourCache({
            spotlightMovies: finalSpotlights,
            trendingMovies: finalTrending,
            animeMovies: finalAnime,
            topRatedMovies: finalTopRated,
            scifiMovies: finalScifi,
            actionMovies: finalAction,
            thrillerMovies: finalThrillers,
          });
        }
      } catch (err) {
        console.warn('API fetch notice:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle shared link with ?movie=<id> to automatically open movie info and autoplay trailer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sharedMovieId = params.get('movie') || params.get('id');
    if (!sharedMovieId) return;

    const allCurrentMovies = [
      ...spotlightMovies,
      ...trendingMovies,
      ...animeMovies,
      ...topRatedMovies,
      ...scifiMovies,
      ...actionMovies,
      ...thrillerMovies,
      ...FALLBACK_MOVIES,
    ];

    const match = allCurrentMovies.find(
      (m) => m.id === sharedMovieId || m.id === `tmdb_${sharedMovieId}`
    );
    if (match) {
      setSelectedMovie(match);
      setAutoPlayDetails(true);
    }
  }, [
    spotlightMovies,
    trendingMovies,
    animeMovies,
    topRatedMovies,
    scifiMovies,
    actionMovies,
    thrillerMovies,
  ]);

  // Handle live search
  useEffect(() => {
    let isMounted = true;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchMovies(searchQuery);
        if (isMounted) {
          setSearchResults(results);
          setIsSearching(false);
          trackSearchQuery(searchQuery, results.length);
        }
      } catch {
        if (isMounted) setIsSearching(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  // Combine all movies for unified lookup
  const allMoviesMap = useMemo(() => {
    const map = new Map<string, Movie>();
    [
      ...spotlightMovies,
      ...trendingMovies,
      ...animeMovies,
      ...topRatedMovies,
      ...scifiMovies,
      ...actionMovies,
      ...thrillerMovies,
      ...FALLBACK_MOVIES,
    ].forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return map;
  }, [
    spotlightMovies,
    trendingMovies,
    animeMovies,
    topRatedMovies,
    scifiMovies,
    actionMovies,
    thrillerMovies,
  ]);

  // Unified Continue Watching queue dynamically synced with persistent IndexedDB history
  const continueWatchingMovies = useMemo(() => {
    const list: Movie[] = [];
    historyItems.forEach((hist) => {
      const existing = allMoviesMap.get(hist.movieId);
      if (existing) {
        list.push({
          ...existing,
          progress: {
            percentage: hist.progressPercent || 35,
            timeLeft: hist.durationString || '24m left',
            lastWatched: 'Recently',
          },
        });
      } else {
        list.push({
          id: hist.movieId,
          title: hist.title,
          tagline: '',
          certification: 'PG-13',
          releaseYear: 2024,
          duration: hist.durationString || '2h 10m',
          score: '8.8',
          genres: ['Sci-Fi', 'Drama'],
          synopsis: `Continue watching ${hist.title}.`,
          director: 'Refra Cinema',
          cast: [],
          posterUrl: hist.posterUrl || '',
          backdropUrl: hist.backdropUrl || hist.posterUrl || '',
          resolution: '4K UHD',
          audioFormat: 'Dolby Atmos',
          progress: {
            percentage: hist.progressPercent || 35,
            timeLeft: hist.durationString || '24m left',
            lastWatched: 'Recently',
          },
        });
      }
    });

    // If history is empty on initial install, curate top premiere titles with progress so section is immediately populated
    if (list.length === 0) {
      const candidates = (trendingMovies.length > 0 ? trendingMovies : FALLBACK_MOVIES).slice(0, 3);
      return candidates.map((m, idx) => ({
        ...m,
        progress: {
          percentage: idx === 0 ? 68 : idx === 1 ? 42 : 85,
          timeLeft: idx === 0 ? '45m left' : idx === 1 ? '1h 12m left' : '18m left',
          lastWatched: idx === 0 ? 'Yesterday' : '2 days ago',
        },
      }));
    }

    return list;
  }, [historyItems, allMoviesMap, trendingMovies]);

  const toggleWatchlist = (movieId: string) => {
    const isAdding = !watchlist.includes(movieId);
    const movieItem = allMoviesMap.get(movieId);
    setWatchlist((prev) =>
      prev.includes(movieId)
        ? prev.filter((id) => id !== movieId)
        : [...prev, movieId]
    );
    trackWatchlistAction(movieId, movieItem?.title || movieId, isAdding ? 'add' : 'remove');
  };

  const handlePlayMovie = (movie: Movie, episodeIndex: number = 0) => {
    // Open the dedicated streaming page directly, which auto-selects the best stream with a toast
    setSelectedMovie(null);
    setServerSelectorMovie(null);
    setSelectedStream(null);
    setPlayingEpisodeIndex(episodeIndex);
    setPlayingMovie(movie);
  };

  const handleStreamSelect = (stream: StreamItem, episodeIdx?: number) => {
    const movieToPlay = serverSelectorMovie || selectedMovie;
    setSelectedMovie(null);
    setServerSelectorMovie(null);
    setSelectedStream(stream);

    if (movieToPlay) {
      // Record into IndexedDB history
      saveIndexedDbHistoryItem({
        id: `hist_${movieToPlay.id}`,
        movieId: movieToPlay.id,
        title: movieToPlay.title,
        posterUrl: movieToPlay.posterUrl,
        backdropUrl: movieToPlay.backdropUrl,
        progressPercent: movieToPlay.progress?.percentage || 5,
        durationString: movieToPlay.duration,
        lastWatchedTimestamp: Date.now(),
      });

      // Scrobble to Trakt if connected
      scrobbleToTrakt(movieToPlay.title, movieToPlay.progress?.percentage || 5, 'start');

      trackStreamStart({
        id: movieToPlay.id,
        title: movieToPlay.title,
        sourceServer: stream.serverName,
        isAnime: movieToPlay.genres.includes('Animation') || movieToPlay.badge?.toLowerCase().includes('anime'),
      });

      setPlayingMovie(movieToPlay);
    }
    setServerSelectorMovie(null);
  };

  const handleStreamProgressUpdate = (movieId: string, progressPercent: number, timeLeft: string) => {
    const movie = allMoviesMap.get(movieId) || playingMovie;
    if (movie) {
      const updatedItem: HistoryItem = {
        id: `hist_${movieId}`,
        movieId,
        title: movie.title,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        progressPercent,
        durationString: timeLeft,
        lastWatchedTimestamp: Date.now(),
      };
      saveIndexedDbHistoryItem(updatedItem);
      setHistoryItems((prev) => {
        const filtered = prev.filter((h) => h.movieId !== movieId);
        return [updatedItem, ...filtered];
      });
    }

    const updater = (prevList: Movie[]) =>
      prevList.map((m) =>
        m.id === movieId
          ? {
              ...m,
              progress: {
                percentage: progressPercent,
                timeLeft,
                lastWatched: 'Just now',
              },
            }
          : m
      );

    setSpotlightMovies(updater);
    setTrendingMovies(updater);
    setAnimeMovies(updater);
    setTopRatedMovies(updater);
    setScifiMovies(updater);
    setActionMovies(updater);
    setThrillerMovies(updater);
  };

  const handleOpenDetails = (movie: Movie, origin?: DOMRect | ExpansionOrigin) => {
    trackMediaView({
      id: movie.id,
      title: movie.title,
      genres: movie.genres,
      score: movie.score,
      releaseYear: movie.releaseYear,
    });
    setAutoPlayDetails(false);
    if (origin) {
      if ('left' in origin && 'top' in origin) {
        setExpansionOrigin({
          x: origin.left + origin.width / 2,
          y: origin.top + origin.height / 2,
          width: origin.width,
          height: origin.height,
          top: origin.top,
          left: origin.left,
        });
      } else {
        const exp = origin as ExpansionOrigin;
        setExpansionOrigin({
          ...exp,
          top: exp.top ?? (exp.y - exp.height / 2),
          left: exp.left ?? (exp.x - exp.width / 2),
        });
      }
    } else {
      setExpansionOrigin(null);
    }
    setSelectedMovie(movie);
  };

  const watchlistMovies = useMemo(() => {
    return watchlist
      .map((id) => allMoviesMap.get(id))
      .filter((m): m is Movie => Boolean(m));
  }, [watchlist, allMoviesMap]);

  const isCustomImageActive = themeConfig.bgMode === 'image' && Boolean(themeConfig.customBgImage);
  const activeBgColor = isCustomImageActive ? '#060606' : (themeConfig.selectedBgColor || '#0c0d10');

  return (
    <div
      className="min-h-screen text-[#f0f2f5] flex justify-center antialiased selection:bg-neutral-800 selection:text-white relative"
      style={{ backgroundColor: activeBgColor }}
    >
      {/* Dynamic Device Wallpaper Layer (when enabled) */}
      {isCustomImageActive && themeConfig.customBgImage && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{
              backgroundImage: `url(${themeConfig.customBgImage})`,
              filter: `blur(${themeConfig.bgBlur || 0}px)`,
              transform: (themeConfig.bgBlur || 0) > 0 ? 'scale(1.06)' : 'scale(1)',
              willChange: 'filter, transform',
            }}
          />
          {/* Dimming Scrim for Readability */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${(themeConfig.bgOverlayDim ?? 40) / 100})`,
            }}
          />
        </div>
      )}

      {/* Universal Screen Container: Fluid on Mobile, Expansive on PC/Tablet */}
      <main
        id="refra-app-root"
        className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative flex flex-col min-h-screen z-10"
        style={{
          backgroundColor: isCustomImageActive ? 'transparent' : activeBgColor,
        }}
      >
        {/* Floating Combined Action Pill (Notification + Cast) - only appears in homepage */}
        {activeTab === 'home' && <Navbar />}

        {/* Tab View Content */}
        <div className="flex-1 pb-28 pt-1">
          {/* Home Tab View: Kept mounted in background to ensure 0ms instant tab switching with zero lag */}
          <div className={activeTab === 'home' ? 'block' : 'hidden'}>
            {/* Hero Premiere Spotlight Carousel (3s art cycle, 15s movie switch, swipe gestures) */}
            {spotlightMovies.length > 0 && (
              <HeroSpotlight
                movies={spotlightMovies}
                onPlay={handlePlayMovie}
                onOpenDetails={handleOpenDetails}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                isActive={activeTab === 'home'}
              />
            )}

            {/* Continue Watching Section - Connected to persistent watch history */}
            <ContinueWatching
              movies={continueWatchingMovies}
              onResume={handlePlayMovie}
              onOpenDetails={handleOpenDetails}
            />

            {/* 1st Divider: Trending Masterworks */}
            <MovieRow
              title="Trending Masterworks"
              movies={trendingMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 2nd Divider: Trending Anime */}
            <MovieRow
              title="Trending Anime"
              movies={animeMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 3rd Divider: Top Rated Cinema */}
            <MovieRow
              title="Top Rated Cinema"
              movies={topRatedMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 4th Divider: Sci-Fi & Speculative Fiction */}
            <MovieRow
              title="Sci-Fi & Speculative Fiction"
              movies={scifiMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 5th Divider: Action & Adrenaline */}
            <MovieRow
              title="Action & Adrenaline"
              movies={actionMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 6th Divider: Psychological Thrillers */}
            <MovieRow
              title="Psychological Thrillers"
              movies={thrillerMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />
          </div>

          {activeTab === 'explore' && (
            <ExploreView
              movies={trendingMovies}
              onSelectMovie={handleOpenDetails}
              onSelectCategory={(cat) => {
                setSearchQuery(cat);
                setActiveTab('search');
              }}
            />
          )}

          {activeTab === 'search' && (
            <div className="px-4 py-3 space-y-4">
              <div className="flex items-center gap-2.5 bg-[#14161f] rounded-full px-4 py-3 border border-white/5">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search titles, directors, actors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
                />
              </div>

              {!searchQuery && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Popular Searches
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Dune', 'Oppenheimer', 'Blade Runner', 'Interstellar', 'The Batman', 'Sci-Fi'].map(
                      (term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSearchQuery(term)}
                          className="px-3 py-1.5 rounded-full text-xs liquid-glass text-neutral-300 hover:text-white transition-colors"
                        >
                          {term}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Live search results: Direct Canvas Overlays */}
              {searchQuery && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Search results for "{searchQuery}"</span>
                    {isSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                    ) : (
                      <span>{searchResults.length} found</span>
                    )}
                  </div>

                  {searchResults.length === 0 && !isSearching ? (
                    <div className="py-12 text-center text-sm text-neutral-400">
                      No movies found matching "{searchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {searchResults.map((movie) => {
                        const isSaved = watchlist.includes(movie.id);
                        return (
                          <motion.div
                            key={movie.id}
                            whileTap={{ scale: 0.94 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.7 }}
                            onClick={(e) => handleOpenDetails(movie, e.currentTarget.getBoundingClientRect())}
                            className="aspect-[2/3] rounded-2xl overflow-hidden bg-[#14161e] relative group cursor-pointer shadow-lg gpu-layer will-change-transform"
                          >
                            <img
                              src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                              alt={movie.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                            />

                            {/* Canvas gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

                            {/* Top bookmark button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(movie.id);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full liquid-glass text-white hover:bg-white/20 shadow-md transition-colors z-10"
                              aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
                            >
                              {isSaved ? (
                                <Check className="w-3.5 h-3.5 text-neutral-200" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Text directly on canvas (No separate nested black box) */}
                            <div className="absolute inset-x-0 bottom-0 p-2.5 z-10 flex flex-col gap-0.5 pointer-events-none">
                              <h4 className="text-xs font-semibold text-white truncate leading-tight drop-shadow-sm">
                                {movie.title}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 mt-0.5">
                                <span className="flex items-center gap-1 font-medium text-white">
                                  <Star className="w-2.5 h-2.5 fill-white text-white" />
                                  {movie.score}
                                </span>
                                <span className="text-neutral-500">•</span>
                                <span className="text-neutral-300 font-light">{movie.releaseYear}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'watchlist' && (
            <WatchlistView
              watchlistMovies={watchlistMovies}
              onMovieClick={handleOpenDetails}
              onRemove={toggleWatchlist}
              onBackToHome={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              onWatchlistUpdated={(newIds) => setWatchlist(newIds)}
              themeConfig={themeConfig}
              onThemeChanged={handleThemeChange}
            />
          )}
        </div>

        {/* Floating Bottom Liquid Glass Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === activeTab) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveTab(tab);
              window.scrollTo(0, 0);
            }
          }}
          watchlistCount={watchlist.length}
        />

        {/* Liquid Organic Movie Details Sheet */}
        <MovieDetailsModal
          movie={selectedMovie}
          expansionOrigin={expansionOrigin}
          onClose={() => setSelectedMovie(null)}
          watchlist={watchlist}
          onToggleWatchlist={toggleWatchlist}
          autoPlay={autoPlayDetails}
          onPlayMovie={handlePlayMovie}
        />

        {/* Stremio Addons Server Hub (PenguPlay, Torrentio, Comet, AIOStreams, Nuvio) */}
        <StreamServerSelectorModal
          movie={serverSelectorMovie}
          isOpen={Boolean(serverSelectorMovie)}
          onClose={() => setServerSelectorMovie(null)}
          onSelectStream={handleStreamSelect}
          episodeIndex={serverSelectorEpisodeIndex}
          expansionOrigin={expansionOrigin}
        />

        {/* Full Cinematic Video Player & Floating Liquid Glass PiP */}
        <VideoPlayerModal
          movie={playingMovie}
          isOpen={Boolean(playingMovie)}
          onClose={() => {
            setPlayingMovie(null);
            setSelectedStream(null);
          }}
          onProgressUpdate={handleStreamProgressUpdate}
          selectedStream={selectedStream}
          initialEpisodeIndex={playingEpisodeIndex}
          onOpenServerSelector={() => {
            if (playingMovie) {
              setServerSelectorMovie(playingMovie);
            }
          }}
        />
      </main>
    </div>
  );
}
