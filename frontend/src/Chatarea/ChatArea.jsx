import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, User, Bot, AlertCircle } from 'lucide-react';

const ChatArea = () => {
  const defaultMessages = [
    { text: 'Hello! I am DocuChat. Please upload a PDF using the button above and ask me questions about it.', sender: 'bot' },
  ];
  
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : defaultMessages;
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('chat_messages', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages((prev) => {
      const updated = [...prev, { text: input, sender: 'user' }];
      sessionStorage.setItem('chat_messages', JSON.stringify(updated));
      return updated;
    });
    
    setInput('');
    setLoading(true);
    
    fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((msgs) => {
          let updated;
          if (data.response) {
            updated = [...msgs, { text: data.response, sender: 'bot' }];
          } else {
            updated = [...msgs, { text: data.error || 'Error: No response from server.', sender: 'bot', isError: true }];
          }
          sessionStorage.setItem('chat_messages', JSON.stringify(updated));
          return updated;
        });
      })
      .catch((err) => {
        setMessages((msgs) => {
          const updated = [...msgs, { text: 'Error: ' + err.message, sender: 'bot', isError: true }];
          sessionStorage.setItem('chat_messages', JSON.stringify(updated));
          return updated;
        });
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-950">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-24 py-8 flex flex-col gap-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-4 max-w-4xl w-full ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
          >
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${msg.sender === 'user' ? 'bg-cyan-600' : 'bg-gray-700'}`}>
              {msg.sender === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-cyan-400" />}
            </div>
            <div
              className={`px-5 py-4 rounded-2xl text-[15px] leading-relaxed max-w-[80%] ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-sm'
                  : msg.isError 
                    ? 'bg-red-900/50 text-red-200 border border-red-800 rounded-tl-sm'
                    : 'bg-gray-800/80 text-gray-200 rounded-tl-sm shadow-sm border border-gray-700/50'
              }`}
            >
              {msg.sender === 'bot' && !msg.isError ? (
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 max-w-4xl w-full self-start">
             <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center mt-1">
               <Bot size={18} className="text-cyan-400" />
             </div>
             <div className="px-5 py-4 rounded-2xl bg-gray-800/80 rounded-tl-sm border border-gray-700/50 flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                <span className="text-gray-400 text-sm animate-pulse">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-950 border-t border-gray-800/50">
        <form className="max-w-4xl mx-auto relative flex items-center" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your document..."
            className="w-full pl-6 pr-14 py-4 bg-gray-900 border border-gray-700 text-gray-100 rounded-2xl text-[15px] outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-sm placeholder:text-gray-500"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="absolute right-3 p-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim() || loading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
