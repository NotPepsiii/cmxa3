import React, { useState, useEffect, useRef } from "react";
import { X, ListVideo, Shield, ArrowRight, Play, Check, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem, WatchHistoryItem } from "../types";
import { smartFetch } from "../api";

interface VideoPlayerProps {
  item: MediaItem;
  onClose: () => void;
  onUpdateHistory: (history: WatchHistoryItem) => void;
  initialSeason?: number;
  initialEpisode?: number;
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

export default function VideoPlayer({
  item,
  onClose,
  onUpdateHistory,
  initialSeason,
  initialEpisode,
}: VideoPlayerProps) {
  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);

  // Custom playback simulator state variables for Play Next popup functionality
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPopupDismissed, setIsPopupDismissed] = useState<boolean>(false);

  // Pagination and TV navigation state
  const [episodePage, setEpisodePage] = useState<number>(0);
  const episodesPerPage = 6;

  // Reset episodePage when season changes
  useEffect(() => {
    setEpisodePage(0);
  }, [currentSeason]);

  // Auto-page when currentEpisode changes so the active episode is always visible
  useEffect(() => {
    const epIndex = episodes.findIndex(e => e.episode_number === currentEpisode);
    if (epIndex !== -1) {
      setEpisodePage(Math.floor(epIndex / episodesPerPage));
    }
  }, [currentEpisode, episodes]);

  // Get current episode's runtime if available, otherwise general run_time from show, otherwise default to 45 minutes
  const currentEpisodeDetails = episodes.find(e => e.episode_number === currentEpisode);
  const runtimeMinutes = currentEpisodeDetails?.runtime || ((item as any).episode_run_time && (item as any).episode_run_time[0]) || item.runtime || 45;
  const duration = runtimeMinutes * 60; // Convert to seconds (dynamic duration!)

  // Reset playback simulator on episode/season change
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(true);
    setIsPopupDismissed(false);
  }, [currentEpisode, currentSeason]);
  
  const title = item.title || item.name || "Unknown title";
  const tmdbId = item.id;
  const isShow = item.first_air_date !== undefined;

  // Track episode changes to save watch history
  useEffect(() => {
    const historyItem: WatchHistoryItem = {
      mediaId: item.id,
      title: item.title || item.name || "Untitled",
      posterPath: item.poster_path,
      mediaType: isShow ? "tv" : "movie",
      timestamp: Date.now(),
      progressPercent: isShow 
        ? Math.round((currentEpisode / Math.max(1, item.number_of_episodes || 10)) * 100) 
        : 10,
      lastSeason: isShow ? currentSeason : undefined,
      lastEpisode: isShow ? currentEpisode : undefined,
    };
    onUpdateHistory(historyItem);
  }, [currentSeason, currentEpisode, item]);

  // Fetch episodes when season or show changes
  useEffect(() => {
    if (isShow) {
      fetchSeasonEpisodes(currentSeason);
    }
  }, [currentSeason, item]);

  const fetchSeasonEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    setEpisodeError(null);
    try {
      const response = await smartFetch(`/api/tv/${tmdbId}/season/${seasonNum}`);
      if (!response.ok) {
        throw new Error("Failed to load episodes.");
      }
      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (err: any) {
      console.error("Error fetching season episodes:", err);
      setEpisodeError("Failed to load episodes. Please check your connection or try again.");
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Generate Stream URLs
  const getEmbedUrl = () => {
    if (isShow) {
      return `https://embedmaster.link/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
    } else {
      return `https://embedmaster.link/movie/${tmdbId}`;
    }
  };

  const currentEpisodeName = currentEpisodeDetails?.name;

  // Next episode / Next season calculation
  const hasNextEpisode = isShow && episodes.some(e => e.episode_number === currentEpisode + 1);
  const nextEpisodeItem = isShow ? episodes.find(e => e.episode_number === currentEpisode + 1) : null;
  const hasNextSeason = isShow && !hasNextEpisode && (item.number_of_seasons ? currentSeason < item.number_of_seasons : false);

  const handlePlayNextEpisode = () => {
    if (hasNextEpisode) {
      setCurrentEpisode(currentEpisode + 1);
    } else if (hasNextSeason) {
      setCurrentSeason(currentSeason + 1);
      setCurrentEpisode(1);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            if (timer) clearInterval(timer);
            if (isShow && (hasNextEpisode || hasNextSeason)) {
              handlePlayNextEpisode();
            }
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isShow, hasNextEpisode, hasNextSeason, duration]);

  const remainingTime = duration - currentTime;
  const showPopup = isShow && (hasNextEpisode || hasNextSeason) && remainingTime <= 45 && remainingTime > 0 && !isPopupDismissed;

  useEffect(() => {
    if (showPopup) {
      const popupBtn = document.getElementById("btn-popup-play-next");
      if (popupBtn) {
        popupBtn.focus();
      }
    }
  }, [showPopup]);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.max(0, Math.min(1, clickX / width));
    setCurrentTime(Math.round(clickPercent * duration));
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="bg-[#0c0d10] border-b border-neutral-900 py-8 px-4 md:px-12 relative text-left">
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Block with Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase text-[#e50914] tracking-widest font-black bg-[#e50914]/10 px-2 py-0.5 rounded">
                Streaming Player
              </span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              {title}
            </h2>
            
            {isShow && (
              <p className="text-xs text-neutral-400 mt-1">
                Now Playing: <span className="text-white font-semibold">Season {currentSeason}, Episode {currentEpisode}</span>
                {currentEpisodeName ? ` — “${currentEpisodeName}”` : ""}
              </p>
            )}
          </div>

          <div id="player-headers-actions" className="flex items-center gap-2.5">
            <a
              id="btn-ad-blocker"
              href="https://ublockorigin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#e50914] hover:bg-[#b80710] text-white transition-all text-xs font-bold shadow-md cursor-pointer uppercase tracking-wider tv-focusable"
              title="Highly Recommended: Install uBlock Origin to block video player ads"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Ad Blocker</span>
            </a>

            <button
              id="btn-close-theater-node"
              onClick={onClose}
              className="flex items-center justify-center w-8.5 h-8.5 rounded-full border border-neutral-800 hover:border-[#e50914] hover:bg-[#e50914]/10 text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer tv-focusable"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Outer Frame with Glowing Shadow Case */}
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-neutral-900 shadow-2xl">
          {/* Active Broadcast Frame */}
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-neutral-950"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            scrolling="no"
          />

          {/* PLAY NEXT POP-UP OVERLAY (Netflix/Disney+ Style) */}
          {showPopup && (
            <div 
              id="play-next-popup-container"
              className="absolute bottom-6 right-6 bg-[#0e0f12]/95 border border-neutral-800 rounded-xl p-4 w-80 shadow-2xl z-30 flex flex-col gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-black text-[#e50914] tracking-widest block mb-0.5">
                    Up Next in {remainingTime}s
                  </span>
                  <h4 className="text-xs font-extrabold text-white line-clamp-1">
                    {hasNextEpisode 
                      ? `Season ${currentSeason}, Episode ${currentEpisode + 1}`
                      : `Season ${currentSeason + 1}, Episode 1`
                    }
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1 italic">
                    {hasNextEpisode && nextEpisodeItem?.name ? `“${nextEpisodeItem.name}”` : "Next Chapter"}
                  </p>
                </div>

                <div className="p-1.5 bg-[#e50914]/10 rounded-lg shrink-0">
                  <Play className="w-4 h-4 text-[#e50914] fill-current" />
                </div>
              </div>

              {/* Action buttons with clear TV spatial focus class */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  id="btn-popup-play-next"
                  onClick={handlePlayNextEpisode}
                  className="flex items-center justify-center gap-1 bg-[#e50914] hover:bg-[#b80710] text-white py-2 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer tv-focusable shadow-md"
                >
                  Play Next
                  <ArrowRight className="w-3 h-3" />
                </button>
                
                <button
                  id="btn-popup-dismiss-next"
                  onClick={() => setIsPopupDismissed(true)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer tv-focusable border border-neutral-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Up Next Controller Block */}
        {isShow && (hasNextEpisode || hasNextSeason) && (
          <div className="mt-4 bg-[#111216] border border-neutral-850 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e50914]/10 rounded-lg shrink-0">
                <Play className="w-5 h-5 text-[#e50914] fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Up Next</span>
                  <span className="text-neutral-700 font-extrabold">•</span>
                  <button
                    onClick={() => {
                      setCurrentTime(duration - 50);
                      setIsPlaying(true);
                      setIsPopupDismissed(false);
                    }}
                    className="text-[9px] uppercase font-black text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 px-1.5 py-0.5 rounded transition-all cursor-pointer tv-focusable"
                    title="Simulate reaching the last 45 seconds of the episode"
                  >
                    ⚡ Demo Popup
                  </button>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5 leading-snug">
                  {hasNextEpisode 
                    ? `Season ${currentSeason}, Episode ${currentEpisode + 1}${nextEpisodeItem?.name ? ` — “${nextEpisodeItem.name}”` : ""}`
                    : `Season ${currentSeason + 1}, Episode 1`
                  }
                </h4>
              </div>
            </div>

            <button
              id="btn-play-next-episode"
              onClick={handlePlayNextEpisode}
              className="flex items-center justify-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white px-5 py-2 rounded font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer tv-focusable"
            >
              <span>Play Next Episode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TV Series Episode Drawer and Season Controller */}
        {isShow && (
          <div className="mt-6 bg-[#111216] border border-neutral-850 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ListVideo className="text-[#e50914] w-4.5 h-4.5" />
                <h3 className="text-xs font-black tracking-wider text-neutral-200 uppercase">
                  Episode Guide
                </h3>
              </div>

              {/* Season Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1.5">Season</span>
                
                {/* Previous Season Button */}
                <button
                  id="btn-season-prev"
                  disabled={currentSeason <= 1}
                  onClick={() => {
                    if (currentSeason > 1) {
                      setCurrentSeason(currentSeason - 1);
                      setCurrentEpisode(1);
                    }
                  }}
                  className={`p-1.5 rounded text-xs font-bold border transition-all duration-150 cursor-pointer tv-focusable flex items-center justify-center ${
                    currentSeason <= 1
                      ? "opacity-40 cursor-not-allowed bg-[#0d0e12] border-neutral-900 text-neutral-600"
                      : "bg-[#16171d] border-neutral-800 text-neutral-300 hover:border-neutral-500 hover:text-white"
                  }`}
                  title="Previous Season"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: item.number_of_seasons || 1 }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    id={`btn-season-${sNum}`}
                    onClick={() => {
                      setCurrentSeason(sNum);
                      setCurrentEpisode(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-all duration-150 cursor-pointer tv-focusable ${
                      currentSeason === sNum
                        ? "bg-[#e50914] border-[#e50914] text-white shadow-md"
                        : "bg-[#16171d] border-neutral-800 text-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    S{sNum}
                  </button>
                ))}

                {/* Next Season Button */}
                <button
                  id="btn-season-next"
                  disabled={currentSeason >= (item.number_of_seasons || 1)}
                  onClick={() => {
                    if (currentSeason < (item.number_of_seasons || 1)) {
                      setCurrentSeason(currentSeason + 1);
                      setCurrentEpisode(1);
                    }
                  }}
                  className={`p-1.5 rounded text-xs font-bold border transition-all duration-150 cursor-pointer tv-focusable flex items-center justify-center ${
                    currentSeason >= (item.number_of_seasons || 1)
                      ? "opacity-40 cursor-not-allowed bg-[#0d0e12] border-neutral-900 text-neutral-600"
                      : "bg-[#16171d] border-neutral-800 text-neutral-300 hover:border-neutral-500 hover:text-white"
                  }`}
                  title="Next Season"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Episode Scrolling Container */}
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#e50914] border-t-transparent mb-2" />
                <p className="text-xs text-neutral-400">
                  Loading season episodes...
                </p>
              </div>
            ) : episodeError ? (
              <div className="flex items-center justify-center py-8 text-neutral-400 text-xs text-center border border-dashed border-neutral-800 rounded">
                {episodeError}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {episodes.slice(episodePage * episodesPerPage, (episodePage + 1) * episodesPerPage).map((ep) => {
                    const isActive = ep.episode_number === currentEpisode;
                    const epStill = ep.still_path
                      ? `https://image.tmdb.org/t/p/w185${ep.still_path}`
                      : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=150&auto=format&fit=crop";
                    
                    return (
                      <button
                        key={ep.id}
                        id={`btn-episode-${ep.episode_number}`}
                        onClick={() => setCurrentEpisode(ep.episode_number)}
                        className={`flex flex-col text-left p-3 rounded border transition-all duration-200 cursor-pointer tv-focusable ${
                          isActive
                            ? "bg-[#16171d] border-[#e50914] text-white shadow-lg"
                            : "bg-[#0c0d10] border-neutral-850 hover:bg-[#16171d] hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className="relative shrink-0 w-20 aspect-video rounded overflow-hidden bg-neutral-900">
                            <img
                              src={epStill}
                              alt={ep.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 py-0.5 rounded text-neutral-300">
                              Ep {ep.episode_number}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold line-clamp-1 leading-tight ${isActive ? "text-[#e50914]" : "text-neutral-200"}`}>
                              {ep.name || `Episode ${ep.episode_number}`}
                            </h4>
                            <span className="block text-[10px] text-neutral-500 mt-1">
                              {ep.air_date || ""}
                            </span>
                          </div>
                        </div>
                        
                        {ep.overview && (
                          <p className="text-[10px] text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pagination Controls with Fully Focusable Buttons */}
                {episodes.length > episodesPerPage && (
                  <div className="flex items-center justify-between border-t border-neutral-800/60 mt-4 pt-3.5">
                    <span className="text-[10px] font-bold text-neutral-500">
                      Showing episodes {episodePage * episodesPerPage + 1}–{Math.min((episodePage + 1) * episodesPerPage, episodes.length)} of {episodes.length}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-episodes-prev-page"
                        disabled={episodePage === 0}
                        onClick={() => setEpisodePage(prev => Math.max(0, prev - 1))}
                        className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer tv-focusable flex items-center gap-1 ${
                          episodePage === 0
                            ? "opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-900 text-neutral-600"
                            : "bg-[#16171d] border-neutral-800 text-neutral-300 hover:border-neutral-500 hover:text-white"
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous Page</span>
                      </button>

                      <button
                        id="btn-episodes-next-page"
                        disabled={(episodePage + 1) * episodesPerPage >= episodes.length}
                        onClick={() => setEpisodePage(prev => prev + 1)}
                        className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer tv-focusable flex items-center gap-1 ${
                          (episodePage + 1) * episodesPerPage >= episodes.length
                            ? "opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-900 text-neutral-600"
                            : "bg-[#16171d] border-neutral-800 text-neutral-300 hover:border-neutral-500 hover:text-white"
                        }`}
                      >
                        <span>Next Page</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
