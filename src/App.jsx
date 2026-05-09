import React from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import WatchRoom from "./pages/WatchRoom";


import { BrowserRouter, Routes, Route } from "react-router-dom";

export default function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/home" element={<Home/>}/>   
        <Route path="/watch/:id" element={<WatchRoom />} />



      </Routes>
    </BrowserRouter>
  )
}
