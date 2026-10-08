import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { NotFoundView } from './components/NotFoundView';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsModal } from './components/TermsModal';
import { ContactModal } from './components/ContactModal';
import { ThankYouModal } from './components/ThankYouModal';
import { CategoryMoviesModal, CategoryModalData } from './components/CategoryMoviesModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { StickyMobileCTA } from './components/StickyMobileCTA';
import { updatePageMetadata } from './utils/seo';
import { useCastState } from './services/castService';
import { FALLBACK_MOVIES } from './data/movies';
import { FALLBACK_BOLLYWOOD_MOVIES, FALLBACK_SOUTH_MOVIES } from './data/indianFallbackMovies';
import {
  fetchSpotlightMovies,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchAnimeMovies,
  fetchSciFiMovies,
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
import { getPosterUrl, preloadMovieThumbnails } from './utils/imageHelpers';
import { fetchTasteDiveRecommendations } from './services/tastediveApi';
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
import { initNetworkManager } from './services/networkManager';
import { initHighQualityRegistry } from './services/visualQualityManager';
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
import { initSmoothScroll, scrollToTop } from './utils/smoothScroll';
import { usePredictiveBack } from './hooks/usePredictiveBack';

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

  const [userRegion, setUserRegionState] = useState<string>(() => getUserRegionInfo()?.code || 'GLOBAL');
  const [indiaTrending, setIndiaTrending] = useState<Movie[]>(
    () => cachedData?.indiaTrending || [...FALLBACK_BOLLYWOOD_MOVIES, ...FALLBACK_SOUTH_MOVIES]
  );
  const [bollywoodMovies, setBollywoodMovies] = useState<Movie[]>(
    () => cachedData?.bollywoodMovies || FALLBACK_BOLLYWOOD_MOVIES
  );
  const [southMovies, setSouthMovies] = useState<Movie[]>(
    () => cachedData?.southMovies || FALLBACK_SOUTH_MOVIES
  );
  const [indiaSeries, setIndiaSeries] = useState<Movie[]>(() => cachedData?.indiaSeries || []);
  const [categoryModalData, setCategoryModalData] = useState<CategoryModalData | null>(null);
  const [tastediveData, setTastediveData] = useState<{ basisTitle: string; movies: Movie[] }>({
    basisTitle: '',
    movies: [],
  });

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
  const castState = useCastState();
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCastConnected, setIsCastConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<CastDevice | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(3);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);

  const effectiveCastConnected = isCastConnected || castState.isConnected;
  const effectiveDeviceName = castState.deviceName || connectedDevice?.name || null;

  // Dynamic UI Theme & Background State
  const [themeConfig, setThemeConfig] = useState<UiThemeConfig>(DEFAULT_THEME_CONFIG);
  const [searchThemeColor, setSearchThemeColor] = useState<string | null>(null);

  // Legal, Compliance, Contact & 404 State
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [thankYouData, setThankYouData] = useState<{ isOpen: boolean; ticketId?: string } | null>(null);
  const [is404Active, setIs404Active] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      return path.includes('404') || hash.includes('404');
    }
    return false;
  });

  // Dynamic SEO Meta Title and Description on Tab or State Change
  useEffect(() => {
    if (is404Active) {
      updatePageMetadata({
        title: '404 Page Not Found — Refra 4K Cinema',
        description: 'The requested film, reel, or stream catalog link could not be located in the Refra 4K archive.',
        canonicalUrl: 'https://refra.netlify.app/404',
      });
      return;
    }

    if (selectedMovie) {
      updatePageMetadata({
        title: `${selectedMovie.title} (${selectedMovie.releaseYear}) in 4K UHD — Stream Free on Refra`,
        description: selectedMovie.synopsis || `Watch ${selectedMovie.title} in crystal-clear 4K HDR with Dolby Atmos audio on Refra.`,
        canonicalUrl: `https://refra.netlify.app/movie/${selectedMovie.id}`,
        ogImage: selectedMovie.backdropUrl || selectedMovie.posterUrl,
      });
      return;
    }

    switch (activeTab) {
      case 'explore':
        updatePageMetadata({
          title: 'Explore 4K Cinema & Anime Catalog — Refra',
          description: 'Browse thousands of 4K UHD movies, trending anime series, Bollywood releases, and critically acclaimed arthouse cinema.',
          canonicalUrl: 'https://refra.netlify.app/explore',
        });
        break;
      case 'search':
        updatePageMetadata({
          title: searchQuery ? `Search "${searchQuery}" — Refra 4K Cinema` : 'Search Movies, Anime & Directors — Refra',
          description: 'Instantly find 4K movies, anime episodes, and classic releases across TMDB, OMDB, and AniList catalogs.',
          canonicalUrl: 'https://refra.netlify.app/search',
        });
        break;
      case 'watchlist':
        updatePageMetadata({
          title: 'My Cinema Watchlist — Refra',
          description: 'Your private, local-first movie and anime queue. Sync seamlessly with your Trakt.tv account.',
          canonicalUrl: 'https://refra.netlify.app/watchlist',
        });
        break;
      case 'profile':
        updatePageMetadata({
          title: 'Account, Trakt Sync & Preferences — Refra',
          description: 'Manage your Trakt.tv connection, adjust stream server priorities, and customize cinematic color themes.',
          canonicalUrl: 'https://refra.netlify.app/profile',
        });
        break;
      case 'home':
      default:
        updatePageMetadata({
          title: 'Refra — 4K Ad-Free Cinematic Streaming & Anime',
          description: 'Experience pure cinema in uncompressed 4K UHD, HDR10+, and Dolby Atmos. Zero ads, zero tracking, Stremio addon integration, and Trakt.tv sync.',
          canonicalUrl: 'https://refra.netlify.app/',
        });
        break;
    }
  }, [activeTab, is404Active, selectedMovie, searchQuery]);

  useEffect(() => {
    let isMounted = true;
    const cleanupScroll = initSmoothScroll();
    initGoogleAnalytics();
    loadSavedThemeConfig().then((cfg) => {
      if (isMounted) {
        setThemeConfig(cfg);
        applyThemeToDocument(cfg);
      }
    });
    return () => {
      isMounted = false;
      cleanupScroll();
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

  // Automatic Network (Wi-Fi vs Cellular) Detection & Visual Quality Synchronization
  useEffect(() => {
    initHighQualityRegistry();
    const cleanupNetwork = initNetworkManager();

    const syncThemeOnNetworkChange = () => {
      loadSavedThemeConfig().then((cfg) => {
        setThemeConfig(cfg);
      });
    };

    window.addEventListener('refra-network-changed', syncThemeOnNetworkChange);
    window.addEventListener('refra-visuals-upgraded', syncThemeOnNetworkChange);

    return () => {
      cleanupNetwork();
      window.removeEventListener('refra-network-changed', syncThemeOnNetworkChange);
      window.removeEventListener('refra-visuals-upgraded', syncThemeOnNetworkChange);
    };
  }, []);

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
        if (dbCatalog.indiaTrending?.length) setIndiaTrending(dbCatalog.indiaTrending);
        if (dbCatalog.bollywoodMovies?.length) setBollywoodMovies(dbCatalog.bollywoodMovies);
        if (dbCatalog.southMovies?.length) setSouthMovies(dbCatalog.southMovies);
        if (dbCatalog.indiaSeries?.length) setIndiaSeries(dbCatalog.indiaSeries);
      });
    }

    async function loadData() {
      try {
        const [spotlights, trending, anime, topRated, scifi] = await Promise.all([
          fetchSpotlightMovies(),
          fetchTrendingMovies(),
          fetchAnimeMovies(),
          fetchTopRatedMovies(),
          fetchSciFiMovies(),
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

          // Save to 6-hour cache (IndexedDB + localStorage) if new items arrived
          if (hasChanges || !cachedData) {
            save6HourCache({
              spotlightMovies: spotlights.length > 0 ? spotlights : spotlightMovies,
              trendingMovies: trending.length > 0 ? trending : trendingMovies,
              animeMovies: anime.length > 0 ? anime : animeMovies,
              topRatedMovies: topRated.length > 0 ? topRated : topRatedMovies,
              scifiMovies: scifi.length > 0 ? scifi : scifiMovies,
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
    const activeReg = currentRegionInfo?.code || 'GLOBAL';
    setUserRegionState(activeReg);

    loadData();
    loadIndiaData();

    const handleRegionChanged = async (e?: any) => {
      clearMovieApiCache();
      const customRegion = e?.detail?.region;
      const regionInfo = getUserRegionInfo();
      const updatedReg = customRegion || regionInfo?.code || 'GLOBAL';
      setUserRegionState(updatedReg);
      try {
        const [spotlights, trending, topRated] = await Promise.all([
          fetchSpotlightMovies(updatedReg, true),
          fetchTrendingMovies(updatedReg, true),
          fetchTopRatedMovies(updatedReg, true),
        ]);
        if (isMounted) {
          if (spotlights && spotlights.length > 0) setSpotlightMovies(spotlights);
          if (trending && trending.length > 0) setTrendingMovies(trending);
          if (topRated && topRated.length > 0) setTopRatedMovies(topRated);
        }
        if (updatedReg === 'IN') {
          loadIndiaData();
        } else {
          setIndiaTrending([]);
          setBollywoodMovies([]);
          setSouthMovies([]);
          setIndiaSeries([]);
        }
        // Persist to 6-hour cache so reload retains regional spotlight
        if (spotlights && spotlights.length > 0) {
          save6HourCache({
            spotlightMovies: spotlights,
            trendingMovies: trending && trending.length > 0 ? trending : trendingMovies,
            animeMovies,
            topRatedMovies: topRated && topRated.length > 0 ? topRated : topRatedMovies,
            scifiMovies,
            indiaTrending: updatedReg === 'IN' ? indiaTrending : [],
            bollywoodMovies: updatedReg === 'IN' ? bollywoodMovies : [],
            southMovies: updatedReg === 'IN' ? southMovies : [],
            indiaSeries: updatedReg === 'IN' ? indiaSeries : [],
          });
        }
      } catch (err) {
        console.warn('Region feed reload error:', err);
      }
    };

    const handleCatalogRefresh = async () => {
      clearMovieApiCache();
      loadData();
      const currentRegionInfo = getUserRegionInfo();
      if (currentRegionInfo?.code === 'IN') {
        loadIndiaData();
      }
    };

    window.addEventListener('refra_region_changed', handleRegionChanged);
    window.addEventListener('refra_refresh_catalog', handleCatalogRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('refra_region_changed', handleRegionChanged);
      window.removeEventListener('refra_refresh_catalog', handleCatalogRefresh);
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
      ...indiaTrending,
      ...bollywoodMovies,
      ...southMovies,
      ...indiaSeries,
      ...tastediveData.movies,
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
    indiaTrending,
    bollywoodMovies,
    southMovies,
    indiaSeries,
    tastediveData.movies,
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

  const toggleWatchlist = useCallback((movieId: string) => {
    setWatchlist((prev) => {
      const isAdding = !prev.includes(movieId);
      const movieItem = allMoviesMap.get(movieId);
      trackWatchlistAction(movieId, movieItem?.title || movieId, isAdding ? 'add' : 'remove');
      return isAdding ? [...prev, movieId] : prev.filter((id) => id !== movieId);
    });
  }, [allMoviesMap]);

  // Fetch TasteDive "Similar to" recommendations using local history as the top priority seed
  useEffect(() => {
    let isMounted = true;
    const historyTitles = historyItems.map((h) => h.title).filter(Boolean);
    const watchlistTitles = watchlist
      .map((id) => allMoviesMap.get(id)?.title)
      .filter(Boolean) as string[];

    const seedTitles =
      historyTitles.length > 0
        ? historyTitles
        : watchlistTitles.length > 0
        ? watchlistTitles
        : [spotlightMovies[0]?.title || 'Interstellar', 'Breaking Bad'];

    fetchTasteDiveRecommendations(seedTitles, 20).then((res) => {
      if (isMounted && res.movies && res.movies.length > 0) {
        setTastediveData({
          basisTitle: res.basisTitle || seedTitles[0] || 'Favorites',
          movies: res.movies,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [historyItems, watchlist, spotlightMovies]);

  const handlePlayMovie = useCallback((movie: Movie, episodeIndex: number = 0) => {
    // Record into history right away so continue watching and sticky CTA update immediately
    const histItem: HistoryItem = {
      id: `hist_${movie.id}`,
      movieId: movie.id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      progressPercent: movie.progress?.percentage || 5,
      durationString: movie.progress?.timeLeft || movie.duration || '2h',
      lastWatchedTimestamp: Date.now(),
    };
    saveIndexedDbHistoryItem(histItem);
    setHistoryItems((prev) => [histItem, ...prev.filter((h) => h.movieId !== movie.id)]);

    // Open the dedicated streaming page directly, which auto-selects the best stream with a toast
    setSelectedMovie(null);
    setServerSelectorMovie(null);
    setSelectedStream(null);
    setPlayingEpisodeIndex(episodeIndex);
    setPlayingMovie(movie);
  }, []);

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
  };

  // Open movie details directly by TMDB or custom ID
  const handleOpenDetailsById = async (movieId: string) => {
    const allCurrentMovies = [
      ...spotlightMovies,
      ...trendingMovies,
      ...animeMovies,
      ...topRatedMovies,
      ...scifiMovies,
      ...indiaTrending,
      ...bollywoodMovies,
      ...southMovies,
      ...indiaSeries,
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

  const handleOpenDetails = useCallback((movie: Movie, origin?: DOMRect | ExpansionOrigin) => {
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
  }, []);

  const watchlistMovies = useMemo(() => {
    return watchlist
      .map((id) => allMoviesMap.get(id))
      .filter((m): m is Movie => Boolean(m));
  }, [watchlist, allMoviesMap]);

  // Determine the last played / continue watching movie for the mobile quick action CTA
  const lastPlayedMovie = useMemo(() => {
    if (playingMovie) return playingMovie;
    if (continueWatchingMovies && continueWatchingMovies.length > 0) {
      return continueWatchingMovies[0];
    }
    return spotlightMovies[0] || trendingMovies[0] || null;
  }, [playingMovie, continueWatchingMovies, spotlightMovies, trendingMovies]);

  // Memoize stable row slices to prevent re-renders during homepage scroll
  const slicedTasteDive = useMemo(() => tastediveData.movies.slice(0, 20), [tastediveData.movies]);
  const slicedTrending = useMemo(() => trendingMovies.slice(0, 20), [trendingMovies]);
  const slicedBollywood = useMemo(() => bollywoodMovies.slice(0, 20), [bollywoodMovies]);
  const slicedSouth = useMemo(() => southMovies.slice(0, 20), [southMovies]);
  const slicedIndiaTrend = useMemo(() => indiaTrending.slice(0, 20), [indiaTrending]);
  const slicedIndiaSeries = useMemo(() => indiaSeries.slice(0, 20), [indiaSeries]);
  const slicedAnime = useMemo(() => animeMovies.slice(0, 20), [animeMovies]);
  const slicedTopRated = useMemo(() => topRatedMovies.slice(0, 20), [topRatedMovies]);
  const slicedScifi = useMemo(() => scifiMovies.slice(0, 20), [scifiMovies]);

  // Preload and keep all row thumbnails cached in memory so they stay loaded while scrolling
  useEffect(() => {
    preloadMovieThumbnails([
      ...slicedTasteDive,
      ...slicedTrending,
      ...slicedBollywood,
      ...slicedSouth,
      ...slicedIndiaTrend,
      ...slicedIndiaSeries,
      ...slicedAnime,
      ...slicedTopRated,
      ...slicedScifi,
    ]);
  }, [
    slicedTasteDive,
    slicedTrending,
    slicedBollywood,
    slicedSouth,
    slicedIndiaTrend,
    slicedIndiaSeries,
    slicedAnime,
    slicedTopRated,
    slicedScifi,
  ]);

  const isCustomImageActive = themeConfig.bgMode === 'image' && Boolean(themeConfig.customBgImage);
  const baseBgColor = isCustomImageActive ? '#060606' : (themeConfig.selectedBgColor || '#0c0d10');
  const activeBgColor = activeTab === 'search' && searchThemeColor ? searchThemeColor : baseBgColor;

  // Predictive back navigation controller for sequential one-step-at-a-time exit
  const { popSilently } = usePredictiveBack({
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
    isThankYouOpen: Boolean(thankYouData?.isOpen),
    setThankYouOpen: (open) => {
      if (!open) setThankYouData(null);
    },
    categoryModalData,
    setCategoryModalData,
  });

  return (
    <div
      className="min-h-screen text-[#f0f2f5] flex justify-center antialiased selection:bg-neutral-800 selection:text-white relative transition-colors duration-700"
      style={{ backgroundColor: activeBgColor }}
    >
      {/* Clean Static Device Wallpaper Layer (No Sync Scroll - Fixed & Non-Jittery) */}
      {isCustomImageActive && themeConfig.customBgImage && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src={themeConfig.customBgImage}
            alt="Cinema Wallpaper"
            className="w-full h-full absolute inset-0 object-cover object-center pointer-events-none select-none transition-[filter] duration-300"
            style={{
              filter: `blur(${themeConfig.bgBlur ?? 6}px)`,
            }}
          />
          {/* Dimming Scrim for Readability */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${(themeConfig.bgOverlayDim ?? 30) / 100})`,
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
        {/* Floating Combined Action Pill (Notification + Cast + Install) */}
        <Navbar
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === activeTab) {
                scrollToTop();
              } else {
                setActiveTab(tab);
                scrollToTop();
              }
            }}
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
            isCastConnected={effectiveCastConnected}
            connectedDeviceName={effectiveDeviceName}
            unreadCount={unreadNotifCount}
          />

        {/* Tab View Content */}
        <div className="flex-1 pb-28 pt-1">
          {is404Active ? (
            <NotFoundView
              onGoHome={() => {
                setIs404Active(false);
                setActiveTab('home');
                scrollToTop();
              }}
              onExplore={() => {
                setIs404Active(false);
                setActiveTab('explore');
                scrollToTop();
              }}
              onSearch={(q) => {
                setIs404Active(false);
                setSearchQuery(q);
                setActiveTab('search');
                scrollToTop();
              }}
            />
          ) : (
            <>
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

            {/* Top Row: TasteDive "Because You Liked X" powered by local watch history */}
            {slicedTasteDive.length > 0 && (
              <MovieRow
                title={
                  tastediveData.basisTitle
                    ? `Because You Liked ${tastediveData.basisTitle}`
                    : 'Recommended For You'
                }
                movies={slicedTasteDive}
                totalCount={tastediveData.movies.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: tastediveData.basisTitle
                      ? `Because You Liked ${tastediveData.basisTitle}`
                      : 'TasteDive Recommendations',
                    subtitle: 'TasteDive engine recommendations synthesized from your local watch history',
                    badge: 'TasteDive AI',
                    movies: tastediveData.movies,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* 1st Divider: Trending Masterworks */}
            {slicedTrending.length > 0 && (
              <MovieRow
                title="Trending Masterworks"
                movies={slicedTrending}
                totalCount={trendingMovies.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: 'Trending Masterworks',
                    subtitle: 'Top global cinema trending across all genres and countries',
                    movies: trendingMovies,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* Bollywood & Hindi Blockbusters */}
            {slicedBollywood.length > 0 && (
              <MovieRow
                title="Bollywood & Hindi Blockbusters"
                movies={slicedBollywood}
                totalCount={bollywoodMovies.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: 'Bollywood & Hindi Blockbusters',
                    subtitle: 'Top rated & trending Hindi cinema and major blockbusters',
                    movies: bollywoodMovies,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* South Indian Cinema */}
            {slicedSouth.length > 0 && (
              <MovieRow
                title="South Indian Cinema"
                movies={slicedSouth}
                totalCount={southMovies.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: 'South Indian Cinema',
                    subtitle: 'Trending Tollywood, Kollywood, Mollywood, and Sandalwood masterworks',
                    movies: southMovies,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* Trending in India */}
            {slicedIndiaTrend.length > 0 && (
              <MovieRow
                title="Trending in India"
                movies={slicedIndiaTrend}
                totalCount={indiaTrending.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: 'Trending in India',
                    subtitle: 'Most watched and discussed films across India right now',
                    movies: indiaTrending,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* Indian Web Series & Drama */}
            {slicedIndiaSeries.length > 0 && (
              <MovieRow
                title="Indian Web Series & Drama"
                movies={slicedIndiaSeries}
                totalCount={indiaSeries.length}
                onMovieClick={handleOpenDetails}
                onHeaderClick={() => {
                  setCategoryModalData({
                    title: 'Indian Web Series & Drama',
                    subtitle: 'Critically acclaimed Indian episodic series, thrillers, and dramas',
                    movies: indiaSeries,
                  });
                }}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onPlayMovie={handlePlayMovie}
                showDivider={true}
              />
            )}

            {/* 2nd Divider: Trending Anime */}
            <MovieRow
              title="Trending Anime"
              movies={slicedAnime}
              totalCount={animeMovies.length}
              onMovieClick={handleOpenDetails}
              onHeaderClick={() => {
                setCategoryModalData({
                  title: 'Trending Anime',
                  subtitle: 'Top rated anime features, films, and Japanese animations',
                  movies: animeMovies,
                });
              }}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 3rd Divider: Top Rated Cinema */}
            <MovieRow
              title="Top Rated Cinema"
              movies={slicedTopRated}
              totalCount={topRatedMovies.length}
              onMovieClick={handleOpenDetails}
              onHeaderClick={() => {
                setCategoryModalData({
                  title: 'Top Rated Cinema',
                  subtitle: 'All-time acclaimed cinematic masterpieces with highest ratings',
                  movies: topRatedMovies,
                });
              }}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onPlayMovie={handlePlayMovie}
              showDivider={true}
            />

            {/* 4th Divider: Sci-Fi & Speculative Fiction */}
            <MovieRow
              title="Sci-Fi & Speculative Fiction"
              movies={slicedScifi}
              totalCount={scifiMovies.length}
              onMovieClick={handleOpenDetails}
              onHeaderClick={() => {
                setCategoryModalData({
                  title: 'Sci-Fi & Speculative Fiction',
                  subtitle: 'Visions of tomorrow, cyberpunk, outer space, and speculative worlds',
                  movies: scifiMovies,
                });
              }}
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
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
              onOpenTerms={() => setIsTermsOpen(true)}
              onOpenContact={() => setIsContactOpen(true)}
              onOpenCookieConsent={() => {
                try {
                  localStorage.removeItem('refra_cookie_consent');
                } catch {}
                window.location.reload();
              }}
              onPreview404={() => {
                setIs404Active(true);
                scrollToTop();
              }}
            />
          )}

          {/* Refra Verified Studio & Compliance Footer */}
          <footer className="mt-16 pt-10 pb-8 border-t border-white/10 text-neutral-400 text-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight">REFRA</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-[#FA0019]/20 text-[#FA0019] text-[10px] font-black uppercase">
                    4K UHD
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 max-w-sm">
                  Decentralized, ad-free cinema indexing protocol and local-first media client. Zero ads, zero tracking.
                </p>
              </div>

              {/* Quick Navigation Links */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setIs404Active(false); setActiveTab('home'); scrollToTop(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => { setIs404Active(false); setActiveTab('explore'); scrollToTop(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Explore
                </button>
                <button
                  type="button"
                  onClick={() => { setIs404Active(false); setActiveTab('search'); scrollToTop(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => { setIs404Active(false); setActiveTab('watchlist'); scrollToTop(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Watchlist
                </button>
                <button
                  type="button"
                  onClick={() => { setIs404Active(false); setActiveTab('profile'); scrollToTop(); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Profile
                </button>
              </div>
            </div>

            {/* Legal & Compliance Links */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5 text-[11px]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  Terms &amp; DMCA Agent
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setIsContactOpen(true)}
                  className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  Contact Studio
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setIs404Active(true); scrollToTop(); }}
                  className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  404 Preview
                </button>
              </div>

              {/* Physical Studio Address */}
              <div className="text-neutral-500">
                201 Mission St, Ste 1200, San Francisco, CA 94105, USA
              </div>
            </div>

            <div className="text-[10px] text-neutral-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <span>&copy; {new Date().getFullYear()} Refra Cinema Systems. All rights reserved.</span>
              <span>Metadata provided via TMDB &amp; AniList. Video streams handled by external decentralized indexers.</span>
            </div>
          </footer>
            </>
          )}
        </div>

        {/* Floating Bottom Liquid Glass Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === activeTab) {
              scrollToTop();
            } else {
              setActiveTab(tab);
              scrollToTop();
            }
          }}
          watchlistCount={watchlist.length}
        />

        {/* Liquid Organic Movie Details Sheet */}
        <MovieDetailsModal
          movie={selectedMovie}
          expansionOrigin={expansionOrigin}
          onClose={() => {
            setSelectedMovie(null);
            popSilently();
          }}
          watchlist={watchlist}
          onToggleWatchlist={toggleWatchlist}
          autoPlay={autoPlayDetails}
          onPlayMovie={handlePlayMovie}
          onSearchQuery={(q) => {
            setSearchQuery(q);
            setActiveTab('search');
            setSelectedMovie(null);
          }}
          onOpenCast={() => setIsCastOpen(true)}
        />

        {/* Cast & Remote Playback Modal */}
        <CastModal
          isOpen={isCastOpen}
          onClose={() => {
            setIsCastOpen(false);
            popSilently();
          }}
          activeMovie={playingMovie || selectedMovie}
          isCastConnected={effectiveCastConnected}
          connectedDeviceName={effectiveDeviceName}
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
          onClose={() => {
            setIsNotificationsOpen(false);
            popSilently();
          }}
          onSelectMovieById={handleOpenDetailsById}
          onUnreadCountChange={setUnreadNotifCount}
        />

        {/* Stremio Addons Server Hub (PenguPlay, Torrentio, Comet, AIOStreams, Nuvio) */}
        <StreamServerSelectorModal
          movie={serverSelectorMovie}
          isOpen={Boolean(serverSelectorMovie)}
          onClose={() => {
            setServerSelectorMovie(null);
            popSilently();
          }}
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
            popSilently();
          }}
          onProgressUpdate={handleStreamProgressUpdate}
          selectedStream={selectedStream}
          initialEpisodeIndex={playingEpisodeIndex}
          onOpenServerSelector={() => {
            if (playingMovie) {
              setServerSelectorMovie(playingMovie);
            }
          }}
          onOpenCast={() => setIsCastOpen(true)}
        />

        {/* Global Offline Network Status Toast */}
        <OfflineIndicator />

        {/* Sticky Mobile Above-the-fold CTA */}
        <StickyMobileCTA
          movie={lastPlayedMovie}
          onPlay={handlePlayMovie}
          onSearch={() => setActiveTab('search')}
          themeConfig={themeConfig}
        />

        {/* GDPR / CCPA Cookie Consent Banner */}
        <CookieConsentBanner onOpenPrivacy={() => setIsPrivacyOpen(true)} />

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal
          isOpen={isPrivacyOpen}
          onClose={() => {
            setIsPrivacyOpen(false);
            popSilently();
          }}
        />

        {/* Terms of Service & DMCA Compliance Modal */}
        <TermsModal
          isOpen={isTermsOpen}
          onClose={() => {
            setIsTermsOpen(false);
            popSilently();
          }}
        />

        {/* Contact Headquarters & Verified Studio Modal */}
        <ContactModal
          isOpen={isContactOpen}
          onClose={() => {
            setIsContactOpen(false);
            popSilently();
          }}
          onSuccess={(ticketId) => setThankYouData({ isOpen: true, ticketId })}
        />

        {/* Submission Confirmation & Thank You Modal */}
        <ThankYouModal
          isOpen={Boolean(thankYouData?.isOpen)}
          onClose={() => {
            setThankYouData(null);
            popSilently();
          }}
          ticketId={thankYouData?.ticketId}
        />

        {/* Category Full-Screen Explore & Filter Modal */}
        <CategoryMoviesModal
          isOpen={Boolean(categoryModalData)}
          categoryData={categoryModalData}
          watchlist={watchlist}
          onToggleWatchlist={toggleWatchlist}
          onSelectMovie={(movie, originRect) => {
            handleOpenDetails(movie, originRect);
          }}
          onPlayMovie={handlePlayMovie}
          onClose={() => {
            setCategoryModalData(null);
            popSilently();
          }}
        />
      </main>
    </div>
  );
}
