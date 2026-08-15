import { useEffect, useRef } from "react";
import { X, Play, Clock, Star, Calendar, Bookmark, Film, ExternalLink } from "lucide-react";
import { MediaItem } from "../types";

interface DetailModalProps {
  item: MediaItem;
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  watchlist: number[];
  onToggleWatchlist: (item: MediaItem) => void;
  onSelectSimilar: (item: MediaItem) => void;
}

export default function DetailModal({
  item,
  onClose,
  onPlay,
  watchlist,
  onToggleWatchlist,
  onSelectSimilar,
}: DetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside of the modal content
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  useEffect(() => {
    // Disable main body scrolling when modal is active
    document.body.style.overflow = "hidden";
    
    // Auto-focus the Play button when modal opens for TV remote compatibility
    setTimeout(() => {
      if (playButtonRef.current) {
        playButtonRef.current.focus();
      }
    }, 150);

    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const title = item.title || item.name || "Untitled Production";
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : "2026";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "0.0";
  const mediaType = item.first_air_date ? "tv" : "movie";
  const isInWatchlist = watchlist.includes(item.id);

  // Match rating percentage
  const matchPercentage = item.vote_average 
    ? Math.min(100, Math.round(item.vote_average * 10 + 20)) 
    : 85;

  // Images fallbacks
  const backdropUrl = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop";

  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=342&auto=format&fit=crop";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Outer Modal Container Card */}
      <div
        ref={modalRef}
        id="detail-modal-container"
        className="relative bg-[#0e0f12] text-white rounded-xl overflow-hidden max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl transition-all duration-300 border border-neutral-800"
      >
        {/* Banner Splash backdrop with gradient cut */}
        <div className="relative aspect-[16/9] w-full">
          <img
            src={backdropUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {/* Gradients to blend seamless dark look */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f12] via-[#0e0f12]/60 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0e0f12] to-transparent hidden md:block" />

          {/* Close Trigger Button */}
          <button
            id="btn-close-modal-upper"
            onClick={onClose}
            className="absolute top-4 right-4 bg-[#0e0f12]/90 hover:bg-[#e50914] text-white p-2.5 rounded-full transition-all duration-200 z-20 shadow-lg border border-neutral-800 cursor-pointer tv-focusable"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Information Block */}
        <div className="px-6 md:px-10 pb-10 relative z-10 -mt-12 md:-mt-20">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Floating Poster */}
            <div className="w-28 md:w-36 shrink-0 rounded-lg overflow-hidden border border-neutral-800 shadow-2xl self-center md:self-auto bg-neutral-900 hidden sm:block">
              <img
                src={posterUrl}
                alt={title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Core Info Info */}
            <div className="flex-1 text-left">
              {/* Media type badge */}
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="text-[11px] font-bold text-green-500">
                  {matchPercentage}% Match
                </span>

                <span className="text-[11px] uppercase font-bold text-neutral-300 bg-neutral-800/80 px-2.5 py-0.5 rounded">
                  {mediaType === "tv" ? "TV Series" : "Movie"}
                </span>

                {item.status && (
                  <span className="text-[11px] uppercase font-bold text-neutral-300 bg-neutral-800/80 px-2.5 py-0.5 rounded">
                    {item.status}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2 uppercase">
                {title}
              </h1>

              {item.tagline && (
                <p className="text-xs md:text-sm text-neutral-400 italic mb-4 leading-relaxed">
                  &ldquo;{item.tagline}&rdquo;
                </p>
              )}

              {/* Data Specifications Array */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mb-6 text-xs text-neutral-300 font-semibold">
                {/* Year */}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  {releaseYear}
                </span>

                {/* Rating */}
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-500 stroke-none" />
                  {rating || "N/A"}
                </span>

                {/* Duration details */}
                {mediaType === "movie" && item.runtime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    {item.runtime} mins
                  </span>
                )}

                {mediaType === "tv" && (
                  <span className="flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-neutral-400" />
                    {item.number_of_seasons} Seasons • {item.number_of_episodes} Episodes
                  </span>
                )}
              </div>

              {/* Action Rows */}
              <div id="modal-actions-panel" className="flex flex-wrap gap-3 mb-6">
                <button
                  id="btn-play-modal"
                  ref={playButtonRef}
                  onClick={() => {
                    onPlay(item);
                    onClose();
                  }}
                  className="flex items-center gap-2 bg-[#e50914] hover:bg-[#b80710] text-white px-5 py-2 rounded font-extrabold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer tv-focusable"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play
                </button>

                <button
                  id="btn-watchlist-modal"
                  onClick={() => onToggleWatchlist(item)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all border cursor-pointer tv-focusable ${
                    isInWatchlist
                      ? "bg-[#e50914] border-[#e50914] text-white"
                      : "bg-[#101115] border-neutral-750 hover:border-[#e50914] text-neutral-300"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-current" : ""}`} />
                  {isInWatchlist ? "In My List" : "My List"}
                </button>

                {/* IMDb Official Redirect Link */}
                {item.external_ids?.imdb_id && (
                  <a
                    id="link-imdb-external"
                    href={`https://www.imdb.com/title/${item.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#14151a] hover:bg-neutral-800 text-amber-400 px-4 py-2 rounded font-bold text-xs tracking-wide transition-all border border-neutral-750 tv-focusable"
                  >
                    <span>IMDb</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Synopsis Details */}
              <div className="mb-6">
                <p className="text-xs md:text-sm text-neutral-200 leading-relaxed max-w-2xl font-normal">
                  {item.overview || "No description available for this cinematic production."}
                </p>
              </div>
            </div>
          </div>

          {/* Cast Members Grid */}
          {item.credits && item.credits.cast && item.credits.cast.length > 0 && (
            <div className="mt-8 border-t border-neutral-850 pt-6">
              <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider mb-4">
                Cast
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3 pr-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {item.credits.cast.slice(0, 8).map((actor) => {
                  const actorImage = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop";
                  
                  return (
                    <div
                      key={actor.id}
                      className="flex-none w-20 text-center group"
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden mx-auto border border-neutral-800 group-hover:border-[#e50914] transition-colors bg-neutral-900 shadow-md">
                        <img
                          src={actorImage}
                          alt={actor.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="text-neutral-200 text-[11px] font-bold mt-2 truncate">
                        {actor.name}
                      </h4>
                      <p className="text-[9px] text-neutral-500 truncate mt-0.5">
                        {actor.character || "Actor"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Similar Items / Related Media Selection */}
          {item.similar && item.similar.results && item.similar.results.length > 0 && (
            <div className="mt-8 border-t border-neutral-850 pt-6">
              <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider mb-4">
                More Like This
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {item.similar.results.slice(0, 8).map((similarItem) => {
                  const sTitle = similarItem.title || similarItem.name || "Untitled";
                  const sYear = (similarItem.release_date || similarItem.first_air_date || "").substring(0, 4);
                  const sPoster = similarItem.poster_path
                    ? `https://image.tmdb.org/t/p/w185${similarItem.poster_path}`
                    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=150&auto=format&fit=crop";

                  return (
                    <button
                      key={similarItem.id}
                      id={`btn-similar-${similarItem.id}`}
                      onClick={() => onSelectSimilar(similarItem)}
                      className="flex-none w-20 text-left group tv-focusable rounded p-1"
                    >
                      <div className="w-20 aspect-[2/3] rounded overflow-hidden border border-neutral-800 group-hover:border-[#e50914] transition-all bg-neutral-950">
                        <img
                          src={sPoster}
                          alt={sTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-[10px] font-bold text-neutral-200 truncate mt-1.5 group-hover:text-[#e50914] transition-colors leading-tight">
                        {sTitle}
                      </h4>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">
                        {sYear || "2026"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
