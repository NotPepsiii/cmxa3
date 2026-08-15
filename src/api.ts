const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * A highly resilient fetch wrapper that performs direct TMDB client-side fetches.
 * Seamlessly extracts parameters regardless of subfolder deployment (e.g. GitHub Pages base path /sth1/).
 */
export async function smartFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  let apiPath = "";
  let searchParams = new URLSearchParams();

  try {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const urlObj = new URL(endpoint);
      const index = urlObj.pathname.indexOf("/api/");
      if (index !== -1) {
        apiPath = urlObj.pathname.substring(index + 5);
      } else {
        apiPath = urlObj.pathname;
      }
      searchParams = urlObj.searchParams;
    } else {
      const [pathPart, queryPart] = endpoint.split("?");
      const index = pathPart.indexOf("api/");
      if (index !== -1) {
        apiPath = pathPart.substring(index + 4);
      } else {
        apiPath = pathPart;
      }
      if (queryPart) {
        searchParams = new URLSearchParams(queryPart);
      }
    }
  } catch (err) {
    console.error("Error parsing endpoint in smartFetch:", err);
    apiPath = endpoint;
  }

  // Remove leading/trailing/double slashes
  apiPath = apiPath.replace(/^\/+|\/+$/g, "").trim();

  let mappedUrl = "";

  if (apiPath === "trending") {
    const type = searchParams.get("type") || "movie";
    const time = searchParams.get("time") || "day";
    mappedUrl = `${TMDB_BASE_URL}/trending/${type}/${time}?api_key=${TMDB_API_KEY}&language=en-US`;
  } else if (apiPath === "search") {
    const query = searchParams.get("query") || "";
    const page = searchParams.get("page") || "1";
    mappedUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`;
  } else if (apiPath.startsWith("discover")) {
    const type = searchParams.get("type") || "movie";
    const genres = searchParams.get("genres") || "";
    const sortBy = searchParams.get("sort_by") || "popularity.desc";
    const page = searchParams.get("page") || "1";
    mappedUrl = `${TMDB_BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genres}&sort_by=${sortBy}&page=${page}`;
  } else {
    // Check for TV season: tv/:id/season/:season
    const tvSeasonRegex = /^tv\/(\d+)\/season\/(\d+)$/;
    const tvMatch = apiPath.match(tvSeasonRegex);
    if (tvMatch) {
      const id = tvMatch[1];
      const season = tvMatch[2];
      mappedUrl = `${TMDB_BASE_URL}/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`;
    } else {
      // Details fetch: movie/:id or tv/:id
      const detailRegex = /^(movie|tv)\/(\d+)$/;
      const detailMatch = apiPath.match(detailRegex);
      if (detailMatch) {
        const type = detailMatch[1];
        const id = detailMatch[2];
        mappedUrl = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,similar,external_ids`;
      }
    }
  }

  if (mappedUrl) {
    return fetch(mappedUrl, options);
  }

  return fetch(endpoint, options);
}
