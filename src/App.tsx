import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  Tv,
  Film,
  AlertCircle,
  History,
  Bookmark,
  Calendar,
  Star,
  Play,
  Info,
  MessagesSquare,
  Check,
  LogOut,
  User,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MediaItem, WatchHistoryItem, WatchlistItem } from "./types";
import { smartFetch } from "./api";
import MovieCard from "./components/MovieCard";
import MovieCarousel from "./components/MovieCarousel";
import VideoPlayer from "./components/VideoPlayer";
import DetailModal from "./components/DetailModal";
import Login from "./components/Login";

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"home" | "movies" | "series" | "watchlist" | "history">("home");
  
  // Data lists
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularTV, setPopularTV] = useState<MediaItem[]>([]);
  const [scifiMovies, setScifiMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [spotlightItem, setSpotlightItem] = useState<MediaItem | null>(null);

  // User Account & Session States (Dynamic validation tied to Discord-Github raw db)
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; expire?: string; key?: string } | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);

  // User Lists States
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Brand Filter Collection State
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandCollectionItems, setBrandCollectionItems] = useState<MediaItem[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);

  // Active overlays/viewer
  const [activePlayerItem, setActivePlayerItem] = useState<MediaItem | null>(null);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<MediaItem | null>(null);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);

  // System general logs/states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const theaterRef = useRef<HTMLDivElement>(null);

  // Validate user session directly against the latest raw keys.json from GitHub on load
  const validateSession = async () => {
    const pfUsername = localStorage.getItem("pf_username");
    const pfKey = localStorage.getItem("pf_key");

    // 1. If pf_username or pf_key is missing → redirect to login (set currentUser to null)
    if (!pfUsername || !pfKey) {
      console.warn("DEBUG: Stored pf_username or pf_key is missing. Access denied.");
      setCurrentUser(null);
      localStorage.removeItem("pepflick_session");
      localStorage.removeItem("pf_username");
      localStorage.removeItem("pf_key");
      setSessionChecking(false);
      return;
    }

    try {
      // Fetch fresh keys.json from GitHub
      const url = "https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json";
      const response = await fetch(url, { cache: "no-store" });
      
      if (!response.ok) {
        throw new Error(`Failed to load security database (HTTP ${response.status})`);
      }

      const json = await response.json();

      // Ensure data schema is valid
      if (!json || typeof json !== "object" || !json.users) {
        throw new Error("Invalid structure returned from database");
      }

      // 2. If the username does NOT exist in keys.json → clear localStorage and redirect to login
      const userRecord = json.users[pfUsername];
      if (!userRecord) {
        console.warn(`DEBUG: Active user "${pfUsername}" not found in keys.json (revoked). Logging out.`);
        setCurrentUser(null);
        localStorage.removeItem("pepflick_session");
        localStorage.removeItem("pf_username");
        localStorage.removeItem("pf_key");
        setSessionChecking(false);
        return;
      }

      // 3. If the key in keys.json does NOT match pf_key → clear localStorage and redirect to login
      if (userRecord.key !== pfKey) {
        console.warn(`DEBUG: Key mismatch for "${pfUsername}". Key has changed. Logging out.`);
        setCurrentUser(null);
        localStorage.removeItem("pepflick_session");
        localStorage.removeItem("pf_username");
        localStorage.removeItem("pf_key");
        setSessionChecking(false);
        return;
      }

      // 4. If the expiration date in keys.json is in the past → clear localStorage and redirect to login
      const expireTime = new Date(userRecord.expire).getTime();
      const nowTime = Date.now();
      if (isNaN(expireTime) || nowTime > expireTime) {
        console.warn(`DEBUG: Key for "${pfUsername}" has expired on ${userRecord.expire}. Logging out.`);
        setCurrentUser(null);
        localStorage.removeItem("pepflick_session");
        localStorage.removeItem("pf_username");
        localStorage.removeItem("pf_key");
        setSessionChecking(false);
        return;
      }

      // 5. Only allow access if ALL checks pass
      setCurrentUser({
        username: pfUsername,
        name: pfUsername,
        expire: userRecord.expire,
        key: pfKey
      });
      console.log(`%cPepFlick Guard: Session validated successfully for "${pfUsername}".`, "color: #10b981; font-weight: bold;");

    } catch (err: any) {
      console.error("Session re-verification check failed:", err);
      // To strictly follow "Only allow access if ALL checks pass", we also clear and redirect on fatal parse/mismatches
      setCurrentUser(null);
      localStorage.removeItem("pepflick_session");
      localStorage.removeItem("pf_username");
      localStorage.removeItem("pf_key");
    } finally {
      setSessionChecking(false);
    }
  };

  // Run validateSession inside a useEffect that runs on page load
  useEffect(() => {
    validateSession();
  }, []);

  // Load watchlist & history when currentUser changes
  useEffect(() => {
    if (!currentUser) return;
    try {
      const persistedWatchlist = localStorage.getItem(`pepflick_watchlist_${currentUser.username}`);
      setWatchlist(persistedWatchlist ? JSON.parse(persistedWatchlist) : []);

      const persistedHistory = localStorage.getItem(`pepflick_history_${currentUser.username}`);
      setWatchHistory(persistedHistory ? JSON.parse(persistedHistory) : []);
    } catch (e) {
      console.error("Error loading user persistent lists:", e);
    }
  }, [currentUser]);

  // Fetch initial content feed on load
  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [trendingRes, tvRes, scifiRes, actionRes, horrorRes] = await Promise.all([
          smartFetch("/api/trending?type=movie"),
          smartFetch("/api/trending?type=tv"),
          smartFetch("/api/discover?type=movie&genres=878"), // Sci-Fi
          smartFetch("/api/discover?type=movie&genres=28"),  // Action
          smartFetch("/api/discover?type=movie&genres=27"),  // Horror
        ]);

        if (!trendingRes.ok || !tvRes.ok || !scifiRes.ok) {
          throw new Error("Could not load the catalog feed.");
        }

        const trendingData = await trendingRes.json();
        const tvData = await tvRes.json();
        const scifiData = await scifiRes.json();
        const actionData = await actionRes.json();
        const horrorData = await horrorRes.json();

        const moviesList = trendingData.results || [];
        setTrendingMovies(moviesList);
        setPopularTV(tvData.results || []);
        setScifiMovies(scifiData.results || []);
        setActionMovies(actionData.results || []);
        setHorrorMovies(horrorData.results || []);

        // Pick top trending movie as spotlight hero banner with fallback details fetch
        if (moviesList.length > 0) {
          const topItem = moviesList[0];
          fetchFullDetails(topItem.id, "movie", true);
        }
      } catch (err: any) {
        console.error("Content loading error:", err);
        setErrorMsg("Failed to connect to the movie database. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, []);

  // Real-time search processing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    setSelectedBrand(null); // Clear brand collection when searching

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await smartFetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter items with post paths to maintain visual standard
          const filtered = (data.results || []).filter(
            (item: MediaItem) => item.poster_path && (item.media_type === "movie" || item.media_type === "tv")
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Fetch full details of movie/tv (including runtime, imdb_id, cast details, etc)
  const fetchFullDetails = async (id: number, type: "movie" | "tv", isSpotlight = false) => {
    try {
      const res = await smartFetch(`/api/${type}/${id}`);
      if (res.ok) {
        const fullItemDetails = await res.json();
        fullItemDetails.media_type = type;

        if (isSpotlight) {
          setSpotlightItem(fullItemDetails);
        } else {
          setSelectedDetailsItem(fullItemDetails);
        }
      }
    } catch (err) {
      console.error("Details loading error:", err);
    }
  };

  // Fetch brand franchise movies and shows 100% client-side from TMDB
  const handleSelectBrand = async (brandId: string) => {
    setSelectedBrand(brandId);
    setBrandLoading(true);
    try {
      let endpoint = "";
      if (brandId === "disney") {
        endpoint = "/api/discover?type=movie&genres=16,10751"; // Animation & Family
      } else if (brandId === "pixar") {
        endpoint = "/api/discover?type=movie&genres=16"; // Animation
      } else if (brandId === "marvel") {
        endpoint = "/api/discover?type=movie&genres=28,878"; // Action & Sci-Fi
      } else if (brandId === "starwars") {
        endpoint = "/api/discover?type=movie&genres=878"; // Sci-Fi
      } else if (brandId === "natgeo") {
        endpoint = "/api/discover?type=movie&genres=99"; // Documentary
      } else if (brandId === "pepflick") {
        endpoint = "/api/trending?type=movie"; // Trending / Featured Highlights
      }

      if (endpoint) {
        const res = await smartFetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          // Filter out items without posters
          const filtered = (data.results || []).filter((item: MediaItem) => item.poster_path);
          setBrandCollectionItems(filtered);
        }
      }
    } catch (err) {
      console.error("Brand collection loading error:", err);
    } finally {
      setBrandLoading(false);
    }
  };

  // TV Remote Spatial Navigation Control Hook
  const lastDetailsItemRef = useRef<MediaItem | null>(null);
  const lastActivePlayerItemRef = useRef<MediaItem | null>(null);

  // Focus preservation effects
  useEffect(() => {
    if (selectedDetailsItem) {
      lastDetailsItemRef.current = selectedDetailsItem;
    } else if (lastDetailsItemRef.current) {
      const prevId = lastDetailsItemRef.current.id;
      setTimeout(() => {
        const card = document.getElementById(`movie-card-${prevId}`);
        if (card) {
          card.focus();
        }
      }, 100);
      lastDetailsItemRef.current = null;
    }
  }, [selectedDetailsItem]);

  useEffect(() => {
    if (activePlayerItem) {
      lastActivePlayerItemRef.current = activePlayerItem;
    } else if (lastActivePlayerItemRef.current) {
      const prevId = lastActivePlayerItemRef.current.id;
      setTimeout(() => {
        const card = document.getElementById(`movie-card-${prevId}`);
        if (card) {
          card.focus();
        } else {
          const playBtn = document.getElementById("btn-play-spotlight");
          if (playBtn) playBtn.focus();
        }
      }, 100);
      lastActivePlayerItemRef.current = null;
    }
  }, [activePlayerItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
      if (!arrowKeys.includes(e.key)) return;

      const active = document.activeElement as HTMLElement;
      
      // Only filter out focusable elements that are physically hidden (like on collapsed/inactive tabs)
      const focusables = (Array.from(document.querySelectorAll(".tv-focusable")) as HTMLElement[]).filter((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || el.closest(".hidden")) {
          return false;
        }
        return true;
      });

      if (focusables.length === 0) return;

      if (e.key === "Enter") {
        // If an input is focused, let standard search submit happen naturally
        if (active && active.tagName === "INPUT") {
          return;
        }
        if (active) {
          e.preventDefault();
          active.click();
        }
        return;
      }

      // If typing in input, allow arrow left/right to move cursor
      if (active && active.tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        return;
      }

      e.preventDefault();

      // If nothing is focused, focus the first visible focusable element
      if (!active || !focusables.includes(active)) {
        focusables[0].focus();
        return;
      }

      // Find spatial direction
      const activeRect = active.getBoundingClientRect();
      const activeX = activeRect.left + activeRect.width / 2;
      const activeY = activeRect.top + activeRect.height / 2;

      let bestElement: HTMLElement | null = null;
      let bestScore = Infinity;

      focusables.forEach((el) => {
        if (el === active) return;

        const elRect = el.getBoundingClientRect();
        const elX = elRect.left + elRect.width / 2;
        const elY = elRect.top + elRect.height / 2;

        const dX = elX - activeX;
        const dY = elY - activeY;

        let isValid = false;

        // Check if candidate is in the appropriate directional half-plane
        if (e.key === "ArrowUp" && dY < -5) isValid = true;
        if (e.key === "ArrowDown" && dY > 5) isValid = true;
        if (e.key === "ArrowLeft" && dX < -5) isValid = true;
        if (e.key === "ArrowRight" && dX > 5) isValid = true;

        if (isValid) {
          // Score formula prioritizing closeness in the aligned axis
          const primaryDistance = e.key === "ArrowLeft" || e.key === "ArrowRight" ? Math.abs(dX) : Math.abs(dY);
          const secondaryDistance = e.key === "ArrowLeft" || e.key === "ArrowRight" ? Math.abs(dY) : Math.abs(dX);
          
          // Orthogonal drift penalty to prevent diagonal jumps
          const score = primaryDistance + secondaryDistance * 4.5;

          if (score < bestScore) {
            bestScore = score;
            bestElement = el;
          }
        }
      });

      if (bestElement) {
        (bestElement as HTMLElement).focus();
        (bestElement as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Toggle watchlist
  const handleToggleWatchlist = (item: MediaItem) => {
    if (!currentUser) return;
    const isTv = item.first_air_date !== undefined;
    const itemType = item.media_type || (isTv ? "tv" : "movie");
    const exists = watchlist.some((w) => w.mediaId === item.id);
    let updated;

    if (exists) {
      updated = watchlist.filter((w) => w.mediaId !== item.id);
    } else {
      const newItem: WatchlistItem = {
        mediaId: item.id,
        title: item.title || item.name || "Untitled",
        posterPath: item.poster_path,
        mediaType: itemType as "movie" | "tv",
        backdropPath: item.backdrop_path,
        voteAverage: item.vote_average,
        releaseDate: item.release_date || item.first_air_date
      };
      updated = [newItem, ...watchlist];
    }

    setWatchlist(updated);
    localStorage.setItem(`pepflick_watchlist_${currentUser.username}`, JSON.stringify(updated));
  };

  // Handle watch history
  const handleUpdateHistory = (newHistoryItem: WatchHistoryItem) => {
    if (!currentUser) return;
    const filtered = watchHistory.filter((h) => h.mediaId !== newHistoryItem.mediaId);
    const updated = [newHistoryItem, ...filtered].slice(0, 20);
    setWatchHistory(updated);
    localStorage.setItem(`pepflick_history_${currentUser.username}`, JSON.stringify(updated));
  };

  // Clear watchlist
  const handleClearWatchlist = () => {
    if (!currentUser) return;
    setWatchlist([]);
    localStorage.removeItem(`pepflick_watchlist_${currentUser.username}`);
  };

  // Clear history
  const handleClearHistory = () => {
    if (!currentUser) return;
    setWatchHistory([]);
    localStorage.removeItem(`pepflick_history_${currentUser.username}`);
  };

  // Start video playback
  const startPlayback = async (item: MediaItem) => {
    const isTv = item.first_air_date !== undefined;
    const itemType = item.media_type || (isTv ? "tv" : "movie");

    try {
      const response = await smartFetch(`/api/${itemType}/${item.id}`);
      if (response.ok) {
        const fullItem = await response.json();
        fullItem.media_type = itemType;
        setActivePlayerItem(fullItem);
        setTimeout(() => {
          theaterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    } catch (e) {
      console.error("Playback load error, default item loaded instead:", e);
      setActivePlayerItem(item);
    }
  };

  const watchlistMediaIds = watchlist.map((w) => w.mediaId);

  // Render search-results or primary content carousels
  const renderHomeFeeds = () => {
    if (isSearching) {
      return (
        <div id="searching-matrix-overlay" className="px-4 md:px-12 py-10 text-left">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-8">
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
              Search Results for: &ldquo;{searchQuery}&rdquo;
            </h2>
            {searchLoading ? (
              <span className="text-xs text-neutral-500 animate-pulse">(Searching Catalog...)</span>
            ) : (
              <span className="text-xs text-neutral-500">({searchResults.length} matches found)</span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center rounded-xl border border-neutral-850 bg-[#111216]/50">
              <AlertCircle className="w-12 h-12 text-neutral-600 mb-4" />
              <p className="text-sm text-neutral-400">
                No titles match your search query. Try another term.
              </p>
              <button
                id="btn-search-clear-hint"
                onClick={() => setSearchQuery("")}
                className="mt-4 text-xs font-semibold text-[#e50914] hover:underline cursor-pointer tv-focusable"
              >
                Clear Search Query
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
              {searchResults.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  isInWatchlist={watchlistMediaIds.includes(item.id)}
                  onSelect={(i) => fetchFullDetails(i.id, i.media_type || (i.first_air_date ? "tv" : "movie"))}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (selectedBrand) {
      const brandInfo = {
        disney: { title: "Disney Collection", tagline: "Experience the timeless magic of animation & family favorites", logo: "🏰", color: "from-blue-900 via-[#0a0f24] to-[#0c0d10]" },
        pixar: { title: "Pixar Animation", tagline: "Delight in ground-breaking visual stories and characters", logo: "💡", color: "from-sky-950 via-[#0a0d16] to-[#0c0d10]" },
        marvel: { title: "Marvel Universe", tagline: "Join the battle alongside Earth's mightiest heroes", logo: "MARVEL", color: "from-red-950 via-[#0c0507] to-[#0c0d10]" },
        starwars: { title: "Star Wars Galaxy", tagline: "Journey to a galaxy far, far away with legendary blockbusters", logo: "STAR WARS", color: "from-slate-900 via-[#08080a] to-[#0c0d10]" },
        natgeo: { title: "National Geographic", tagline: "Explore the breathtaking wonder of our natural world", logo: "NATIONAL GEOGRAPHIC", color: "from-amber-950 via-[#0f0a05] to-[#0c0d10]" },
        pepflick: { title: "PepFlick Originals", tagline: "Stream premium entertainment curated for ultimate fans", logo: "PepFlick+", color: "from-cyan-950 via-[#050e14] to-[#0c0d10]" }
      }[selectedBrand as "disney" | "pixar" | "marvel" | "starwars" | "natgeo" | "pepflick"] || { title: "Collection", tagline: "", logo: "", color: "from-blue-950 to-[#0c0d10]" };

      return (
        <div className="px-4 md:px-12 py-8 text-left">
          {/* Brand Header Banner */}
          <div className={`rounded-xl p-8 md:p-12 mb-8 bg-gradient-to-r ${brandInfo.color} relative overflow-hidden border border-neutral-800 shadow-2xl`}>
            {/* Ambient visual overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                  Franchise Hub
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mt-3 mb-2 tracking-tight uppercase">
                  {brandInfo.title}
                </h2>
                <p className="text-xs md:text-sm text-neutral-300 font-medium">
                  {brandInfo.tagline}
                </p>
              </div>

              <button
                id="btn-close-brand-hub"
                onClick={() => setSelectedBrand(null)}
                className="self-start md:self-auto bg-white/10 hover:bg-white text-white hover:text-black px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-white/20 hover:scale-105 cursor-pointer h-10 tv-focusable"
              >
                ← Back to Home
              </button>
            </div>
          </div>

          {/* Grid list or Loading state */}
          {brandLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e50914] border-t-transparent mb-4" />
              <p className="text-xs text-neutral-400 animate-pulse uppercase tracking-wider">Loading collection...</p>
            </div>
          ) : brandCollectionItems.length === 0 ? (
            <div className="text-center py-20 text-neutral-400 text-sm">
              No films currently featured in this collection.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
              {brandCollectionItems.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  isInWatchlist={watchlistMediaIds.includes(item.id)}
                  onSelect={(i) => fetchFullDetails(i.id, i.media_type || (i.first_air_date ? "tv" : "movie"))}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div id="cinematic-carousels-container" className="space-y-4">
        {/* Continue Watching Section if watch history is not empty */}
        {watchHistory.length > 0 && (
          <div className="my-8 px-4 md:px-12 relative text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold tracking-tight text-white/95 uppercase">
                Continue Watching
              </h3>
              <button
                id="btn-clear-complete-history"
                onClick={handleClearHistory}
                className="text-[10px] uppercase font-bold text-neutral-400 hover:text-white bg-neutral-850 hover:bg-neutral-800 px-3 py-1.5 rounded cursor-pointer transition-colors tv-focusable"
              >
                Clear History
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 pr-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
              {watchHistory.map((item) => {
                const dummyMedia: MediaItem = {
                  id: item.mediaId,
                  title: item.mediaType === "movie" ? item.title : undefined,
                  name: item.mediaType === "tv" ? item.title : undefined,
                  poster_path: item.posterPath,
                  backdrop_path: null,
                  media_type: item.mediaType,
                  overview: "Playback history tracking",
                  genre_ids: [],
                  popularity: 1,
                  vote_average: item.progressPercent / 10,
                  vote_count: 1
                };

                return (
                  <div key={item.mediaId} className="relative group/history shrink-0 w-36 md:w-44">
                    <div className="h-48 md:h-56 rounded-lg overflow-hidden relative border border-neutral-850 hover:border-[#e50914] transition-all duration-300 cursor-pointer bg-[#101115] shadow-lg">
                      <img
                        src={item.posterPath ? `https://image.tmdb.org/t/p/w185${item.posterPath}` : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=150"}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/65 group-hover/history:bg-black/50 transition-colors flex flex-col justify-end p-3">
                        <span className="text-[9px] bg-[#e50914]/15 border border-[#e50914]/30 text-white px-2 py-0.5 rounded w-fit font-bold mb-1 uppercase tracking-wider">
                          {item.mediaType === "tv" ? "TV Show" : "Movie"}
                        </span>
                        
                        <h4 className="text-[11px] font-bold text-white tracking-tight line-clamp-1 mb-0.5 font-sans">
                          {item.title}
                        </h4>

                        {item.lastSeason && (
                          <span className="text-[10px] text-neutral-400 block font-medium">
                            S{item.lastSeason} Ep {item.lastEpisode}
                          </span>
                        )}

                        {/* Progress Bar resembling premium streaming interface */}
                        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-[#e50914] rounded-full shadow-[0_0_6px_rgba(229,9,20,0.6)]"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Resume Button on hover */}
                    <button
                      id={`btn-resume-history-${item.mediaId}`}
                      onClick={() => startPlayback(dummyMedia)}
                      className="absolute inset-0 bg-black/75 opacity-0 group-hover/history:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-lg cursor-pointer"
                    >
                      <span className="flex items-center gap-1 bg-[#e50914] hover:bg-[#b80710] text-white text-[10px] font-black py-2 px-4 rounded-lg shadow-lg transition-colors uppercase tracking-wider">
                        Resume
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories carousels */}
        {activeTab === "home" && (
          <>
            <MovieCarousel
              title="Trending Now"
              items={trendingMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Popular TV Shows"
              items={popularTV}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "tv")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Sci-Fi & Fantasy"
              items={scifiMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Action Hits"
              items={actionMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Horror & Thriller"
              items={horrorMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </>
        )}

        {activeTab === "movies" && (
          <>
            <MovieCarousel
              title="Trending Movies"
              items={trendingMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Action Movies"
              items={actionMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Sci-Fi Movies"
              items={scifiMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
            <MovieCarousel
              title="Horror Movies"
              items={horrorMovies}
              watchlist={watchlistMediaIds}
              onSelect={(i) => fetchFullDetails(i.id, "movie")}
              onPlay={startPlayback}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </>
        )}

        {activeTab === "series" && (
          <MovieCarousel
            title="Television Series"
            items={popularTV}
            watchlist={watchlistMediaIds}
            onSelect={(i) => fetchFullDetails(i.id, "tv")}
            onPlay={startPlayback}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}
      </div>
    );
  };

  // Render My List View
  const renderWatchlistView = () => {
    if (watchlist.length === 0) {
      return (
        <div className="px-4 md:px-12 py-24 text-center max-w-md mx-auto">
          <Bookmark className="w-12 h-12 mx-auto text-neutral-600 stroke-1 mb-4" />
          <h2 className="font-sans text-sm font-black text-neutral-400 uppercase tracking-widest mb-2">
            Your List is Empty
          </h2>
          <p className="text-xs text-neutral-500">
            Save movies and TV shows and find them here easily anytime.
          </p>
          <button
            id="btn-return-home-watchlist"
            onClick={() => setActiveTab("home")}
            className="mt-6 font-bold text-xs text-[#e50914] border border-[#e50914]/20 hover:border-[#e50914] px-5 py-2.5 rounded uppercase tracking-wider transition-all duration-300 hover:bg-[#e50914]/5 cursor-pointer tv-focusable"
          >
            Explore Titles
          </button>
        </div>
      );
    }

    return (
      <div id="watchlist-grid-view" className="px-4 md:px-12 py-8 text-left">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-8">
          <h2 className="text-lg font-black text-white tracking-tight uppercase">
            My List
          </h2>
          <button
            id="btn-clear-complete-watchlist"
            onClick={handleClearWatchlist}
            className="text-[10px] uppercase font-black text-neutral-400 hover:text-white bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 px-3.5 py-1.5 rounded transition-colors cursor-pointer tv-focusable"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
          {watchlist.map((w) => {
            const dummyMedia: MediaItem = {
              id: w.mediaId,
              title: w.mediaType === "movie" ? w.title : undefined,
              name: w.mediaType === "tv" ? w.title : undefined,
              poster_path: w.posterPath,
              backdrop_path: w.backdropPath,
              media_type: w.mediaType,
              overview: "Your saved listing.",
              genre_ids: [],
              popularity: 1,
              vote_average: w.voteAverage,
              vote_count: 1,
              release_date: w.mediaType === "movie" ? w.releaseDate : undefined,
              first_air_date: w.mediaType === "tv" ? w.releaseDate : undefined
            };

            return (
              <MovieCard
                key={w.mediaId}
                item={dummyMedia}
                isInWatchlist={watchlistMediaIds.includes(w.mediaId)}
                onSelect={(i) => fetchFullDetails(i.id, i.media_type || "movie")}
                onPlay={startPlayback}
                onToggleWatchlist={handleToggleWatchlist}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Render History View
  const renderHistoryView = () => {
    if (watchHistory.length === 0) {
      return (
        <div className="px-4 md:px-12 py-24 text-center max-w-md mx-auto">
          <History className="w-12 h-12 mx-auto text-neutral-600 stroke-1 mb-4" />
          <h2 className="font-sans text-sm font-black text-neutral-400 uppercase tracking-widest mb-2">
            No Watch History
          </h2>
          <p className="text-xs text-neutral-500">
            Start playing films or TV broadcasts to list your content log here.
          </p>
        </div>
      );
    }

    return (
      <div id="history-logs-terminal" className="px-4 md:px-12 py-8 max-w-4xl mx-auto text-left">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-8">
          <h2 className="text-lg font-black text-white tracking-tight uppercase">
            Watch History
          </h2>
          <button
            id="btn-clear-complete-history-full"
            onClick={handleClearHistory}
            className="text-[10px] uppercase font-black text-neutral-400 hover:text-white bg-neutral-850 border border-neutral-800 px-3.5 py-1.5 rounded transition-colors cursor-pointer tv-focusable"
          >
            Clear History Logs
          </button>
        </div>

        <div className="space-y-4">
          {watchHistory.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString();
            const dummyMedia: MediaItem = {
              id: item.mediaId,
              title: item.mediaType === "movie" ? item.title : undefined,
              name: item.mediaType === "tv" ? item.title : undefined,
              poster_path: item.posterPath,
              backdrop_path: null,
              media_type: item.mediaType,
              overview: "History reference coordinate logs",
              genre_ids: [],
              popularity: 1,
              vote_average: item.progressPercent / 10,
              vote_count: 1
            };

            return (
              <div
                key={item.mediaId}
                className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-neutral-850 bg-[#111216]/65 hover:border-neutral-700 rounded-lg transition-all duration-200 text-left"
              >
                <div className="w-12 shrink-0 aspect-[2/3] rounded-md overflow-hidden bg-neutral-900 border border-neutral-800">
                  <img
                    src={item.posterPath ? `https://image.tmdb.org/t/p/w185${item.posterPath}` : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=150"}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                      {item.progressPercent}% Watched
                    </span>
                    
                    <span className="text-[9px] uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-bold">
                      {item.mediaType === "tv" ? "TV Show" : "Movie"}
                    </span>
                  </div>
                  
                  <h3 className="text-xs sm:text-sm font-black text-white mt-2 truncate uppercase tracking-tight">
                    {item.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-neutral-500 font-medium">
                    {item.lastSeason && (
                      <span>Season {item.lastSeason}, Episode {item.lastEpisode}</span>
                    )}
                    <span>Last stream: {dateStr}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-history-play-${item.mediaId}`}
                    onClick={() => startPlayback(dummyMedia)}
                    className="bg-[#e50914] hover:bg-[#b80710] text-white px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer tv-focusable"
                  >
                    Resume
                  </button>
                  
                  <button
                    id={`btn-history-delete-${item.mediaId}`}
                    onClick={() => {
                      if (!currentUser) return;
                      const updated = watchHistory.filter((h) => h.mediaId !== item.mediaId);
                      setWatchHistory(updated);
                      localStorage.setItem(`pepflick_history_${currentUser.username}`, JSON.stringify(updated));
                    }}
                    className="border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500 px-3 py-1.5 rounded text-xs uppercase font-bold transition-colors cursor-pointer tv-focusable"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-[#08090c] text-white flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-t-transparent border-[#e50914] rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-extrabold tracking-widest uppercase">Securing Connection...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem("pf_username", user.username);
          localStorage.setItem("pf_key", user.key);
          localStorage.setItem("pepflick_session", JSON.stringify(user));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#08090c] text-white">
      
      {/* Upper Error Banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#e50914] py-2.5 px-4 text-center text-xs font-semibold text-white relative z-50 flex items-center justify-center gap-2 shadow"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Community & Support Header Bar */}
      <div className="bg-[#050608] border-b border-neutral-900 px-4 md:px-12 py-2 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-wider font-extrabold z-50">
        <div className="flex items-center gap-3">
          <a
            id="btn-support-dev"
            href="https://paypal.me/pepcolaa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-black px-3 py-1 rounded transition-all duration-150 cursor-pointer shadow-sm tv-focusable"
          >
            Support developer Pepsi <Heart className="w-3 h-3 text-black fill-current inline" />
          </a>
        </div>

        <div className="flex items-center gap-2.5 relative">
          <a
            id="btn-discord-invite"
            href="https://discord.gg/pepflicks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded transition-all duration-150 cursor-pointer shadow-sm tv-focusable"
          >
            <MessagesSquare className="w-3.5 h-3.5" />
            Discord Community
          </a>

          {/* Info dropdown launcher */}
          <div className="relative">
            <button
              id="btn-info-dropdown-toggle"
              onClick={() => setShowInfoDropdown(!showInfoDropdown)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#111216] hover:bg-neutral-850 text-neutral-300 hover:text-white rounded transition-all duration-150 cursor-pointer border border-neutral-800 tv-focusable"
            >
              <Info className="w-3.5 h-3.5" />
              Info
            </button>

            {/* Absolute info dropdown panel */}
            <AnimatePresence>
              {showInfoDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-[#111216] border border-neutral-800 rounded-lg shadow-2xl p-4 z-50 text-left cursor-default text-neutral-300 normal-case tracking-normal"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2.5 pb-1.5 border-b border-neutral-800">
                    How to Use Pep Flick
                  </h4>
                  <ul className="space-y-3 text-[11px] leading-relaxed font-medium">
                    <li className="flex gap-2 items-start">
                      <span className="text-[#e50914] font-bold">🎬</span>
                      <span><strong className="text-white">Watch Content:</strong> Hover over or click any movie/show card, then click <span className="text-[#e50914] font-semibold">Watch</span> to launch the high-quality inline player.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-amber-400 font-bold">🔍</span>
                      <span><strong className="text-white">Instant Search:</strong> Type in the search input to instantly discover movies or series in our database.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-green-500 font-bold">🍿</span>
                      <span><strong className="text-white">Resume Playback:</strong> Every series or movie watch progress is automatically logged. Simply click "Resume" in your continue row to pick up where you left off.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-blue-400 font-bold">➕</span>
                      <span><strong className="text-white">My List:</strong> Save the movies or TV series you want to track by clicking the bookmark/watchlist buttons.</span>
                    </li>
                  </ul>
                  <button
                    id="btn-info-dropdown-close"
                    onClick={() => setShowInfoDropdown(false)}
                    className="mt-4 w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer tv-focusable"
                  >
                    Got it!
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <nav id="satellite-nav-node" className="sticky top-0 z-40 bg-[#08090c]/95 border-b border-neutral-900 backdrop-blur-md py-4 px-4 md:px-12 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Brand */}
        <div
          onClick={() => {
            setActiveTab("home");
            setIsSearching(false);
            setSearchQuery("");
            setSelectedBrand(null);
          }}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <span className="font-sans font-black text-2.5xl tracking-tight text-[#e50914] uppercase select-none transition-transform active:scale-95 duration-150">
            PEP<span className="text-white">FLICK</span>
            <span className="text-amber-500 text-3xl font-light leading-none align-middle ml-0.5 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">+</span>
          </span>
        </div>

        {/* Tab Controls */}
        <div id="nav-terminals" className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-neutral-900 max-w-full overflow-x-auto scrollbar-none">
          {[
            { tag: "home", label: "Home" },
            { tag: "movies", label: "Movies" },
            { tag: "series", label: "TV Shows" },
            { tag: "watchlist", label: "My List" },
            { tag: "history", label: "History" },
          ].map((tab) => {
            const isTabActive = activeTab === tab.tag && !isSearching;
            return (
              <button
                key={tab.tag}
                id={`btn-nav-tab-${tab.tag}`}
                onClick={() => {
                  setActiveTab(tab.tag as any);
                  setIsSearching(false);
                  setSearchQuery("");
                  setSelectedBrand(null);
                }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-150 shrink-0 cursor-pointer tv-focusable ${
                  isTabActive
                    ? "bg-[#e50914] text-white shadow shadow-[#e50914]/30 border border-[#e50914]/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Field & User Profile Controls */}
        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-input-field"
              type="text"
              placeholder="Search movies, shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111216] border border-neutral-800 focus:border-[#e50914] focus:outline-none rounded-lg py-1.5 pl-9 pr-8 text-xs text-white placeholder-neutral-500 transition-all focus:ring-1 focus:ring-[#e50914]/20 h-9 tv-focusable"
            />
            {searchQuery && (
              <button
                id="btn-search-clear-input"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer tv-focusable"
              >
                ✖
              </button>
            )}
          </div>

          {/* User Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-3 shrink-0 border-l border-neutral-800 pl-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e50914] text-white flex items-center justify-center font-extrabold text-sm shadow select-none uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-neutral-300 font-bold hidden md:inline max-w-[90px] truncate leading-none">
                    {currentUser.name}
                  </span>
                  {currentUser.expire && (
                    <span className="text-[8.5px] text-neutral-500 hidden md:inline leading-none mt-1">
                      Exp: {currentUser.expire}
                    </span>
                  )}
                </div>
              </div>
              <button
                id="btn-nav-logout"
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem("pepflick_session");
                  localStorage.removeItem("pf_username");
                  localStorage.removeItem("pf_key");
                }}
                className="p-1.5 text-neutral-400 hover:text-[#e50914] hover:bg-[#e50914]/10 rounded-lg transition-all cursor-pointer tv-focusable"
                title="Log out of PepFlick"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Embedded Theater Stream */}
      <div ref={theaterRef}>
        <AnimatePresence>
          {activePlayerItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {(() => {
                const savedHistoryItem = watchHistory.find((h) => h.mediaId === activePlayerItem.id);
                return (
                  <VideoPlayer
                    item={activePlayerItem}
                    onClose={() => setActivePlayerItem(null)}
                    onUpdateHistory={handleUpdateHistory}
                    initialSeason={savedHistoryItem?.lastSeason}
                    initialEpisode={savedHistoryItem?.lastEpisode}
                  />
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Featured Banner Display */}
      {!loading && !errorMsg && !isSearching && activeTab === "home" && spotlightItem && (
        <div
          id="spotlight-hero-banner"
          className="relative w-full aspect-[21/9] min-h-[380px] md:min-h-[460px] flex items-end p-6 md:p-14 overflow-hidden"
        >
          {/* Backdrop back-plate */}
          <div className="absolute inset-0 z-0">
            <img
              src={
                spotlightItem.backdrop_path
                  ? `https://image.tmdb.org/t/p/original${spotlightItem.backdrop_path}`
                  : "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200"
              }
              alt={spotlightItem.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Dark mask transitions */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/45 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#08090c] via-[#08090c]/30 to-transparent hidden md:block" />
          </div>

          <div className="max-w-2xl relative z-10 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 text-[9px] uppercase font-black bg-[#e50914] text-white px-2.5 py-0.5 rounded shadow">
                <Sparkles className="w-3 h-3 fill-white stroke-none shrink-0" />
                Featured Selection
              </span>
              <span className="text-[11px] text-neutral-300 font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                {(spotlightItem.release_date || spotlightItem.first_air_date || "2026").substring(0, 4)}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-5.5xl font-extrabold text-white tracking-tight leading-tight uppercase mb-3">
              {spotlightItem.title || spotlightItem.name}
            </h1>

            {spotlightItem.tagline && (
              <p className="text-xs md:text-sm text-neutral-300 mt-1 mb-3.5 italic leading-relaxed">
                &ldquo;{spotlightItem.tagline}&rdquo;
              </p>
            )}

            <p className="text-xs md:text-sm text-neutral-300 leading-relaxed font-sans mb-6 line-clamp-3 md:line-clamp-4 max-w-xl font-medium">
              {spotlightItem.overview}
            </p>

            {/* Quick Play & Details Actions */}
            <div id="spotlight-actions" className="flex flex-wrap items-center gap-3">
              <button
                id="btn-play-spotlight"
                onClick={() => startPlayback(spotlightItem)}
                className="flex items-center gap-1.5 bg-white text-black hover:bg-[#e50914] hover:text-white px-6 py-2.5 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg tv-focusable"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Now
              </button>

              <button
                id="btn-info-spotlight"
                onClick={() => setSelectedDetailsItem(spotlightItem)}
                className="flex items-center gap-1.5 border border-neutral-700 bg-black/40 hover:bg-neutral-900 hover:border-[#e50914] text-white px-5 py-2.5 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer tv-focusable"
              >
                More Info
              </button>

              <button
                id="btn-watchlist-spotlight"
                onClick={() => handleToggleWatchlist(spotlightItem)}
                className={`p-2.5 rounded-lg border transition-all duration-200 cursor-pointer tv-focusable ${
                  watchlistMediaIds.includes(spotlightItem.id)
                    ? "bg-[#e50914] border-[#e50914] text-white"
                    : "border-neutral-700 bg-black/40 hover:border-[#e50914] text-neutral-200"
                }`}
                title="Save to watchlist"
              >
                <Bookmark className={`w-4 h-4 ${watchlistMediaIds.includes(spotlightItem.id) ? "fill-white text-white" : "fill-transparent"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Pages */}
      <main className="flex-1 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e50914] border-t-transparent mb-4" />
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-black animate-pulse">
              Loading PepFlick catalog...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <AlertCircle className="w-12 h-12 text-[#e50914] mb-3" />
            <h2 className="text-lg font-bold text-white text-center">
              Catalog Connection Interrupted
            </h2>
            <p className="text-sm text-neutral-300 mt-2 text-center max-w-sm leading-relaxed">
              {errorMsg}
            </p>
            <button
              id="btn-retry-feed"
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-[#111216] border border-neutral-800 hover:border-[#e50914] text-white hover:text-[#e50914] rounded-md text-xs font-bold transition-colors cursor-pointer uppercase tracking-wider shadow-lg"
            >
              Retry Connection
            </button>
          </div>
        ) : activeTab === "watchlist" ? (
          renderWatchlistView()
        ) : activeTab === "history" ? (
          renderHistoryView()
        ) : (
          renderHomeFeeds()
        )}
      </main>

      {/* Detail Overlay modal */}
      <AnimatePresence>
        {selectedDetailsItem && (
          <DetailModal
            item={selectedDetailsItem}
            onClose={() => setSelectedDetailsItem(null)}
            onPlay={startPlayback}
            watchlist={watchlistMediaIds}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectSimilar={(similarItem) => {
              const similarType = similarItem.media_type || (similarItem.first_air_date ? "tv" : "movie");
              fetchFullDetails(similarItem.id, similarType);
            }}
          />
        )}
      </AnimatePresence>

      <footer className="border-t border-neutral-900 bg-[#050608] py-12 px-4 md:px-12 text-center text-neutral-500 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <p className="text-base font-black text-[#e50914] uppercase tracking-wider">
              PEP<span className="text-white">FLICK</span><span className="text-amber-400 font-light ml-0.5">+</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed font-medium">This prototype offers premium client-side TMDB catalog searches and streams.</p>
          </div>
          <div className="text-right text-[11px] text-neutral-400 font-medium">
            <p>© 2026. Handcrafted for the ultimate cinematic streaming experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
