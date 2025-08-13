import { useState, useEffect } from 'react';
import Search from './components/search.jsx';
import Spinner from './components/Spinner.jsx'; 
import MovieCard from './components/MovieCard.jsx';
import { getTrendingMovies, UpdateSearchCount } from './appwrite.js'; 

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [movieList, setMovieList] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce the search term by 800ms
  const debouncedSearchTerm = useDebounce(searchTerm, 800);

  // Fetch movies from TMDB
  const fetchMovies = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const endpoint = debouncedSearchTerm
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(debouncedSearchTerm)}&api_key=${API_KEY}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }
      const data = await response.json();
      setMovieList(data.results || []);

      // Update search count in Appwrite if search term exists
      if (debouncedSearchTerm && data.results.length > 0) {
        await UpdateSearchCount(debouncedSearchTerm, data.results[0]);
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load trending movies from Appwrite
  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
    } catch (error){
      console.error(`Error fetching trending movies: ${error}`);
    }
  };

  // Fetch movies whenever the debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      fetchMovies();
    } else if (debouncedSearchTerm.length === 0) {
      fetchMovies(); // fetch popular movies on empty search
    }
  }, [debouncedSearchTerm]);

  // Load trending movies on component mount
  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>
            Find <span className="text-gradient">Movie</span> You will enjoy without the Hassle
          </h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) =>(
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movie">
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner /> 
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>

        <h1 className="text-white">{searchTerm}</h1>
      </div>
    </main>
  );
};

export default App;
