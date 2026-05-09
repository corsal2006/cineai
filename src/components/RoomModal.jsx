import React, { useState } from "react";
import "./roomModal.css";

export default function RoomModal({ close }) {

  const [name,setName] = useState("");
  const [join,setJoin] = useState("");

  const createRoom = ()=>{
    if(!name) return alert("Enter name");
    localStorage.setItem("cine_user",name);

    const id = Math.floor(100000 + Math.random()*900000);
    window.location.href="/watch/"+id;
  };

  const joinRoom = ()=>{
    if(!name || !join) return alert("Enter details");
    localStorage.setItem("cine_user",name);
    window.location.href="/watch/"+join;
  };

  return(
    <div className="modalOverlay">

      <div className="modalBox">
        <h2>🎬 CineAI Room</h2>

        <input
          placeholder="Enter your name"
          value={name}
          onChange={e=>setName(e.target.value)}
        />

        <button className="createBtn" onClick={createRoom}>
          Create Room
        </button>

        <div className="joinRow">
          <input
            placeholder="Enter Room ID"
            value={join}
            onChange={e=>setJoin(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </div>

        <span className="close" onClick={close}>✖</span>
      </div>

    </div>
  );
}
