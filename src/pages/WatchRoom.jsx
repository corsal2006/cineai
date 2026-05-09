import React, { useEffect, useState } from "react";
import "../styles/watch.css";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { ref, set, onValue, push } from "firebase/database";

const API_KEY = import.meta.env.VITE_TMDB_KEY;

export default function WatchRoom() {

  const { id } = useParams();
  const roomId = id;

  const username = localStorage.getItem("cine_user");

  const [users,setUsers] = useState([]);
  const [chat,setChat] = useState([]);
  const [msg,setMsg] = useState("");

  const [query,setQuery] = useState("");
  const [movies,setMovies] = useState([]);
  const [trailer,setTrailer] = useState("");

  // 🔥 JOIN ROOM + LIVE LISTEN
  useEffect(()=>{
    if(!username) return;

    // add user to room
    set(ref(db,`rooms/${roomId}/users/${username}`),username);

    // users online
    onValue(ref(db,`rooms/${roomId}/users`),(snapshot)=>{
      const data = snapshot.val();
      if(!data){ setUsers([]); return; }
      setUsers(Object.values(data));
    });

    // chat realtime
    onValue(ref(db, `rooms/${roomId}/chat`), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setChat([]);
        return;
      }
      const msgs = Object.values(data);
      setChat(msgs);
    });

    // trailer realtime sync
    onValue(ref(db,`rooms/${roomId}/trailer`),(snapshot)=>{
      const data = snapshot.val();
      if(data) setTrailer(data);
    });

  },[roomId,username]);

  // 🔍 SEARCH MOVIES
  const searchMovies = async()=>{
    if(!query) return;

    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`
    );
    const data = await res.json();
    setMovies(data.results || []);
  };

  // 🎬 PLAY TRAILER + SYNC
  const playTrailer = async(id)=>{
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API_KEY}`
    );

    const data = await res.json();

    let vid =
      data.results.find(v=>v.type==="Trailer" && v.site==="YouTube") ||
      data.results.find(v=>v.site==="YouTube");

    if(!vid){
      alert("Trailer not available");
      return;
    }

    const url = `https://www.youtube.com/embed/${vid.key}?autoplay=1&mute=1`;

    // save trailer to firebase for all users
    set(ref(db,`rooms/${roomId}/trailer`),url);
  };

  // 💬 SEND MESSAGE
  const sendMsg = () => {
    if (!msg.trim()) return;

    const chatRef = ref(db, `rooms/${roomId}/chat`);

    push(chatRef, {
      user: username,
      text: msg,
      time: Date.now()
    });

    setMsg("");
  };

  return(
    <div className="watchWrap">

      {/* LEFT SIDE */}
      <div className="watchLeft">

        <div className="videoBox">
          {trailer ? (
            <iframe src={trailer} allow="autoplay" allowFullScreen title="trailer"></iframe>
          ) : (
            <div className="empty">Play movie trailer 🎬</div>
          )}
        </div>

        <div className="searchBar">
          <input
            placeholder="Search movie..."
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
          />
          <button onClick={searchMovies}>Search</button>
        </div>

        <div className="movieRow">
          {movies.map(m=>(
            <div key={m.id} className="card" onClick={()=>playTrailer(m.id)}>
              <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} />
              <p>{m.title}</p>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="watchRight">

        <h2>Room: {roomId}</h2>
        <h4>Users Online: {users.length}</h4>

        <div className="users">
          {users.map((u,i)=>(
            <div key={i}>🟢 {u}</div>
          ))}
        </div>

        <div className="chatBox">
          {chat.map((c,i)=>(
            <div key={i} className="msg">
              <b>{c.user}:</b> {c.text}
            </div>
          ))}
        </div>

        <div className="sendRow">
          <input
            placeholder="Type message..."
            value={msg}
            onChange={(e)=>setMsg(e.target.value)}
            onKeyDown={(e)=>{
              if(e.key==="Enter") sendMsg();
            }}
          />
          <button onClick={sendMsg}>Send</button>
        </div>

      </div>

    </div>
  );
}
