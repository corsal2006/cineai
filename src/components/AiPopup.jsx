import React,{useState} from "react";
import { askGroq } from "../api/groq";

export default function AiPopup(){

 const [open,setOpen]=useState(false);
 const [msg,setMsg]=useState("");
 const [chat,setChat]=useState([
 {
  ai:`👋 Hey Pal ! I'm CineAI

Your personal movie companion 🎬

Tell me what you're in the mood for:

🍿 Weekend binge  
🔥 Action movies  
😂 Comedy  
👻 Horror  
🧠 Mind-bending  

I'll find something perfect for you 😎`
 }
]);

 const [loading,setLoading]=useState(false);

 const send=async()=>{
  if(!msg) return;

  const newChat=[...chat,{me:msg}];
  setChat(newChat);
  setMsg("");
  setLoading(true);

  const res = await askGroq(msg);

  setChat([...newChat,{ai:res}]);
  setLoading(false);
 };

 return(
 <>
 {/* FLOAT BUTTON */}
 <div className="ai-float" onClick={()=>setOpen(!open)}>🤖</div>

 {open && (
 <div className="ai-chat">

   <div className="ai-header">
     CineAI Assistant
     <span onClick={()=>setOpen(false)}>✖</span>
   </div>

   <div className="ai-messages">
    {chat.map((c,i)=>(
      <div key={i}>
        {c.me && <div className="me">{c.me}</div>}
        {c.ai && <div className="ai">{c.ai}</div>}
      </div>
    ))}
    {loading && <div className="ai">Thinking...</div>}
   </div>

   <div className="ai-input">
    <input
     placeholder="Ask movies like Interstellar..."
     value={msg}
     onChange={e=>setMsg(e.target.value)}
    />
    <button onClick={send}>Send</button>
   </div>

 </div>
 )}
 </>
 )
}
