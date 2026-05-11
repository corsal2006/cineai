import React, { useEffect, useMemo, useState } from "react";
import { FaCheck, FaPlay, FaPlus, FaTimes, FaUsers } from "react-icons/fa";
import { getMovieDetails, imageUrl, pickTrailer } from "../api/tmdb";

export default function MovieModal({
  movie,
  close,
  onOpenMovie,
  onToggleWatchlist,
  inWatchlist,
  rating = 0,
  review = "",
  onRate,
  onReview,
  onStartRoom,
  matchScore = 82,
}) {
  const [details, setDetails] = useState(null);
  const [trailerKey, setTrailerKey] = useState("");
  const [localReview, setLocalReview] = useState(review);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getMovieDetails(movie.id);
        if (!active) return;

        setDetails(data);
        setTrailerKey(pickTrailer(data?.videos?.results || [])?.key || "");
        setLocalReview(review || "");
      } catch (error) {
        console.error(error);
        if (active) setDetails(movie);
      }
    };

    if (movie?.id) load();
    return () => {
      active = false;
    };
  }, [movie, review]);

  const current = details || movie;
  const cast = current?.credits?.cast?.slice(0, 10) || [];
  const similar = useMemo(() => {
    const recommendations = current?.recommendations?.results || [];
    const similarMovies = current?.similar?.results || [];
    return [...recommendations, ...similarMovies]
      .filter((item, index, list) => item?.poster_path && list.findIndex((next) => next.id === item.id) === index)
      .slice(0, 12);
  }, [current]);

  if (!movie) return null;

  const backdrop = imageUrl(current?.backdrop_path || movie.backdrop_path, "original");
  const poster = imageUrl(current?.poster_path || movie.poster_path, "w500");
  const year = (current?.release_date || "").slice(0, 4);
  const runtime = current?.runtime ? `${Math.floor(current.runtime / 60)}h ${current.runtime % 60}m` : "";
  const genres = current?.genres?.map((genre) => genre.name).slice(0, 4).join(" · ");

  const saveReview = () => onReview?.(movie.id, localReview.trim());

  return (
    <div className="modal-bg" onClick={close}>
      <div className="movie-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={close} aria-label="Close movie details">
          <FaTimes />
        </button>

        <div className="modal-hero" style={{ backgroundImage: trailerKey ? "none" : `url(${backdrop})` }}>
          {trailerKey ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&rel=0`}
              title={`${current?.title || movie.title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="modal-hero-fallback" />
          )}
        </div>

        <div className="modal-body">
          <div className="modal-info-grid">
            <img className="detail-poster" src={poster} alt={current?.title || movie.title} />
            <div className="detail-copy">
              <div className="match-line">
                <span>{matchScore}% AI match</span>
                <span>{year || "Featured"}</span>
                {runtime && <span>{runtime}</span>}
                <span>{current?.vote_average ? current.vote_average.toFixed(1) : "New"}</span>
              </div>
              <h1>{current?.title || movie.title}</h1>
              {genres && <p className="genre-line">{genres}</p>}
              <p className="overview">{current?.overview || "No overview available yet."}</p>

              <div className="detail-actions">
                {trailerKey && (
                  <a className="primary-action" href={`https://www.youtube.com/watch?v=${trailerKey}`} target="_blank" rel="noreferrer">
                    <FaPlay />
                    Watch trailer
                  </a>
                )}
                <button type="button" onClick={() => onToggleWatchlist?.(current)}>
                  {inWatchlist ? <FaCheck /> : <FaPlus />}
                  {inWatchlist ? "In watchlist" : "Watchlist"}
                </button>
                <button type="button" onClick={() => onStartRoom?.(current)}>
                  <FaUsers />
                  Start room
                </button>
              </div>
            </div>
          </div>

          <section className="rating-panel">
            <div>
              <h2>Your rating</h2>
              <div className="rating-buttons">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={value <= rating ? "active" : ""}
                    onClick={() => onRate?.(movie.id, value)}
                    aria-label={`Rate ${value} out of 5`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="review-box">
              <label htmlFor="movie-review">Review</label>
              <textarea
                id="movie-review"
                placeholder="Write what worked, what did not, or who should watch it."
                value={localReview}
                onChange={(event) => setLocalReview(event.target.value)}
              />
              <button type="button" onClick={saveReview}>Save review</button>
            </div>
          </section>

          {cast.length > 0 && (
            <section className="cast-section">
              <h2>Cast</h2>
              <div className="cast-list">
                {cast.map((person) => (
                  <div className="cast-person" key={`${person.id}-${person.character}`}>
                    {person.profile_path ? (
                      <img src={imageUrl(person.profile_path, "w185")} alt={person.name} />
                    ) : (
                      <div className="cast-placeholder">{person.name?.slice(0, 1)}</div>
                    )}
                    <strong>{person.name}</strong>
                    <span>{person.character}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {similar.length > 0 && (
            <section className="similar-section">
              <h2>More like this</h2>
              <div className="similar-grid">
                {similar.map((item) => (
                  <button type="button" className="similar-card" key={item.id} onClick={() => onOpenMovie?.(item)}>
                    <img src={imageUrl(item.poster_path, "w500")} alt={item.title || item.name} />
                    <span>{item.title || item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
