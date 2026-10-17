import React, { useEffect, useState } from "react";
import { FaBrain, FaChartLine, FaEnvelope, FaFilm, FaLock, FaPlay, FaStar, FaTimes, FaUserPlus, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import "../styles/login.css";
import bg from "../assets/background.jpg";
import { ensureUserProfile, recordLogin } from "../services/activityService";

export default function Login() {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if returning from redirect sign-in
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await recordLogin(result.user, "google.com");
          localStorage.setItem("cine_user", result.user.displayName || result.user.email?.split("@")[0] || "Member");
          localStorage.removeItem("cine_guest_session");
          navigate("/home");
        }
      })
      .catch((err) => {
        if (err.code !== "auth/credential-already-in-use") {
          console.warn("Redirect sign-in notice:", err.message);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await ensureUserProfile(user);
        localStorage.setItem("cine_user", user.displayName || user.email?.split("@")[0] || "Member");
        localStorage.removeItem("cine_guest_session");
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

      if (credentials?.user) {
        await recordLogin(credentials.user, "password");
        finishLogin(credentials.user.displayName || credentials.user.email?.split("@")[0] || "Member");
      }
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
      if (credentials?.user) {
        await recordLogin(credentials.user, "google.com");
        finishLogin(credentials.user.displayName || credentials.user.email?.split("@")[0] || "Member");
      }
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return;
      }
      if (err.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(redirectErr.message.replace("Firebase: ", ""));
        }
      } else {
        setError(err.message.replace("Firebase: ", ""));
      }
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
              <span className="google-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </span>
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
