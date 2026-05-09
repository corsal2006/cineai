import React,{useState} from "react";
import "../styles/home.css";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Navbar({onSearch}){

 const [q,setQ]=useState("");

 const logout=()=>{
  signOut(auth);
  window.location="/";
 };

 const handle=(e)=>{
  setQ(e.target.value);
  onSearch(e.target.value);
 };

 return(
  <div className="nav">

   <div className="nav-logo">CINE<span>AI</span></div>

   <div className="search-box">
    <input 
      placeholder="Search movies..."
      value={q}
      onChange={handle}
    />
   </div>

   <button className="logout" onClick={logout}>
    Logout
   </button>

  </div>
 )
}
