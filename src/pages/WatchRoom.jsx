import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCopy, FaPaperPlane, FaPlay, FaSearch, FaUsers } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/watch.css";
import { db } from "../firebase";
import { onDisconnect, onValue, push, ref, remove, serverTimestamp, set } from "firebase/database";
import { getMovieDetails, getMovieVideos, imageUrl, pickTrailer, searchMovies } from "../api/tmdb";

const getClientId = () => {
  const existing = localStorage.getItem("cine_client_id");
  if (existing) return existing;

  const id = crypto.randomUUID ? crypto.randomUUID() : `${new Date().getTime()}-${Math.random()}`;
  localStorage.setItem("cine_client_id", id);
  return id;
};

export default function WatchRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialMovieId = params.get("movie");

  const [clientId] = useState(getClientId);
  const [name] = useState(localStorage.getItem("cine_user") || "Guest");
  const [users, setUsers] = useState([]);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const userRef = ref(db, `rooms/${roomId}/users/${clientId}`);

    set(userRef, {
      id: clientId,
      name,
      joinedAt: serverTimestamp(),
    });
    onDisconnect(userRef).remove();

    const unsubscribeUsers = onValue(ref(db, `rooms/${roomId}/users`), (snapshot) => {
      const data = snapshot.val() || {};
      setUsers(Object.values(data));
    });

    const unsubscribeChat = onValue(ref(db, `rooms/${roomId}/chat`), (snapshot) => {
      const data = snapshot.val() || {};
      setChat(
        Object.entries(data)
          .map(([key, value]) => ({ key, ...value }))
          .sort((a, b) => (typeof a.time === "number" ? a.time : 0) - (typeof b.time === "number" ? b.time : 0))
      );
    });

    const unsubscribeCurrent = onValue(ref(db, `rooms/${roomId}/current`), (snapshot) => {
      setCurrent(snapshot.val());
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChat();
      unsubscribeCurrent();
      remove(userRef);
    };
  }, [clientId, name, roomId]);

  useEffect(() => {
    const seedMovie = async () => {
      if (!initialMovieId || seeded || current) return;

      try {
        const movie = await getMovieDetails(initialMovieId);
        const videos = await getMovieVideos(initialMovieId);
        const trailer = pickTrailer(videos);

        if (!trailer) return;

        await set(ref(db, `rooms/${roomId}/current`), {
          movie: {
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            backdrop_path: movie.backdrop_path,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
          },
          trailerKey: trailer.key,
          trailerUrl: `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&rel=0`,
          updatedBy: name,
          updatedAt: serverTimestamp(),
        });
        setSeeded(true);
      } catch (error) {
        console.error(error);
      }
    };

    seedMovie();
  }, [current, initialMovieId, name, roomId, seeded]);

  const inviteLink = useMemo(() => `${window.location.origin}/watch/${roomId}`, [roomId]);

  const copyInvite = async () => {
    await navigator.clipboard?.writeText(inviteLink);
    setStatus("Invite link copied");
    setTimeout(() => setStatus(""), 2200);
  };

  const search = async () => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    setResults(await searchMovies(cleanQuery));
  };

  const playMovie = async (movie) => {
    setStatus("Loading trailer...");

    try {
      const videos = await getMovieVideos(movie.id);
      const trailer = pickTrailer(videos);

      if (!trailer) {
        setStatus("Trailer unavailable for this title");
        return;
      }

      await set(ref(db, `rooms/${roomId}/current`), {
        movie: {
          id: movie.id,
          title: movie.title || movie.name,
          overview: movie.overview,
          backdrop_path: movie.backdrop_path,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
        },
        trailerKey: trailer.key,
        trailerUrl: `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&rel=0`,
        updatedBy: name,
        updatedAt: serverTimestamp(),
      });

      await push(ref(db, `rooms/${roomId}/chat`), {
        user: "CineAI",
        text: `${name} started ${movie.title || movie.name}.`,
        time: serverTimestamp(),
        system: true,
      });
      setStatus("");
    } catch (error) {
      console.error(error);
      setStatus("Could not load trailer");
    }
  };

  const sendMessage = async (text = message) => {
    const cleanMessage = text.trim();
    if (!cleanMessage) return;

    await push(ref(db, `rooms/${roomId}/chat`), {
      user: name,
      text: cleanMessage,
      time: serverTimestamp(),
    });
    setMessage("");
  };

  return (
    <main className="watch-room">
      <aside className="room-sidebar">
        <button type="button" className="back-button" onClick={() => navigate("/home")}>
          <FaArrowLeft />
          CineAI
        </button>

        <section className="room-code">
          <span>Room code</span>
          <strong>{roomId}</strong>
          <button type="button" onClick={copyInvite}>
            <FaCopy />
            Copy invite
          </button>
          {status && <p>{status}</p>}
        </section>

        <section className="online-list">
          <h2><FaUsers /> Online</h2>
          {users.map((user) => (
            <div key={user.id} className="online-user">
              <span />
              {user.name}
            </div>
          ))}
        </section>

        <section className="room-reactions">
          <button type="button" onClick={() => sendMessage("This trailer is a strong pick.")}>Strong pick</button>
          <button type="button" onClick={() => sendMessage("Add this to the group watchlist.")}>Add to watchlist</button>
          <button type="button" onClick={() => sendMessage("Find something more intense.")}>More intense</button>
        </section>
      </aside>

      <section className="room-stage">
        <div className="stage-player">
          {current?.trailerUrl ? (
            <iframe
              src={current.trailerUrl}
              title={`${current.movie?.title || "Movie"} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="empty-player">
              <FaPlay />
              <h1>Search a movie and start the trailer.</h1>
              <p>Everyone in this room will see the same trailer update.</p>
            </div>
          )}
        </div>

        {current?.movie && (
          <div className="now-playing">
            <div>
              <span>Now playing</span>
              <h1>{current.movie.title}</h1>
              <p>{current.movie.overview}</p>
            </div>
            {current.movie.poster_path && <img src={imageUrl(current.movie.poster_path, "w500")} alt={current.movie.title} />}
          </div>
        )}

        <div className="room-search">
          <label>
            <FaSearch />
            <input
              placeholder="Search trailers to watch together..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") search();
              }}
            />
          </label>
          <button type="button" onClick={search}>Search</button>
        </div>

        <div className="room-results">
          {results.map((movie) => (
            <button type="button" key={movie.id} onClick={() => playMovie(movie)}>
              <img src={imageUrl(movie.poster_path || movie.backdrop_path, "w500")} alt={movie.title || movie.name} />
              <span>{movie.title || movie.name}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="room-chat-panel">
        <header>
          <strong>Discussion</strong>
          <span>{chat.length} messages</span>
        </header>

        <div className="room-chat-list">
          {chat.map((item) => (
            <div key={item.key} className={item.system ? "chat-message system" : "chat-message"}>
              <strong>{item.user}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>

        <div className="room-message-box">
          <input
            placeholder="Discuss the trailer..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
          />
          <button type="button" onClick={() => sendMessage()} aria-label="Send message">
            <FaPaperPlane />
          </button>
        </div>
      </aside>
    </main>
  );
}
