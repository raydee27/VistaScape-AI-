import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Image as ImageIcon, Paperclip } from 'lucide-react';
import { ChatMessage, ImageData } from '../types';
import { sendChatMessage } from '../services/geminiService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I can help you with landscaping ideas or questions about using VistaScape AI. You can also show me photos for advice!' }
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
    
    // Reset input states immediately
    setInputValue('');
    setSelectedImage(null);

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Pass the current history (excluding the new user message we just added visually).
      const historyForApi = messages; 
      
      const responseText = await sendChatMessage(historyForApi, userMsg.text, userMsg.image);
      
      const botMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again." }]);
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
    // Reset so same file can be selected again
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only activate if dragging files
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
    // Only reset state if we've left the drop zone completely
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
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[90] p-4 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center
          ${isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-leaf-600 text-white hover:bg-leaf-700 hover:scale-105'}
        `}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-[90vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[90] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
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
          <div className="absolute inset-0 bg-leaf-500/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-leaf-500 m-2 rounded-xl pointer-events-none">
            <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex flex-col items-center animate-bounce">
              <ImageIcon size={32} className="text-leaf-600 mb-2" />
              <span className="text-leaf-800 font-medium">Drop image to analyze</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-leaf-600 p-4 flex items-center gap-3 text-white shrink-0">
          <div className="p-2 bg-white/20 rounded-full">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">VistaScape Assistant</h3>
            <p className="text-xs text-leaf-100 flex items-center gap-1">
              <Sparkles size={10} /> Powered by Gemini
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-200">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-leaf-100 text-leaf-700'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[80%]`}>
                {msg.image && (
                  <img 
                    src={msg.image.base64} 
                    alt="Uploaded content" 
                    className={`rounded-lg max-h-48 object-cover border ${msg.role === 'user' ? 'border-gray-700 ml-auto' : 'border-gray-200'}`}
                  />
                )}
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gray-800 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                }`}>
                  {msg.text || (msg.image ? "Analyzed this image." : "")}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-2.5">
               <div className="w-8 h-8 rounded-full bg-leaf-100 text-leaf-700 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-leaf-600" />
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img 
                src={selectedImage.base64} 
                alt="Selected" 
                className="h-16 w-16 object-cover rounded-lg border border-gray-200 shadow-sm" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors shadow-md"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="relative flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-leaf-600 hover:bg-leaf-50 rounded-xl transition-colors"
              title="Upload image"
            >
              <Paperclip size={20} />
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedImage ? "Send to analyze..." : "Ask a question..."}
                className="w-full pl-4 pr-10 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-leaf-300 focus:ring-2 focus:ring-leaf-100 rounded-xl text-sm outline-none transition-all"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className="p-3 bg-leaf-600 text-white rounded-xl hover:bg-leaf-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};