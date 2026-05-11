import React, { useState } from "react";
import { FaPlus, FaSignInAlt, FaTimes, FaUsers } from "react-icons/fa";
import "./roomModal.css";

export default function RoomModal({ close, movie, currentName = "", onCreate, onJoin }) {
  const [name, setName] = useState(currentName || localStorage.getItem("cine_user") || "");
  const [roomId, setRoomId] = useState("");

  const saveName = () => {
    const displayName = name.trim() || "Guest";
    localStorage.setItem("cine_user", displayName);
    return displayName;
  };

  const createRoom = () => {
    const displayName = saveName();
    onCreate?.(displayName);
  };

  const joinRoom = () => {
    const displayName = saveName();
    const cleanRoom = roomId.trim();
    if (!cleanRoom) return;
    onJoin?.(cleanRoom, displayName);
  };

  return (
    <div className="room-modal-overlay" onClick={close}>
      <div className="room-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="room-close" onClick={close} aria-label="Close room dialog">
          <FaTimes />
        </button>
        <div className="room-modal-icon">
          <FaUsers />
        </div>
        <h2>CineAI Room</h2>
        <p>Create a private trailer lounge with synced playback and realtime chat.</p>

        {movie && (
          <div className="room-movie-preview">
            <span>Starting with</span>
            <strong>{movie.title || movie.name}</strong>
          </div>
        )}

        <label>
          Display name
          <input
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <button type="button" className="create-room-button" onClick={createRoom}>
          <FaPlus />
          Create room
        </button>

        <div className="join-room-row">
          <input
            placeholder="Room code"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") joinRoom();
            }}
          />
          <button type="button" onClick={joinRoom} aria-label="Join room">
            <FaSignInAlt />
          </button>
        </div>
      </div>
    </div>
  );
}
