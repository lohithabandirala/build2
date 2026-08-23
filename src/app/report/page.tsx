"use client";

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import VoiceRecorder from '@/components/VoiceRecorder';
import { LuImage, LuSend, LuMapPin, LuCircleCheck } from 'react-icons/lu';
import { motion } from 'framer-motion';

export default function ReportPage() {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let storedId = localStorage.getItem('awaaz_citizen_id');
    if (!storedId) {
      storedId = "citizen_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('awaaz_citizen_id', storedId);
    }
    setUserId(storedId);
  }, []);

  // Auto-select category based on keywords in text
  useEffect(() => {
    if (!text) return;
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/(road|pothole|street|traffic|highway|asphalt)/)) {
      setCategory('roads');
    } else if (lowerText.match(/(water|pipe|drain|sewage|leak|flood|borewell)/)) {
      setCategory('water');
    } else if (lowerText.match(/(power|electricity|wire|light|transformer|blackout|outage)/)) {
      setCategory('electricity');
    } else if (lowerText.match(/(hospital|clinic|health|garbage|trash|waste|mosquito)/)) {
      setCategory('health');
    } else if (lowerText.match(/(school|teacher|class|college|education)/)) {
      setCategory('education');
    }
  }, [text]);

  const handleTranscription = (transcript: string) => {
    setText((prev) => prev ? prev + ' ' + transcript : transcript);
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          
          try {
             // Reverse geocode to get a readable full address
             const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
             const data = await res.json();
             const locName = data.display_name || "Unknown Area";
             setLocationName(locName);
          } catch (e) {
             console.error("Geocoding failed", e);
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error(error);
          alert("Could not get location. Please allow location permissions.");
          setLocationLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // Base64 string for Gemini API
        setBase64Image((reader.result as string).split(',')[1]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Send text (and optional image) to Gemini to get AI analysis
      const geminiRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageBase64: base64Image })
      });
      const geminiData = await geminiRes.json();
      
      const ai_analysis = geminiData.success ? geminiData.ai_analysis : null;

      // 2. Save the report to our in-memory database
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          category,
          location,
          locationName,
          imageUrl: imagePreview,
          ai_analysis,
          status: 'Open',
          userId
        })
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to submit feedback. Please check your API key.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container">
        <Navigation />
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel" 
            style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '500px' }}
          >
            <LuCircleCheck size={64} color="var(--primary)" />
            <h2 style={{ fontSize: '2rem', fontWeight: 600 }}>Thank You!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.125rem' }}>
              आपका संदेश प्राप्त हुआ है – your input has been recorded and is being analyzed by our AI to inform future policies.
            </p>
            <button onClick={() => { setSubmitted(false); setText(''); }} className="glass-button hover-scale" style={{ marginTop: '2rem' }}>
              Report Another Issue
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Report an Issue</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem' }}>
            Help us improve our infrastructure. Provide details via voice, text, or photos.
          </p>
        </div>

        <VoiceRecorder onTranscription={handleTranscription} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>OR TYPE IT OUT</span>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Describe the issue</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="E.g., The main road in Sector 15 has multiple large potholes..."
                style={{ 
                  width: '100%', minHeight: '120px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '12px', 
                  padding: '1rem',
                  color: '#fff',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ 
                    width: '100%', height: '48px',
                    background: 'rgba(0,0,0,0.3)', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: '12px', 
                    padding: '0 1rem',
                    color: '#fff',
                    fontFamily: 'inherit',
                  }}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  <option value="roads">Roads & Transport</option>
                  <option value="water">Water & Sanitation</option>
                  <option value="electricity">Electricity</option>
                  <option value="health">Public Health</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Location</label>
                <button 
                  type="button" 
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="glass-button" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '48px', width: '100%', borderColor: location ? 'var(--primary)' : undefined }}
                >
                  <LuMapPin /> {locationLoading ? 'Detecting...' : locationName ? locationName : location ? 'Location Detected' : 'Auto-detect Location'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Upload Photos (Optional)</label>
               <label style={{ 
                  width: '100%', height: imagePreview ? 'auto' : '100px', minHeight: '100px',
                  border: '2px dashed var(--glass-border)', 
                  borderRadius: '12px', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <LuImage size={24} style={{ marginBottom: '0.5rem' }} />
                      <span>Click to upload or drag and drop</span>
                    </>
                  )}
               </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !text}
            className="primary-button hover-scale" 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
              fontSize: '1.125rem', height: '56px', width: '100%',
              opacity: (isSubmitting || !text) ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Analyzing & Submitting...' : (
              <>Submit Feedback <LuSend /></>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
