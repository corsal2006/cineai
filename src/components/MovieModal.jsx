import React, { useEffect, useState } from "react";
import { IMG, getTrailer, getCast, getSimilar } from "../api/tmdb";

export default function MovieModal({ movie, close }) {
  const [trailer, setTrailer] = useState("");
  const [cast, setCast] = useState([]);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    if (movie) load();
    return () => setTrailer("");
  }, [movie]);

  const load = async () => {
    const vids = await getTrailer(movie.id);
    const tr = vids.find((v) => v.type === "Trailer");
    if (tr) setTrailer(tr.key);

    setCast((await getCast(movie.id)).slice(0, 8));
    setSimilar((await getSimilar(movie.id)).slice(0, 12));
  };

  if (!movie) return null;

  return (
    <div className="modal-bg" onClick={close}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        <span className="close" onClick={close}>✖</span>

        {/* TRAILER */}
        {trailer && (
          <iframe
            className="trailer"
            src={`https://www.youtube.com/embed/${trailer}?autoplay=1`}
            allow="autoplay"
            title="trailer"
          />
        )}

        {/* INFO SECTION */}
        <div className="modal-main">

          <img className="poster" src={IMG + movie.poster_path} />

          <div className="info">
            <h1>{movie.title}</h1>
            <p className="rating">⭐ {movie.vote_average?.toFixed(1)}</p>
            <p className="overview">{movie.overview}</p>

            <h3>Cast</h3>
            <div className="cast">
              {cast.map((c) => (
                <span key={c.id}>{c.name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* SIMILAR MOVIES MATRIX */}
        <h2 className="sim-title">Similar Movies</h2>

        <div className="similar-grid">
          {similar.map((s) => (
            <div key={s.id} className="sim-card">
              <img src={IMG + s.poster_path} />
              <p>{s.title}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
