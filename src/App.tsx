import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSpotlight } from './components/HeroSpotlight';
import { ContinueWatching } from './components/ContinueWatching';
import { MovieRow } from './components/MovieRow';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { StreamServerSelectorModal } from './components/StreamServerSelectorModal';
import { CastModal, CastDevice } from './components/CastModal';
import { NotificationsModal } from './components/NotificationsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BottomNav } from './components/BottomNav';
import { WatchlistView } from './components/WatchlistView';
import { ExploreView } from './components/ExploreView';
import { ProfileView } from './components/ProfileView';
import { SearchView } from './components/SearchView';
import { PWAStartSplash } from './components/PWAStartSplash';
import { FALLBACK_MOVIES } from './data/movies';
import {
  fetchSpotlightMovies,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchAnimeMovies,
  fetchSciFiMovies,
  fetchActionMovies,
  fetchThrillersMovies,
  fetchIndiaTrending,
  fetchBollywoodMovies,
  fetchSouthIndianMovies,
  fetchIndianSeries,
  searchMovies,
  clearMovieApiCache,
} from './services/movieApi';
import { getUserRegionInfo, getUserRegion } from './services/regionStore';
import { Movie, CategoryFilter, NavTab, ExpansionOrigin, StreamItem } from './types';
import { Search, Star, Loader2, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { getPosterUrl } from './utils/imageHelpers';
import {
  getValid6HourCache,
  save6HourCache,
  areMovieListsDifferent,
  getIndexedDbCachedCatalog,
} from './services/movieCache';
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

  const [userRegion, setUserRegionState] = useState<string>(() => getUserRegion() || 'US');
  const [indiaTrending, setIndiaTrending] = useState<Movie[]>(() => cachedData?.indiaTrending || []);
  const [bollywoodMovies, setBollywoodMovies] = useState<Movie[]>(() => cachedData?.bollywoodMovies || []);
  const [southMovies, setSouthMovies] = useState<Movie[]>(() => cachedData?.southMovies || []);
  const [indiaSeries, setIndiaSeries] = useState<Movie[]>(() => cachedData?.indiaSeries || []);

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

  // Cast & Notifications modal state
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCastConnected, setIsCastConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<CastDevice | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(3);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);

  // Dynamic UI Theme & Background State
  const [themeConfig, setThemeConfig] = useState<UiThemeConfig>(DEFAULT_THEME_CONFIG);
  const [searchThemeColor, setSearchThemeColor] = useState<string | null>(null);

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
    if (!selectedMovie && !playingMovie && !serverSelectorMovie && !isCastOpen && !isNotificationsOpen) {
      forceUnlockScroll();
    }
  }, [selectedMovie, playingMovie, serverSelectorMovie, isCastOpen, isNotificationsOpen]);

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

  // Load dynamic data from TMDB / OMDB / Fanart APIs with offline-first background update
  useEffect(() => {
    let isMounted = true;

    // Asynchronously restore from IndexedDB if localStorage cache was absent
    if (!cachedData) {
      getIndexedDbCachedCatalog().then((dbCatalog) => {
        if (!isMounted || !dbCatalog) return;
        if (dbCatalog.spotlightMovies?.length) setSpotlightMovies(dbCatalog.spotlightMovies);
        if (dbCatalog.trendingMovies?.length) setTrendingMovies(dbCatalog.trendingMovies);
        if (dbCatalog.animeMovies?.length) setAnimeMovies(dbCatalog.animeMovies);
        if (dbCatalog.topRatedMovies?.length) setTopRatedMovies(dbCatalog.topRatedMovies);
        if (dbCatalog.scifiMovies?.length) setScifiMovies(dbCatalog.scifiMovies);
        if (dbCatalog.actionMovies?.length) setActionMovies(dbCatalog.actionMovies);
        if (dbCatalog.thrillerMovies?.length) setThrillerMovies(dbCatalog.thrillerMovies);
        if (dbCatalog.indiaTrending?.length) setIndiaTrending(dbCatalog.indiaTrending);
        if (dbCatalog.bollywoodMovies?.length) setBollywoodMovies(dbCatalog.bollywoodMovies);
        if (dbCatalog.southMovies?.length) setSouthMovies(dbCatalog.southMovies);
        if (dbCatalog.indiaSeries?.length) setIndiaSeries(dbCatalog.indiaSeries);
      });
    }

    async function loadData() {
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
          let hasChanges = false;

          setSpotlightMovies((prev) => {
            if (spotlights.length > 0 && areMovieListsDifferent(prev, spotlights)) {
              hasChanges = true;
              return spotlights;
            }
            return prev;
          });

          setTrendingMovies((prev) => {
            if (trending.length > 0 && areMovieListsDifferent(prev, trending)) {
              hasChanges = true;
              return trending;
            }
            return prev;
          });

          setAnimeMovies((prev) => {
            if (anime.length > 0 && areMovieListsDifferent(prev, anime)) {
              hasChanges = true;
              return anime;
            }
            return prev;
          });

          setTopRatedMovies((prev) => {
            if (topRated.length > 0 && areMovieListsDifferent(prev, topRated)) {
              hasChanges = true;
              return topRated;
            }
            return prev;
          });

          setScifiMovies((prev) => {
            if (scifi.length > 0 && areMovieListsDifferent(prev, scifi)) {
              hasChanges = true;
              return scifi;
            }
            return prev;
          });

          setActionMovies((prev) => {
            if (action.length > 0 && areMovieListsDifferent(prev, action)) {
              hasChanges = true;
              return action;
            }
            return prev;
          });

          setThrillerMovies((prev) => {
            if (thrillers.length > 0 && areMovieListsDifferent(prev, thrillers)) {
              hasChanges = true;
              return thrillers;
            }
            return prev;
          });

          // Save to 6-hour cache (IndexedDB + localStorage) if new items arrived
          if (hasChanges || !cachedData) {
            save6HourCache({
              spotlightMovies: spotlights.length > 0 ? spotlights : spotlightMovies,
              trendingMovies: trending.length > 0 ? trending : trendingMovies,
              animeMovies: anime.length > 0 ? anime : animeMovies,
              topRatedMovies: topRated.length > 0 ? topRated : topRatedMovies,
              scifiMovies: scifi.length > 0 ? scifi : scifiMovies,
              actionMovies: action.length > 0 ? action : actionMovies,
              thrillerMovies: thrillers.length > 0 ? thrillers : thrillerMovies,
              indiaTrending,
              bollywoodMovies,
              southMovies,
              indiaSeries,
            });
          }
        }
      } catch (err) {
        console.warn('API fetch notice:', err);
      }
    }

    const loadIndiaData = async () => {
      try {
        const [inTrend, inBolly, inSouth, inTv] = await Promise.all([
          fetchIndiaTrending(),
          fetchBollywoodMovies(),
          fetchSouthIndianMovies(),
          fetchIndianSeries(),
        ]);
        if (isMounted) {
          let hasIndiaChanges = false;
          if (inTrend?.length > 0 && areMovieListsDifferent(indiaTrending, inTrend)) {
            setIndiaTrending(inTrend);
            hasIndiaChanges = true;
          }
          if (inBolly?.length > 0 && areMovieListsDifferent(bollywoodMovies, inBolly)) {
            setBollywoodMovies(inBolly);
            hasIndiaChanges = true;
          }
          if (inSouth?.length > 0 && areMovieListsDifferent(southMovies, inSouth)) {
            setSouthMovies(inSouth);
            hasIndiaChanges = true;
          }
          if (inTv?.length > 0 && areMovieListsDifferent(indiaSeries, inTv)) {
            setIndiaSeries(inTv);
            hasIndiaChanges = true;
          }

          if (hasIndiaChanges) {
            save6HourCache({
              spotlightMovies,
              trendingMovies,
              animeMovies,
              topRatedMovies,
              scifiMovies,
              actionMovies,
              thrillerMovies,
              indiaTrending: inTrend?.length > 0 ? inTrend : indiaTrending,
              bollywoodMovies: inBolly?.length > 0 ? inBolly : bollywoodMovies,
              southMovies: inSouth?.length > 0 ? inSouth : southMovies,
              indiaSeries: inTv?.length > 0 ? inTv : indiaSeries,
            });
          }
        }
      } catch (err) {
        console.warn('India feed fetch notice:', err);
      }
    };

    // Initialize auto-detected region and save if not already set
    const currentRegionInfo = getUserRegionInfo();
    const activeReg = currentRegionInfo?.code || getUserRegion() || 'US';
    setUserRegionState(activeReg);

    loadData();
    if (activeReg === 'IN') {
      loadIndiaData();
    }

    const handleRegionChanged = async () => {
      clearMovieApiCache();
      const updatedReg = getUserRegion() || 'US';
      setUserRegionState(updatedReg);
      try {
        const [spotlights, trending, topRated] = await Promise.all([
          fetchSpotlightMovies(),
          fetchTrendingMovies(),
          fetchTopRatedMovies(),
        ]);
        if (isMounted) {
          if (spotlights.length > 0) setSpotlightMovies(spotlights);
          if (trending.length > 0) setTrendingMovies(trending);
          if (topRated.length > 0) setTopRatedMovies(topRated);
        }
        if (updatedReg === 'IN') {
          loadIndiaData();
        } else {
          setIndiaTrending([]);
          setBollywoodMovies([]);
          setSouthMovies([]);
          setIndiaSeries([]);
        }
      } catch (err) {
        console.warn('Region feed reload error:', err);
      }
    };

    window.addEventListener('refra_region_changed', handleRegionChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('refra_region_changed', handleRegionChanged);
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
      ...indiaTrending,
      ...bollywoodMovies,
      ...southMovies,
      ...indiaSeries,
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
    indiaTrending,
    bollywoodMovies,
    southMovies,
    indiaSeries,
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
      ...indiaTrending,
      ...bollywoodMovies,
      ...southMovies,
      ...indiaSeries,
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
    indiaTrending,
    bollywoodMovies,
    southMovies,
    indiaSeries,
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

  // Open movie details directly by TMDB or custom ID
  const handleOpenDetailsById = async (movieId: string) => {
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
    let found = allCurrentMovies.find(
      (m) => m.id === movieId || m.id === `tmdb_${movieId}` || String(m.tmdbId) === movieId
    );
    if (!found) {
      try {
        const cleanId = movieId.replace('tmdb_', '');
        const res = await fetch(`/api/movies/${cleanId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.movie) found = data.movie;
        }
      } catch {}
    }
    if (found) {
      setSelectedMovie(found);
      setAutoPlayDetails(true);
    }
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
  const baseBgColor = isCustomImageActive ? '#060606' : (themeConfig.selectedBgColor || '#0c0d10');
  const activeBgColor = activeTab === 'search' && searchThemeColor ? searchThemeColor : baseBgColor;

  return (
    <div
      className="min-h-screen text-[#f0f2f5] flex justify-center antialiased selection:bg-neutral-800 selection:text-white relative transition-colors duration-700"
      style={{ backgroundColor: activeBgColor }}
    >
      {/* Dynamic Device Wallpaper Layer (when enabled) */}
      {isCustomImageActive && themeConfig.customBgImage && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat transition-[transform] duration-500"
            style={{
              backgroundImage: `url(${themeConfig.customBgImage})`,
              filter: `blur(${themeConfig.bgBlur || 0}px)`,
              transform: (themeConfig.bgBlur || 0) > 0 ? 'scale(1.06)' : 'scale(1)',
              willChange: 'transform',
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
        {/* PWA Starting / Launch Experience */}
        <PWAStartSplash />

        {/* Floating Combined Action Pill (Notification + Cast + Install) */}
        {(activeTab === 'home' || activeTab === 'explore') && (
          <Navbar
            onOpenCast={() => {
              setIsCastOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            onOpenNotifications={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsCastOpen(false);
            }}
            isCastOpen={isCastOpen}
            isNotificationsOpen={isNotificationsOpen}
            isCastConnected={isCastConnected}
            connectedDeviceName={connectedDevice?.name}
            unreadCount={unreadNotifCount}
          />
        )}

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
              title={userRegion === 'IN' ? "Trending Globally" : "Trending Masterworks"}
              movies={trendingMovies}
              onMovieClick={handleOpenDetails}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* India-Specific Feed: Popular, Bollywood, South Indian, and Originals */}
            {userRegion === 'IN' && (
              <>
                {indiaTrending.length > 0 && (
                  <MovieRow
                    title="Trending in India"
                    movies={indiaTrending}
                    onMovieClick={handleOpenDetails}
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    onPlayMovie={handlePlayMovie}
                    showDivider={true}
                  />
                )}
                {bollywoodMovies.length > 0 && (
                  <MovieRow
                    title="Bollywood & Hindi Blockbusters"
                    movies={bollywoodMovies}
                    onMovieClick={handleOpenDetails}
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    onPlayMovie={handlePlayMovie}
                    showDivider={true}
                  />
                )}
                {southMovies.length > 0 && (
                  <MovieRow
                    title="South Indian Cinema (Telugu, Tamil, Malayalam, Kannada)"
                    movies={southMovies}
                    onMovieClick={handleOpenDetails}
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    onPlayMovie={handlePlayMovie}
                    showDivider={true}
                  />
                )}
                {indiaSeries.length > 0 && (
                  <MovieRow
                    title="Indian Web Series & Drama"
                    movies={indiaSeries}
                    onMovieClick={handleOpenDetails}
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                    onPlayMovie={handlePlayMovie}
                    showDivider={true}
                  />
                )}
              </>
            )}

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
            <SearchView
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onMovieClick={handleOpenDetails}
              initialQuery={searchQuery}
              onThemeColorChange={setSearchThemeColor}
            />
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
          onSearchQuery={(q) => {
            setSearchQuery(q);
            setActiveTab('search');
            setSelectedMovie(null);
          }}
        />

        {/* Cast & Remote Playback Modal */}
        <CastModal
          isOpen={isCastOpen}
          onClose={() => setIsCastOpen(false)}
          activeMovie={playingMovie || selectedMovie}
          isCastConnected={isCastConnected}
          connectedDeviceName={connectedDevice?.name || null}
          onConnectDevice={(dev) => {
            setConnectedDevice(dev);
            setIsCastConnected(true);
          }}
          onDisconnectDevice={() => {
            setConnectedDevice(null);
            setIsCastConnected(false);
          }}
        />

        {/* Cinema Notifications Center */}
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onSelectMovieById={handleOpenDetailsById}
          onUnreadCountChange={setUnreadNotifCount}
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

        {/* Global Offline Network Status Toast */}
        <OfflineIndicator />
      </main>
    </div>
  );
}
