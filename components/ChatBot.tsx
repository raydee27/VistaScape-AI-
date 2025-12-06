import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Image as ImageIcon, Paperclip } from 'lucide-react';
import { ChatMessage, ImageData } from '../types';
import { sendChatMessage } from '../services/geminiService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Welcome. I am your design assistant. How may I assist with your vision today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, selectedImage]);

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: inputValue.trim(),
      image: selectedImage || undefined
    };
    
    setInputValue('');
    setSelectedImage(null);

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyForApi = messages; 
      const responseText = await sendChatMessage(historyForApi, userMsg.text, userMsg.image);
      const botMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Service temporarily unavailable. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage({
        base64: reader.result as string,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasFiles = Array.from(e.dataTransfer.items || []).some((item: any) => item.kind === 'file');
    if (!hasFiles) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 z-[90] w-14 h-14 bg-black text-white hover:bg-neutral-800 transition-all duration-300 flex items-center justify-center border border-transparent hover:border-black hover:bg-white hover:text-black
          ${isOpen ? 'rotate-90' : ''}
        `}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={24} strokeWidth={1.5} /> : <MessageCircle size={24} strokeWidth={1.5} />}
      </button>

      <div 
        className={`fixed bottom-28 right-8 w-[90vw] md:w-96 bg-white border border-black z-[90] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none translate-y-4'}
        `}
        style={{ height: '500px', maxHeight: '70vh' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-black m-4">
            <div className="flex flex-col items-center">
              <ImageIcon size={32} className="text-black mb-2" strokeWidth={1} />
              <span className="text-black font-bold uppercase tracking-widest text-xs">Drop image</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-black p-5 flex items-center gap-3 text-white shrink-0">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-[0.2em]">Assistant</h3>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white scrollbar-thin scrollbar-thumb-black">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] uppercase text-neutral-400 font-medium tracking-wider">
                {msg.role === 'user' ? 'You' : 'VistaScape'}
              </span>
              
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.image && (
                  <img 
                    src={msg.image.base64} 
                    alt="Uploaded content" 
                    className="mb-2 max-h-48 object-cover border border-neutral-200"
                  />
                )}
                <div className={`text-sm leading-relaxed font-light ${
                  msg.role === 'user' 
                    ? 'text-black' 
                    : 'text-neutral-600'
                }`}>
                  {msg.text || (msg.image ? "Analyzed this image." : "")}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex flex-col items-start gap-2">
               <span className="text-[10px] uppercase text-neutral-400 font-medium tracking-wider">VistaScape</span>
               <div className="flex items-center gap-2 text-neutral-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs font-light">Processing...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img 
                src={selectedImage.base64} 
                alt="Selected" 
                className="h-16 w-16 object-cover border border-neutral-200" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-black text-white p-1 hover:bg-neutral-800"
              >
                <X size={10} />
              </button>
            </div>
          )}
          
          <div className="relative flex items-end gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-neutral-400 hover:text-black transition-colors"
              title="Upload"
            >
              <Paperclip size={18} strokeWidth={1.5} />
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedImage ? "Add instructions..." : "Type your message..."}
                className="w-full p-3 bg-transparent border-b border-neutral-200 focus:border-black text-sm outline-none transition-all placeholder:text-neutral-300 font-light"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className="p-3 text-black hover:opacity-70 disabled:opacity-30 transition-opacity"
            >
              <Send size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};