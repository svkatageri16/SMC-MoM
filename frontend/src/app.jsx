import React, { useState, useEffect, useRef } from 'react';
import { 
  FileAudio, FileText, Send, Layout, Clock, User, 
  ShieldCheck, Plus, History, ChevronLeft, Loader2, ExternalLink, Search 
} from 'lucide-react';

const AdminDashboard = () => {
  const [view, setView] = useState('home'); 
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const ws = useRef(null);

  useEffect(() => { fetchSessions(); }, []);

  // AUTO-LOAD TRIGGER
  useEffect(() => {
    if (view === 'session' && activeSession) {
      connectWS();
      loadSavedTranscript(activeSession.id);
      fetchFiles(activeSession.id);
    } else {
      if (ws.current) ws.current.close();
    }
  }, [view, activeSession]);

  const fetchSessions = async () => {
    const res = await fetch("http://localhost:8000/api/sessions");
    const data = await res.json();
    setSessions(data);
  };

  const loadSavedTranscript = async (sid) => {
    const res = await fetch(`http://localhost:8000/api/get_transcript?session_id=${sid}`);
    const data = await res.json();
    setTranscript(data.transcript || "");
  };

  const startMeeting = async () => {
    if (!newTitle) return alert("Enter Meeting Title");
    setLoading(true);
    setLoadingMsg("Initializing Live Session & Notifying Members...");
    try {
      const res = await fetch("http://localhost:8000/api/sessions/start", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title: newTitle })
      });
      const data = await res.json();
      setActiveSession(data);
      setFiles([]);
      setTranscript("");
      setView('session');
    } catch (e) { alert("Check Server"); }
    setLoading(false);
    fetchSessions();
  };

  const connectWS = () => {
    ws.current = new WebSocket("ws://localhost:8000/ws/admin");
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "STREAM_FINISHED" || data.event === "NEW_SPEAKER") fetchFiles(activeSession?.id);
    };
  };

  const fetchFiles = async (sid) => {
    if (!sid) return;
    const res = await fetch(`http://localhost:8000/api/files?session_id=${sid}`);
    const data = await res.json();
    setFiles(data);
  };

  const handleTranscribe = async () => {
    setLoading(true);
    setLoadingMsg("AI Engine is building the Devanagari Record (GPU)...");
    const res = await fetch(`http://localhost:8000/api/transcribe?session_id=${activeSession.id}`);
    const data = await res.json();
    setTranscript(data.transcript);
    setLoading(false);
    fetchSessions();
  };

  const handleMoM = async () => {
    if (!transcript) return alert("Transcribe audio first.");
    setLoading(true);
    setLoadingMsg("Gemini 3.0 is finalizing the Parliamentary Record...");
    await fetch("http://localhost:8000/api/gemini", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, session_id: activeSession.id })
    });
    setLoading(false);
    fetchSessions();
  };

  const formatTime = (ts) => new Date(parseInt(ts) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // SEARCH: Filters by both Title and the Date string
  const filtered = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-white text-black overflow-hidden font-sans relative">
      {loading && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in">
          <Loader2 className="text-[#002c5f] animate-spin mb-4" size={60} strokeWidth={3} />
          <p className="text-xl font-bold tracking-tight text-[#002c5f] uppercase text-center px-10">{loadingMsg}</p>
        </div>
      )}

      {view === 'home' ? (
        <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-700">
          <header className="flex justify-between items-end mb-10 border-b-2 border-[#002c5f] pb-6">
            <div>
              <h1 className="text-4xl font-black text-[#002c5f] tracking-tighter flex items-center gap-3">
                <ShieldCheck size={40} className="text-yellow-600" /> DIGITAL SANSAD
              </h1>
              <p className="text-black/60 mt-1 font-bold tracking-widest uppercase text-[10px]">Governance Portal | Solapur</p>
            </div>
            <div className="flex bg-white p-2 rounded-xl border border-black/10 shadow-xl gap-2">
              <input className="bg-slate-50 p-3 rounded-lg text-black w-64 outline-none font-bold text-sm border border-slate-200"
                placeholder="Enter Meeting Title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <button onClick={startMeeting} className="bg-[#002c5f] hover:bg-black text-white px-6 py-3 rounded-lg font-black text-xs transition-all active:scale-95">
                <Plus size={18} className='inline mr-1'/> START SESSION
              </button>
            </div>
          </header>

          <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[#002c5f] uppercase tracking-widest flex items-center gap-2">
                <History size={24} /> Session Archive
              </h2>
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-black/30 group-focus-within:text-[#002c5f]" size={18} />
                <input className="pl-10 pr-4 py-2 bg-slate-50 rounded-full w-80 border border-slate-200 outline-none focus:ring-1 ring-black font-bold text-sm transition-all"
                   placeholder="Search by Title or Date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="text-black/40 text-[11px] uppercase tracking-widest border-b border-black/5">
                  <th className="pb-4 px-4 font-black">Meeting Title</th>
                  <th className="pb-4 font-black">Date & Time</th>
                  <th className="pb-4 text-center font-black">AI Documentation</th>
                  <th className="pb-4 text-right font-black">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-4 font-bold text-md text-black/80">{s.title}</td>
                    <td className="py-4 text-sm font-medium text-black/40">{s.date}</td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {s.mom_ready && (
                          <button onClick={() => fetch(`http://localhost:8000/api/open_mom?session_id=${s.id}`)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-200 hover:bg-[#002c5f] hover:text-white transition">
                            OPEN MoM
                          </button>
                        )}
                        {s.transcript_ready && <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200">TRANSCRIPT READY</span>}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button onClick={() => { setActiveSession(s); setView('session'); }} className="text-[#002c5f] hover:text-black font-black text-[11px] uppercase tracking-wider">
                        Manage Records
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex h-full animate-in slide-in-from-right duration-500 bg-white">
          <aside className="w-[420px] bg-white border-r border-black/5 flex flex-col shadow-inner">
            <div className="p-6 bg-[#002c5f] border-b-8 border-yellow-500">
              <button onClick={() => setView('home')} className="mb-4 flex items-center gap-2 text-xs font-black text-blue-200 hover:text-white transition uppercase tracking-widest">
                <ChevronLeft size={16} /> Back to Archive
              </button>
              <h2 className="text-xl font-black text-white truncate uppercase">{activeSession?.title}</h2>
              <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.2em] mt-1 opacity-80">{activeSession?.date}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {files.map((file, i) => (
                <div key={file.filename} className="bg-white p-5 rounded-xl border border-black/5 shadow-sm border-l-4 border-l-[#002c5f]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[75%]">
                      <p className="font-black text-black/80 text-md uppercase leading-tight truncate">
                        {file.name.replace(/\./g, ' ')}
                      </p>
                      <span className="inline-block mt-1 text-[10px] text-[#002c5f] font-black uppercase tracking-widest bg-[#002c5f]/5 px-2 py-0.5 rounded">{file.designation}</span>
                    </div>
                    <div className="bg-white text-black border border-black/10 px-2 py-1 rounded-lg font-mono text-[10px] font-black flex items-center gap-1 shadow-sm">
                       <Clock size={12} className="text-blue-600"/> {formatTime(file.timestamp)}
                    </div>
                  </div>
                  <audio controls preload="none" className="w-full h-8" src={`http://localhost:8000/data/${file.sid}/recordings/${file.filename}`} />
                </div>
              ))}
            </div>
          </aside>

          <main className="flex-1 flex flex-col bg-white">
            <header className="h-20 bg-white border-b border-black/5 flex items-center justify-between px-10 shadow-sm">
               <h1 className="text-sm font-black text-[#002c5f] uppercase tracking-widest italic">Live Master Session Editor</h1>
               <div className="flex gap-4">
                  <button onClick={handleTranscribe} className="bg-emerald-600 hover:bg-black text-white px-6 py-2 rounded-xl font-black text-xs transition-all uppercase active:scale-95">1. Process Audio</button>
                  <button onClick={handleMoM} className="bg-[#002c5f] hover:bg-black text-white px-6 py-2 rounded-xl font-black text-xs transition-all uppercase active:scale-95">2. Generate MoM</button>
               </div>
            </header>
            <div className="flex-1 p-8 bg-slate-50/50">
              <div className="h-full bg-white rounded-3xl shadow-2xl overflow-hidden border-[12px] border-white relative">
                <textarea 
                  className="w-full h-full p-10 text-black/80 text-lg leading-relaxed outline-none font-bold placeholder:text-slate-200"
                  value={transcript} onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Recordings will be transcribed here..."
                />
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;