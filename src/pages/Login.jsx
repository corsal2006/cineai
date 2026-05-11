import React, { useEffect, useState } from "react";
import { FaBrain, FaChartLine, FaEnvelope, FaFilm, FaGoogle, FaLock, FaPlay, FaStar, FaTimes, FaUserPlus, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import "../styles/login.css";
import bg from "../assets/background.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem("cine_user", user.displayName || user.email?.split("@")[0] || "Member");
        navigate("/home");
      }
    });

    return unsubscribe;
  }, [navigate]);

  const finishLogin = (displayName) => {
    localStorage.setItem("cine_user", displayName);
    localStorage.removeItem("cine_guest_session");
    navigate("/home");
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credentials =
        mode === "signup"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      finishLogin(credentials.user.displayName || credentials.user.email?.split("@")[0] || "Member");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const credentials = await signInWithPopup(auth, provider);
      finishLogin(credentials.user.displayName || credentials.user.email?.split("@")[0] || "Member");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    const existing = localStorage.getItem("cine_user");
    const guestName = existing || `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem("cine_user", guestName);
    localStorage.setItem("cine_guest_session", "true");
    navigate("/home");
  };

  return (
    <main className="login-page" style={{ backgroundImage: `url(${bg})` }}>
      <nav className="landing-nav">
        <button type="button" className="brand-mark" onClick={() => setPanelOpen(false)}>
          CINE<span>AI</span>
        </button>
        <div className="landing-actions">
          <button type="button" onClick={continueAsGuest}>Continue as guest</button>
          <button type="button" className="signin-btn" onClick={() => setPanelOpen(true)}>Sign in</button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">Personalized movie discovery</p>
          <h1>CINEAI</h1>
          <p className="hero-subtitle">Netflix-style browsing, AI mood picks, synced trailer rooms, and taste learning in one movie platform.</p>
          <div className="hero-actions">
            <button type="button" className="hero-primary" onClick={() => setPanelOpen(true)}>
              <FaPlay />
              Start watching
            </button>
            <button type="button" className="hero-secondary" onClick={continueAsGuest}>
              Continue as guest
            </button>
          </div>
        </div>

        <div className="hero-showcase" aria-label="CineAI product preview">
          <div className="showcase-hero">
            <span>AI featured pick</span>
            <strong>Late-night thriller</strong>
            <p>96% mood match</p>
          </div>
          <div className="showcase-stats">
            <div>
              <FaStar />
              <strong>98%</strong>
              <span>AI match</span>
            </div>
            <div>
              <FaUsers />
              <strong>Room</strong>
              <span>Synced trailers</span>
            </div>
            <div>
              <FaBrain />
              <strong>Mood AI</strong>
              <span>Happy to thriller</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-preview" aria-label="CineAI preview">
        <div>
          <FaFilm />
          <strong>Mood engine</strong>
        </div>
        <div>
          <FaChartLine />
          <strong>AI match scores</strong>
        </div>
        <div>
          <FaUsers />
          <strong>Watch rooms</strong>
        </div>
      </section>

      {panelOpen && (
        <div className="auth-backdrop" onClick={() => setPanelOpen(false)}>
          <form className="auth-panel" onSubmit={handleAuth} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-close" onClick={() => setPanelOpen(false)} aria-label="Close sign in panel">
              <FaTimes />
            </button>
            <div className="auth-brand">CINE<span>AI</span></div>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create</button>
            </div>
            <h2>{mode === "signup" ? "Create account" : "Sign in"}</h2>
            <p>{mode === "signup" ? "Build a taste profile from the first search." : "Welcome back to your movie profile."}</p>

            <label>
              <FaEnvelope />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              <FaLock />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {mode === "signup" ? <FaUserPlus /> : <FaPlay />}
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <div className="auth-divider"><span>or</span></div>

            <button type="button" className="google-button" onClick={googleLogin} disabled={loading}>
              <FaGoogle />
              Continue with Google
            </button>

            <button type="button" className="guest-inline" onClick={continueAsGuest}>
              Continue as guest
            </button>

            <p className="switch-mode">
              {mode === "signup" ? "Already have an account?" : "New to CineAI?"}
              <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                {mode === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
          </form>
        </div>
      )}
    </main>
  );
}
