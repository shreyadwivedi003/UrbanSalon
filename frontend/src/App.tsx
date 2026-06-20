import React, { useState, useEffect, useRef } from 'react';

interface StyleRecommendation {
  faceShape: string;
  skinTone: string;
  isSimulation?: boolean;
  simulationNotice?: string;
  primaryRecommendation: {
    name: string;
    matchPercentage: number;
    isTrending: boolean;
    description: string;
    reasons: string;
  };
  subRecommendations: Array<{ name: string; description: string }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'ai' | 'bookings' | 'partners'>('ai');
  const [aiResult, setAiResult] = useState<StyleRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Camera Management States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form inputs
  const [clientName, setClientName] = useState('');
  const [treatmentName, setTreatmentName] = useState('Structured Glass Bob');
  const [partnerName, setPartnerName] = useState('');
  const [partnerSpecialty, setPartnerSpecialty] = useState('Editorial Hair');

  useEffect(() => {
    fetchBookings();
    fetchPartners();
    return () => stopCamera(); // Cleanup stream when leaving app
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/partners');
      const data = await res.json();
      setPartners(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 📹 Start Live Webcam Video Feed
  const startCamera = async () => {
    setAiResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 300, facingMode: "user" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Please allow camera access permissions to activate the scanner device!");
    }
  };

  // 🛑 Shut down hardware streams
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // 📸 Capture Current Frame & Run Gemini
  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      // Paint current video frame coordinates onto flat layout
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
      }
      
      const capturedBase64 = canvas.toDataURL('image/jpeg');
      stopCamera(); // Turn off camera light immediately after snap

      const response = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedBase64,
          mimeType: "image/jpeg"
        })
      });
      
      const data = await response.json();
      setAiResult(data);

      // Automatically select the primary recommendation as the active choice in your booking form
      if (data?.primaryRecommendation?.name) {
        setTreatmentName(data.primaryRecommendation.name);
      }
    } catch (err) {
      console.error("Analysis sequence crashed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return alert("Please enter client name");
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, treatment: treatmentName, time: "14:00 PM", date: new Date().toLocaleDateString() })
      });
      const updatedList = await res.json();
      setBookings(updatedList);
      setClientName('');
      alert("Appointment Confirmed!");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartnerApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName) return alert("Please enter your name");
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: partnerName, specialty: partnerSpecialty })
      });
      const data = await res.json();
      setPartners(data.collective);
      setPartnerName('');
      alert("Application submitted!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: '"Segoe UI", sans-serif', backgroundColor: '#090d16', color: '#f0f6fc', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '1px solid #21262d', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px' }}>
          <svg 
            width="60" 
            height="60" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0px 0px 8px rgba(240, 230, 210, 0.2))' }}
          >
            {/* Abstract Scissors Loop left */}
            <circle cx="35" cy="40" r="12" stroke="#f0e6d2" strokeWidth="4" />
            {/* Abstract Scissors Loop right */}
            <circle cx="65" cy="40" r="12" stroke="#f0e6d2" strokeWidth="4" />
            {/* AI Diamond/Prism Intersection Center */}
            <path d="M50 20 L62 45 L50 70 L38 45 Z" stroke="#388bfd" strokeWidth="3" strokeLinejoin="round" fill="rgba(56, 139, 253, 0.1)" />
            {/* Precision cutting blades fading down */}
            <path d="M42 48 L48 85" stroke="#f0e6d2" strokeWidth="4" strokeLinecap="round" />
            <path d="M58 48 L52 85" stroke="#f0e6d2" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        <h1 style={{ color: '#f0e6d2', margin: '0 0 10px 0', fontSize: '2.5rem', letterSpacing: '1px' }}>URBAN SALON</h1>
        <p style={{ color: '#8b949e', margin: '0' }}>Bespoke AI Style Lab & Marketplace Engine</p>
        
        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button onClick={() => { setActiveTab('ai'); stopCamera(); }} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '20px', border: '1px solid #30363d', backgroundColor: activeTab === 'ai' ? '#f0e6d2' : '#161b22', color: activeTab === 'ai' ? '#090d16' : '#c9d1d9', fontWeight: 'bold' }}>
            🔮 Gemini AI Diagnostic
          </button>
          <button onClick={() => { setActiveTab('bookings'); stopCamera(); }} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '20px', border: '1px solid #30363d', backgroundColor: activeTab === 'bookings' ? '#f0e6d2' : '#161b22', color: activeTab === 'bookings' ? '#090d16' : '#c9d1d9', fontWeight: 'bold' }}>
            📅 Bookings Manager
          </button>
          <button onClick={() => { setActiveTab('partners'); stopCamera(); }} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '20px', border: '1px solid #30363d', backgroundColor: activeTab === 'partners' ? '#f0e6d2' : '#161b22', color: activeTab === 'partners' ? '#090d16' : '#c9d1d9', fontWeight: 'bold' }}>
            💼 Stylist Network
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {activeTab === 'ai' && (
          <div style={{ backgroundColor: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d', textAlign: 'center' }}>
            <h2>Real-Time Facial Symmetry Scan</h2>
            <p style={{ color: '#8b949e', marginBottom: '25px' }}>Activate your device's video lens profile matrix to extract hair design parameters.</p>
            
            {/* VIDEO VIEWPORT CONTAINER */}
            <div style={{ width: '400px', height: '300px', backgroundColor: '#090d16', margin: '0 auto 20px auto', borderRadius: '8px', border: '2px dashed #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraActive ? 'block' : 'none' }} />
              {!isCameraActive && !loading && !aiResult && (
                <span style={{ color: '#8b949e' }}>Camera Lens Standby Mode</span>
              )}
              {loading && (
                <div style={{ position: 'absolute', background: 'rgba(9,13,22,0.8)', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#58a6ff', fontWeight: 'bold' }}>⏳ Gemini Evaluating Geometry...</span>
                </div>
              )}
            </div>

            {/* CONTROLS */}
            {!isCameraActive && !loading && (
              <button onClick={startCamera} style={{ padding: '12px 24px', fontSize: '1rem', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '60%' }}>
                Turn On Video Camera
              </button>
            )}

            {isCameraActive && (
              <button onClick={captureAndAnalyze} style={{ padding: '12px 24px', fontSize: '1rem', background: '#388bfd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '60%' }}>
                📸 Capture & Run Diagnostic Match
              </button>
            )}

            {/* LIVE RESULTS MATRIX DISPLAY */}
            {aiResult && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #30363d', paddingTop: '20px', textAlign: 'left' }}>
                {aiResult.isSimulation && (
                  <div style={{ padding: '10px', backgroundColor: '#382314', border: '1px solid #f2a154', borderRadius: '6px', color: '#ffbd7a', marginBottom: '15px' }}>
                    💡 {aiResult.simulationNotice}
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  <div style={{ background: '#090d16', padding: '15px', borderRadius: '8px', border: '1px solid #21262d' }}>
                    <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>IDENTIFIED FACE GEOMETRY</span>
                    <h3 style={{ margin: '5px 0 0 0', color: '#f0e6d2' }}>{aiResult.faceShape}</h3>
                  </div>
                  <div style={{ background: '#090d16', padding: '15px', borderRadius: '8px', border: '1px solid #21262d' }}>
                    <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>ESTIMATED LUXURY SKIN TONE</span>
                    <h3 style={{ margin: '5px 0 0 0', color: '#f0e6d2' }}>{aiResult.skinTone}</h3>
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(145deg, #1f242c, #161b22)', padding: '20px', borderRadius: '8px', border: '1px solid #388bfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#58a6ff' }}>👑 Primary Match: {aiResult.primaryRecommendation.name}</h3>
                    <span style={{ background: '#388bfd', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {aiResult.primaryRecommendation.matchPercentage}% Suitability
                    </span>
                  </div>
                  <p style={{ color: '#c9d1d9' }}>{aiResult.primaryRecommendation.description}</p>
                  <p style={{ fontSize: '0.9rem', color: '#8b949e', fontStyle: 'italic' }}><strong>Rationale:</strong> {aiResult.primaryRecommendation.reasons}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', border: '1px solid #30363d' }}>
              <h3>Secure Live Checkout Slot</h3>
              <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client Profile Name" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#090d16', color: 'white' }} />
                <select 
                  value={treatmentName} 
                  onChange={(e) => setTreatmentName(e.target.value)} 
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#090d16', color: 'white', width: '100%', cursor: 'pointer' }}
                >
                  {/* Baseline options before analysis */}
                  {!aiResult && (
                    <>
                      <option value="Structured Glass Bob">Structured Glass Bob</option>
                      <option value="Curtain Fringe Accentuation">Curtain Fringe Accentuation</option>
                    </>
                  )}

                  {/* Top Match recommendation option */}
                  {aiResult?.primaryRecommendation && (
                    <option value={aiResult.primaryRecommendation.name}>
                      ✨ {aiResult.primaryRecommendation.name} (AI Top Match)
                    </option>
                  )}

                  {/* Alternative recommendation options */}
                  {aiResult?.subRecommendations?.map((style: any, index: number) => (
                    <option key={index} value={style.name}>
                      ✨ {style.name} (AI Alternative)
                    </option>
                  ))}
                </select>
                <button type="submit" style={{ padding: '10px', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Commit Slot</button>
              </form>
            </div>
            <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', border: '1px solid #30363d' }}>
              <h3>Active Ledger Operations ({bookings.length})</h3>
              {bookings.map((b, i) => (
                <div key={i} style={{ background: '#090d16', padding: '10px', marginBottom: '10px', borderRadius: '6px' }}>
                  <strong>{b.clientName}</strong> - {b.treatment}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARTNERS TAB */}
        {activeTab === 'partners' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', border: '1px solid #30363d' }}>
              <h3>Apply as Service Partner</h3>
              <form onSubmit={handlePartnerApply} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Professional Name" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#090d16', color: 'white' }} />
                <button type="submit" style={{ padding: '10px', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Apply</button>
              </form>
            </div>
            <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', border: '1px solid #30363d' }}>
              <h3>Vetting Pool ({partners.length})</h3>
              {partners.map((p, i) => (
                <div key={i} style={{ background: '#090d16', padding: '10px', marginBottom: '10px', borderRadius: '6px' }}>{p.name}</div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}