import React, { useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaPlay, FaPlus } from "react-icons/fa";
import { imageUrl } from "../api/tmdb";

export default function MovieRow({ title, subtitle, movies, onClick, onQuickAdd, variant = "poster" }) {
  const railRef = useRef(null);

  const scroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({
      left: direction === "left" ? -760 : 760,
      behavior: "smooth",
    });
  };

  const validMovies = (movies || []).filter((movie) => movie?.poster_path || movie?.backdrop_path);
  if (!validMovies.length) return null;

  return (
    <section className={`movie-row ${variant}`}>
      <div className="row-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="rail-shell">
        <button type="button" className="rail-arrow rail-left" onClick={() => scroll("left")} aria-label={`Scroll ${title} left`}>
          <FaChevronLeft />
        </button>
        <div className="movie-rail" ref={railRef}>
          {validMovies.map((movie) => {
            const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "New";
            const src = imageUrl(variant === "wide" ? movie.backdrop_path || movie.poster_path : movie.poster_path, variant === "wide" ? "w780" : "w500");

            return (
              <article className="movie-card" key={`${title}-${movie.id}`} onClick={() => onClick(movie)}>
                <div className="poster-shell">
                  <img src={src} alt={movie.title || movie.name} loading="lazy" />
                  <div className="card-gradient" />
                  <button type="button" className="mini-play" aria-label={`Open ${movie.title || movie.name}`}>
                    <FaPlay />
                  </button>
                  {onQuickAdd && (
                    <button
                      type="button"
                      className="mini-add"
                      aria-label={`Add ${movie.title || movie.name} to watchlist`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onQuickAdd(movie);
                      }}
                    >
                      <FaPlus />
                    </button>
                  )}
                </div>
                <div className="movie-meta">
                  <strong>{movie.title || movie.name}</strong>
                  <span>{year || "Featured"} · {rating}</span>
                </div>
              </article>
            );
          })}
        </div>
        <button type="button" className="rail-arrow rail-right" onClick={() => scroll("right")} aria-label={`Scroll ${title} right`}>
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}
