export interface MediaItem {
  id: number;
  title?: string;
  name?: string; // used for TV shows
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: "movie" | "tv";
  genre_ids: number[];
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  
  // Appended in details queries
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  external_ids?: {
    imdb_id?: string;
    freebase_mid?: string;
    freebase_id?: string;
    tvdb_id?: number;
    tvrage_id?: number;
    wikidata_id?: string;
  };
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos?: {
    results: VideoResult[];
  };
  similar?: {
    results: MediaItem[];
  };
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface WatchHistoryItem {
  mediaId: number;
  title: string;
  posterPath: string | null;
  mediaType: "movie" | "tv";
  timestamp: number;
  progressPercent: number; // For interactive resume simulation
  lastSeason?: number;
  lastEpisode?: number;
}

export interface WatchlistItem {
  mediaId: number;
  title: string;
  posterPath: string | null;
  mediaType: "movie" | "tv";
  backdropPath: string | null;
  voteAverage: number;
  releaseDate?: string;
}
