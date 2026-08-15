import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "../types";
import MovieCard from "./MovieCard";

interface MovieCarouselProps {
  title: string;
  items: MediaItem[];
  watchlist: number[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCarousel({
  title,
  items,
  watchlist,
  onSelect,
  onPlay,
  onToggleWatchlist,
}: MovieCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check scroll position to toggle navigation arrows dynamically
  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setShowLeftArrow(el.scrollLeft > 10);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollState, { passive: true });
      checkScrollState();
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScrollState);
      }
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative my-8 px-4 md:px-12 group/carousel">
      {/* Sleek Row Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans text-base md:text-lg font-extrabold tracking-tight text-white/95 hover:text-[#e50914] transition-colors cursor-pointer uppercase">
          {title}
        </h3>
      </div>

      {/* Carousel Body Wrapper */}
      <div className="relative">
        {/* Left Pagination Slider Button */}
        {showLeftArrow && (
          <button
            id={`carousel-left-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleScroll("left")}
            className="absolute left-[-16px] md:left-[-24px] top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 bg-[#14151a]/90 backdrop-blur-md text-white rounded-full border border-neutral-800 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:bg-white hover:text-black hover:border-white hover:scale-110 shadow-2xl cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Pagination Slider Button */}
        {showRightArrow && (
          <button
            id={`carousel-right-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleScroll("right")}
            className="absolute right-[-16px] md:right-[-24px] top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 bg-[#14151a]/90 backdrop-blur-md text-white rounded-full border border-neutral-800 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:bg-white hover:text-black hover:border-white hover:scale-110 shadow-2xl cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Card Scrolling viewport */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 pt-1 snap-x scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start shrink-0">
              <MovieCard
                item={item}
                onSelect={onSelect}
                onPlay={onPlay}
                isInWatchlist={watchlist.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
