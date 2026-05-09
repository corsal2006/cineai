import React, { useState } from "react";
import "../styles/login.css";
import bg from "../assets/background.jpg";
import google from "../assets/google.png";
import { auth, provider } from "../firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {

  const navigate = useNavigate();
  const [open,setOpen]=useState(false);
  const [signup,setSignup]=useState(false);
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");

  // EMAIL LOGIN
  const handleAuth = async ()=>{
    try{
      if(signup){
        await createUserWithEmailAndPassword(auth,email,pass);
      }else{
        await signInWithEmailAndPassword(auth,email,pass);
      }
      navigate("/home");
    }catch(err){
      alert(err.message);
    }
  };

  // GOOGLE LOGIN
  const googleLogin = async ()=>{
    try{
      await signInWithPopup(auth,provider);
      navigate("/home");
    }catch(err){
      alert(err.message);
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bg})` }}>

      <nav className="navbar">
        <div className="logo">CINE<span>AI</span></div>
        <button className="signin-btn" onClick={()=>setOpen(true)}>Sign In</button>
      </nav>

      <div className="hero">
        <div className="overlay"></div>

        <div className="hero-content">
          <h1>Smart Movie Discovery Powered by AI</h1>
          <h3>Watch smarter. Discover better. Together.</h3>
          <button className="getstarted" onClick={()=>setOpen(true)}>Get Started →</button>
        </div>
      </div>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="close" onClick={()=>setOpen(false)}>✕</span>

            <h2>{signup ? "Create account" : "Sign in to CINEAI"}</h2>

            <input type="email" placeholder="Email"
              onChange={(e)=>setEmail(e.target.value)}
            />
            <input type="password" placeholder="Password"
              onChange={(e)=>setPass(e.target.value)}
            />

            <button className="login-btn" onClick={handleAuth}>
              {signup ? "Create Account" : "Login"}
            </button>

            <div className="google-btn" onClick={googleLogin}>
              <img src={google}/>
              Continue with Google
            </div>

            <p className="switch">
              {signup ? "Already have account?" : "New to CINEAI?"}
              <span onClick={()=>setSignup(!signup)}>
                {signup ? " Sign In" : " Create account"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
