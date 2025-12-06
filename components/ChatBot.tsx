import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, ArrowUp, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { ChatMessage, ImageData } from '../types';
import { sendChatMessage } from '../services/geminiService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'VistaScape AI Assistant online. Awaiting design inquiry.' }
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
      setMessages(prev => [...prev, { role: 'model', text: "Service temporarily unavailable." }]);
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
        className={`fixed bottom-0 right-8 z-[90] w-16 h-16 bg-black text-white flex items-center justify-center transition-all duration-300
          ${isOpen ? 'translate-y-0' : '-translate-y-0'} hover:bg-neutral-800
        `}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={20} strokeWidth={1} /> : <MessageSquare size={20} strokeWidth={1} />}
      </button>

      <div 
        className={`fixed bottom-16 right-8 w-[90vw] md:w-[400px] bg-white border border-black z-[80] flex flex-col transition-all duration-500 origin-bottom-right shadow-2xl
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 pointer-events-none'}
        `}
        style={{ height: '600px', maxHeight: '75vh' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="serif-title text-lg leading-none mb-1">Concierge</h3>
            <div className="text-[10px] font-bold uppercase tracking-ultra opacity-70">Design Assistant</div>
          </div>
          <div className="w-2 h-2 bg-white animate-pulse"></div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white scrollbar-thin scrollbar-thumb-black">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[9px] uppercase text-neutral-400 font-bold tracking-ultra">
                {msg.role === 'user' ? 'Client' : 'System'}
              </span>
              
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.image && (
                  <img 
                    src={msg.image.base64} 
                    alt="Context" 
                    className="mb-4 w-32 h-32 object-cover border border-black"
                  />
                )}
                <div className={`text-sm leading-loose font-serif ${
                  msg.role === 'user' 
                    ? 'text-black' 
                    : 'text-neutral-600'
                }`}>
                  {msg.text || (msg.image ? "Image attached for reference." : "")}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex flex-col items-start gap-2">
               <span className="text-[9px] uppercase text-neutral-400 font-bold tracking-ultra">System</span>
               <div className="flex items-center gap-3">
                  <div className="w-1 h-1 bg-black animate-bounce"></div>
                  <div className="w-1 h-1 bg-black animate-bounce delay-100"></div>
                  <div className="w-1 h-1 bg-black animate-bounce delay-200"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-black shrink-0">
          {selectedImage && (
            <div className="mb-4 flex items-center gap-4 bg-neutral-50 p-2 border border-neutral-200">
              <img 
                src={selectedImage.base64} 
                alt="Selected" 
                className="h-10 w-10 object-cover grayscale" 
              />
              <span className="text-[10px] uppercase font-bold tracking-widest flex-1">Image Attached</span>
              <button 
                onClick={() => setSelectedImage(null)}
                className="hover:bg-black hover:text-white p-1 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-0 border-b border-black pb-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="pr-4 text-neutral-400 hover:text-black transition-colors"
            >
              <Plus size={20} strokeWidth={1} />
            </button>

            <div className="flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type directive..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-light placeholder:text-neutral-300 outline-none"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className="pl-4 text-black hover:opacity-50 disabled:opacity-20 transition-opacity"
            >
              <ArrowUp size={20} strokeWidth={1} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};