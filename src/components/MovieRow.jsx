import React, { useRef } from "react";
import { IMG } from "../api/tmdb";

export default function MovieRow({ title, movies, onClick, horizontal }) {
  const ref = useRef();

  const scroll = (dir) => {
    if (!ref.current) return;
    if (dir === "l") ref.current.scrollLeft -= 500;
    else ref.current.scrollLeft += 500;
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="row">

      <h2>{title}</h2>

      <div className="arrow left" onClick={() => scroll("l")}>‹</div>
      <div className="arrow right" onClick={() => scroll("r")}>›</div>

      <div
        className={`row-posters ${horizontal ? "horizontal" : ""}`}
        ref={ref}
      >
        {movies.map((m) => (
          <div className="card" key={m.id} onClick={() => onClick(m)}>
            <img src={IMG + m.poster_path} />
            <p>{m.title || m.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
