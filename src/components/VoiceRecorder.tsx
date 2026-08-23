"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LuMic, LuSquare, LuLoader } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const { language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        stopRecording();
      };
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert("Speech Recognition API is not supported in this browser.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      setIsRecording(false);
      recognitionRef.current.stop();
      setIsProcessing(true);
      
      // Simulate API call processing delay
      setTimeout(() => {
        setIsProcessing(false);
        if (transcript) {
           onTranscription(transcript);
        }
      }, 1000);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Record your issue</h3>
      <p style={{ color: 'var(--foreground-muted)', textAlign: 'center' }}>
        Speak in Hindi, English, or your local language. We will automatically transcribe and process it.
      </p>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px' }}>
        {isRecording && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              width: '100px', height: '100px',
              borderRadius: '50%',
              background: 'var(--primary-glow)',
              zIndex: 0
            }}
          />
        )}
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            width: '80px', height: '80px',
            borderRadius: '50%',
            background: isRecording ? 'var(--accent)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'var(--foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
            boxShadow: isRecording ? '0 0 20px rgba(244, 63, 94, 0.5)' : '0 4px 14px var(--primary-glow)',
            transition: 'all 0.3s ease'
          }}
          className="hover-scale"
        >
          {isProcessing ? (
             <LuLoader size={32} className="animate-spin" />
          ) : isRecording ? (
             <LuSquare size={32} />
          ) : (
             <LuMic size={36} color="#000" />
          )}
        </button>
      </div>

      <div style={{
        width: '100%', minHeight: '80px',
        background: 'var(--glass-border)',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontStyle: transcript ? 'normal' : 'italic',
        color: transcript ? '#fff' : 'var(--foreground-muted)'
      }}>
        {isProcessing ? 'Processing audio...' : (transcript || 'Transcription will appear here...')}
      </div>
    </div>
  );
}
