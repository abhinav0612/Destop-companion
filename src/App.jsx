import React, { useState, useRef } from 'react';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hey Abhinav! Click the mic to record or type below." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      // Start recording
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            setLoading(true);
            setMessages((prev) => [...prev, { sender: 'user', text: "🎤 [Voice Command Sent]" }]);

            if (ipcRenderer) {
              const botReply = await ipcRenderer.invoke('process-audio', base64Audio);
              setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
            } else {
              setMessages((prev) => [...prev, { sender: 'bot', text: "Browser test mode." }]);
            }
            setLoading(false);
          };
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input;
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput("");
    setLoading(true);

    if (ipcRenderer) {
      const botReply = await ipcRenderer.invoke('ask-companion', text);
      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    } else {
      setMessages((prev) => [...prev, { sender: 'bot', text: "Browser test mode." }]);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>🤖 Desktop Companion</span>
        <button onClick={() => window.close()} style={styles.closeBtn}>×</button>
      </div>

      <div style={styles.body}>
        <div style={styles.chatBox}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              ...styles.bubble, 
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', 
              background: msg.sender === 'user' ? '#4f46e5' : '#374151' 
            }}>
              {msg.text}
            </div>
          ))}
          {loading && <div style={{...styles.bubble, background: '#374151'}}>Thinking...</div>}
          {isRecording && <div style={{...styles.bubble, background: '#dc2626'}}>Recording... Click mic again to send 🎙️</div>}
        </div>

        <form onSubmit={handleTextSubmit} style={styles.form}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type or click mic..." 
            style={styles.input}
          />
          <button 
            type="button" 
            onClick={toggleRecording}
            style={{ ...styles.micBtn, background: isRecording ? '#ef4444' : '#374151' }}
            title="Click to record/stop"
          >
            🎙️
          </button>
          <button type="submit" style={styles.sendBtn}>➤</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: '#1e1e2e',
    color: '#fff',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '2px solid #6366f1',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  header: {
    height: '40px',
    background: '#11111b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    cursor: 'grab',
    WebkitAppRegion: 'drag',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    overflow: 'hidden',
  },
  chatBox: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px'
  },
  bubble: {
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    maxWidth: '85%',
    wordBreak: 'break-word',
  },
  form: {
    display: 'flex',
    gap: '6px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#11111b',
    color: '#fff',
    outline: 'none',
  },
  micBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    cursor: 'pointer',
    fontSize: '14px',
  },
  sendBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    cursor: 'pointer',
  }
};

export default App;