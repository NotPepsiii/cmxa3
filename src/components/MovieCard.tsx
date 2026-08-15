import { useState } from "react";
import { Play, Plus, Check, Info, Star } from "lucide-react";
import { motion } from "motion/react";
import { MediaItem } from "../types";

interface MovieCardProps {
  key?: any;
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCard({
  item,
  onSelect,
  onPlay,
  isInWatchlist,
  onToggleWatchlist,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const title = item.title || item.name || "Untitled Production";
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : "2026";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "0.0";
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");

  // Calculate matching percentage (Netflix/Disney style)
  const matchPercentage = item.vote_average 
    ? Math.min(100, Math.round(item.vote_average * 10 + 20)) 
    : 85;

  // TMDB Image Base URL
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=342&auto=format&fit=crop";

  return (
    <motion.div
      id={`movie-card-${item.id}`}
      tabIndex={0}
      onClick={() => onSelect(item)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="relative flex-none w-40 sm:w-44 md:w-52 h-60 sm:h-64 md:h-76 rounded-lg overflow-hidden group cursor-pointer bg-[#101115] border border-neutral-850 transition-all duration-300 shadow-xl tv-focusable"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        y: -6,
        borderColor: "#e50914",
        boxShadow: "0 12px 24px rgba(0,0,0,0.8), 0 0 12px rgba(229, 9, 20, 0.35)",
      }}
    >
      {/* Background Poster Image */}
      <img
        src={posterUrl}
        alt={title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 scale-100 group-hover:scale-105"
      />

      {/* Elegant Bottom Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />

      {/* Floating Meta Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {/* Rating Badge */}
        <span className="flex items-center gap-1 text-[10px] font-bold bg-[#101115]/95 backdrop-blur-md px-2 py-0.5 rounded text-amber-400 shadow-md border border-neutral-800">
          <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
          {rating}
        </span>
        {/* Media Type Badge */}
        <span className="text-[9px] uppercase font-bold bg-[#101115]/95 backdrop-blur-md px-2 py-0.5 rounded text-neutral-200 tracking-wider shadow-md border border-neutral-800">
          {mediaType === "tv" ? "TV Show" : "Movie"}
        </span>
      </div>

      {/* Hover Control Overlay with pristine spacing and typography */}
      <div className={`absolute inset-0 flex flex-col justify-end p-4 transition-all duration-300 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/95 to-transparent ${isHovered ? "opacity-100" : "opacity-0"}`}>
        {/* Title and Release Info */}
        <h4 className="font-sans text-xs sm:text-sm font-bold tracking-tight text-white mb-1 line-clamp-2 leading-snug">
          {title}
        </h4>
        
        <div className="flex items-center gap-2 mb-3 text-[10px] font-medium text-neutral-300">
          <span className="text-[#e50914] font-bold">{matchPercentage}% Match</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span>{releaseYear}</span>
        </div>

        {/* Action Button Strip */}
        <div id={`card-actions-${item.id}`} className="flex items-center gap-1.5 mt-1">
          {/* Main Play Action */}
          <button
            id={`btn-play-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white text-[11px] font-bold py-1.5 px-3 rounded-md transition-all duration-200 shadow-md cursor-pointer uppercase tracking-wider h-8"
          >
            <Play className="w-3 h-3 fill-current" />
            Watch
          </button>

          {/* Plus Add/Remove Watchlist Action */}
          <button
            id={`btn-watchlist-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-150 cursor-pointer ${
              isInWatchlist 
                ? "bg-[#e50914] text-white border-[#e50914] hover:bg-[#b80710]" 
                : "bg-[#14151a] text-neutral-200 border-neutral-700 hover:border-[#e50914] hover:text-white"
            }`}
            title={isInWatchlist ? "Remove from List" : "Add to My List"}
          >
            {isInWatchlist ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Info Action */}
          <button
            id={`btn-info-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-neutral-750 bg-[#14151a] text-neutral-300 hover:border-[#e50914] hover:text-white transition-colors cursor-pointer"
            title="More Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
