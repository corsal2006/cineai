import React, { useEffect, useState } from "react";
import "../styles/home.css";
import MovieRow from "../components/MovieRow";
import MovieModal from "../components/MovieModal";
import AiPopup from "../components/AiPopup";
import { trackSearch, trackMovieClick, getFavGenres } from "../utils/aiTaste";

import {
  getTrending,
  getAction,
  getHorror,
  getScifi,
  getComedy,
  getBollywood,
  getAnime,
  searchMovies,
  IMG,
} from "../api/tmdb";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import RoomModal from "../components/RoomModal";



export default function Home() {
  const [banner, setBanner] = useState([]);
  const [trend, setTrend] = useState([]);
  const [action, setAction] = useState([]);
  const [horror, setHorror] = useState([]);
  const [scifi, setScifi] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [bolly, setBolly] = useState([]);
  const [anime, setAnime] = useState([]);
  const [search, setSearch] = useState([]);
  const [modal, setModal] = useState(null);
  const [showRoom,setShowRoom] = useState(false);

  const [aiRec, setAiRec] = useState([]);

  useEffect(() => {
    load();

    // 🔥 AUTO UPDATE AI BASED ON TASTE
    const interval = setInterval(() => {
      loadAiRecommendations();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    const t = await getTrending();
    setTrend(t);
    setBanner(t.slice(0, 6));

    setAction(await getAction());
    setHorror(await getHorror());
    setScifi(await getScifi());
    setComedy(await getComedy());
    setBolly(await getBollywood());
    setAnime(await getAnime());

    loadAiRecommendations();
  };

  // 🔥 AI BASED ON USER TASTE
  const loadAiRecommendations = async () => {
    const fav = getFavGenres();
    if (!fav.length) return;

    let rec = [];

    if (fav.includes("Action")) rec = await getAction();
    else if (fav.includes("Horror")) rec = await getHorror();
    else if (fav.includes("Sci-Fi")) rec = await getScifi();
    else if (fav.includes("Comedy")) rec = await getComedy();
    else if (fav.includes("Anime")) rec = await getAnime();
    else rec = await getTrending();

    setAiRec(rec.slice(0, 15));
  };

  /* SEARCH */
  const doSearch = async (e) => {
    const q = e.target.value;
    if (!q) {
      setSearch([]);
      return;
    }

    trackSearch(q); // 🔥 learn taste
    const r = await searchMovies(q);
    setSearch(r);

    loadAiRecommendations(); // update AI instantly
  };

  const openMovie = (m) => {
    trackMovieClick(m); // 🔥 track taste
    setModal(m);
    loadAiRecommendations();
  };

  const logout = () => {
    signOut(auth);
    window.location = "/";
  };

  return (
    <div className="home">

      {/* NAVBAR */}
      <div className="nav">
        <div className="logo">CINE<span>AI</span></div>

        <input
          className="search"
          placeholder="Search movies..."
          onChange={doSearch}
        />

        <button className="logout" onClick={logout}>
          Logout
        </button>
        <button onClick={()=>setShowRoom(true)} className="room-btn">
  Room
</button>



      </div>

      {/* 🔥 GLOWING BANNER */}
      <div className="banner-wrap">
        {banner.map((m, i) => (
          <div
            key={i}
            className="banner"
            style={{
              backgroundImage: `url(${IMG + m.backdrop_path})`,
              animationDelay: `${i * 4}s`,
            }}
            onClick={() => openMovie(m)}
          >
            <div className="banner-content">
              <h1>{m.title}</h1>
              <p>{m.overview?.slice(0, 150)}...</p>
            </div>
          </div>
        ))}
      </div>

      {/* 🤖 AI POPUP FLOAT BUTTON */}
      <AiPopup />

      {/* 🔥 BASED ON YOUR TASTE (AUTO AI) */}
      {aiRec.length > 0 && (
        <MovieRow
          title="🎯 Based on Your Taste"
          movies={aiRec}
          onClick={openMovie}
          horizontal
        />
      )}

      {/* SEARCH */}
      {search.length > 0 && (
        <MovieRow
          title="Search Results"
          movies={search}
          onClick={openMovie}
          horizontal
        />
      )}

      {/* ROWS */}
      <MovieRow title="🔥 Trending" movies={trend} onClick={openMovie} horizontal />
      <MovieRow title="⚡ Action" movies={action} onClick={openMovie} />
      <MovieRow title="👻 Horror" movies={horror} onClick={openMovie} />
      <MovieRow title="🚀 Sci-Fi" movies={scifi} onClick={openMovie} />
      <MovieRow title="😂 Comedy" movies={comedy} onClick={openMovie} />
      <MovieRow title="🎬 Bollywood" movies={bolly} onClick={openMovie} />
      <MovieRow title="🍿 Anime" movies={anime} onClick={openMovie} />

      {/* MODAL */}
      {modal && <MovieModal movie={modal} close={() => setModal(null)} />}
      {showRoom && <RoomModal close={()=>setShowRoom(false)} />}

    </div>
  );
}
