import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export const SeanceChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Saludos, mortal. Soy el guardián del Legacy. He procesado tus datos. ¿Qué deseas saber sobre los registros ocultos?',
      sender: 'agent',
      timestamp: new Date()
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // LLAMADA REAL AL SERVIDOR
      const response = await fetch('http://localhost:4000/api/seance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.text })
      });

      const data = await response.json();

      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || "El espíritu guarda silencio...",
        sender: 'agent',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentResponse]);
    } catch (error) {
      console.error('Error en la sesión:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Error de conexión con el más allá...",
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[600px] flex flex-col bg-gray-900 rounded-lg border border-purple-500/30 shadow-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]" />
        <h2 className="font-bold text-purple-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Séance Mode: Talk to your Data
        </h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-black">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-purple-600'}
            `}>
              {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`
              max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
              ${msg.sender === 'user' 
                ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-none' 
                : 'bg-purple-600/20 text-purple-100 border border-purple-500/30 rounded-tl-none'}
            `}>
              {msg.text}
              <div className="text-[10px] opacity-50 mt-1 text-right">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-700">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the claims (e.g., 'Why was Dubai rejected?')"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Invoke</span>
          </button>
        </div>
      </div>
    </div>
  );
};