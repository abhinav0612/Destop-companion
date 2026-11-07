import React, { useState } from 'react';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hey Abhinav! I'm online." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput("");
    setLoading(true);

    if (ipcRenderer) {
      const botReply = await ipcRenderer.invoke('ask-companion', userText);
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
        </div>

        <form onSubmit={handleSend} style={styles.form}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type a message..." 
            style={styles.input}
          />
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: '#1e1e2e', // Solid color for now so it's clearly visible
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
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#11111b',
    color: '#fff',
    outline: 'none',
  }
};

export default App;