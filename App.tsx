import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ArrowRight, Copy, Download, Loader2, RefreshCw, Sparkles, Upload, X, Zap, Video as VideoIcon, Image as ImageIcon, Film, Monitor, Smartphone, Maximize2 } from 'lucide-react';
import { AppState, ImageData, VideoData } from './types';
import { generateImageEdit, analyzeImage, identifyFeatures, generateVideo, analyzeVideo } from './services/geminiService';
import { StepIndicator } from './components/StepIndicator';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ChatBot } from './components/ChatBot';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<VideoData | null>(null);
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string | null>(null);
  
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Intelligence States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState<string[]>([]);
  
  // Video Options
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // Mode selection
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mode, setMode] = useState<'image' | 'video' | 'analysis'>('image');
  
  const [fileName, setFileName] = useState<string>("");
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError("Please upload a valid image or video file.");
      return;
    }

    setFileName(file.name);
    setDetectedFeatures([]);
    setGeneratedVideo(null);
    setGeneratedImage(null);
    setGeneratedAnalysis(null);
    setMediaType(isImage ? 'image' : 'video');
    
    // Default mode based on media type
    if (isVideo) {
      setMode('analysis');
    } else {
      setMode('image');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImage({
        base64: reader.result as string,
        mimeType: file.type
      });
      setError(null);
      setAppState(AppState.DESCRIBE);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasFiles = Array.from(e.dataTransfer.items || []).some((item: any) => item.kind === 'file');
    if (!hasFiles) return;

    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt.trim()) return;
    setError(null);

    if (mode === 'image') {
      setAppState(AppState.GENERATING);
      try {
        const result = await generateImageEdit(originalImage, prompt);
        setGeneratedImage(result);
        setAppState(AppState.RESULT);
      } catch (e: any) {
        setError(e.message || "Failed to generate image.");
        setAppState(AppState.DESCRIBE);
      }
    } else if (mode === 'video') {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          try {
            await aistudio.openSelectKey();
          } catch (err) {
            setError("API Key selection failed or cancelled.");
            return;
          }
        }
      }

      setAppState(AppState.VIDEO_GENERATING);
      try {
        const result = await generateVideo(originalImage, prompt, videoResolution, videoAspectRatio);
        setGeneratedVideo(result);
        setAppState(AppState.RESULT);
      } catch (e: any) {
        setError(e.message || "Failed to generate video.");
        setAppState(AppState.DESCRIBE);
      }
    } else if (mode === 'analysis') {
      setAppState(AppState.GENERATING);
      try {
        const result = await analyzeVideo(originalImage, prompt);
        setGeneratedAnalysis(result);
        setAppState(AppState.RESULT);
      } catch (e: any) {
         setError(e.message || "Failed to analyze video.");
         setAppState(AppState.DESCRIBE);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!originalImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const suggestion = await analyzeImage(originalImage);
      setPrompt((prev) => {
        const separator = prev.trim() ? "\n\n" : "";
        return prev + separator + suggestion;
      });
    } catch (e: any) {
      setError("Failed to analyze image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleScanFeatures = async () => {
    if (!originalImage) return;
    setIsScanning(true);
    try {
      const features = await identifyFeatures(originalImage);
      setDetectedFeatures(features);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const addFeatureToPrompt = (feature: string) => {
    setPrompt(prev => {
        if (!prev) return `Keep the ${feature}`;
        return `${prev}, keep the ${feature}`;
    });
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD);
    setOriginalImage(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setGeneratedAnalysis(null);
    setPrompt("");
    setError(null);
    setFileName("");
    setDetectedFeatures([]);
    setMediaType('image');
    setMode('image');
    setVideoResolution('720p');
    setVideoAspectRatio('16:9');
  };

  const handleRefine = () => {
     setAppState(AppState.DESCRIBE);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    setShowFullPreview(true);
  };

  const isGenerating = appState === AppState.GENERATING || appState === AppState.VIDEO_GENERATING;

  if (showFullPreview && generatedImage && mode === 'image') {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-500">
        <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-6">
                <button 
                    onClick={() => setShowFullPreview(false)}
                    className="bg-black text-white p-4 hover:scale-105 transition-transform"
                >
                    <ArrowRight size={20} className="rotate-180" />
                </button>
                <span className="serif-title text-2xl bg-white px-2">
                    {fileName}
                </span>
            </div>
             <button 
                onClick={() => setShowFullPreview(false)}
                className="pointer-events-auto group flex items-center gap-3 bg-transparent hover:bg-black hover:text-white px-8 py-4 border border-black transition-all cursor-pointer"
            >
                <span className="font-bold tracking-widest text-xs uppercase">Close Preview</span>
                <X size={16} />
            </button>
        </div>
       
        <div className="flex-1 w-full h-full p-0 flex items-center justify-center overflow-hidden bg-white">
             <img 
                src={generatedImage.base64} 
                alt="Full Generated Preview" 
                className="w-full h-full object-contain"
             />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      {/* HEADER */}
      <nav className="border-b border-black px-8 py-8 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="serif-title text-3xl md:text-4xl leading-none">VistaScape</span>
            <div className="h-4 w-[1px] bg-black mx-2 hidden md:block"></div>
            <span className="text-[10px] font-bold tracking-ultra uppercase hidden md:block mt-1">
              Architectural Intelligence
            </span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-ultra flex gap-6">
            <span className="hover:line-through decoration-1 cursor-pointer">Archive</span>
            <span className="hover:line-through decoration-1 cursor-pointer">Collection</span>
            <span className="border-b border-black">Studio</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1920px] mx-auto relative flex flex-col">
        
        {/* PROGRESS LINE */}
        <div className="px-8 pt-12 pb-8">
             <StepIndicator currentState={appState} />
        </div>

        <div className="px-8 pb-16 flex-1 flex flex-col">
          
          {error && (
            <div className="bg-black text-white p-4 mb-8 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <AlertCircle size={16} />
                <p className="text-xs uppercase tracking-widest font-bold">{error}</p>
              </div>
              <button onClick={() => setError(null)}><X size={16} /></button>
            </div>
          )}

          {/* ----- UPLOAD STATE ----- */}
          {appState === AppState.UPLOAD && (
            <div className="flex flex-col items-center justify-center flex-1 animate-in fade-in duration-700">
              <div 
                onClick={triggerFileSelect}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    w-full max-w-xl aspect-square md:aspect-[4/3] border border-black 
                    flex flex-col items-center justify-center gap-8
                    transition-all duration-500 cursor-pointer relative overflow-hidden group
                    ${isDragging ? 'bg-black text-white' : 'bg-white hover:bg-neutral-50'}
                `}
              >
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-black group-hover:w-8 group-hover:h-8 transition-all"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-black group-hover:w-8 group-hover:h-8 transition-all"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-black group-hover:w-8 group-hover:h-8 transition-all"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-black group-hover:w-8 group-hover:h-8 transition-all"></div>

                <div className="flex flex-col items-center z-10">
                  <Upload strokeWidth={1} size={48} className="mb-6 group-hover:scale-110 transition-transform duration-500"/>
                  <h2 className="serif-title text-3xl mb-2">Upload Source</h2>
                  <p className="text-[10px] uppercase tracking-ultra font-bold text-neutral-400 group-hover:text-neutral-600">
                    Drop Image or Video
                  </p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 w-full max-w-4xl gap-0 border-t border-black">
                 <div className="p-6 border-r border-b md:border-b-0 border-l border-black group hover:bg-black hover:text-white transition-colors cursor-default">
                    <span className="block text-[10px] font-bold uppercase tracking-ultra mb-4 text-neutral-400 group-hover:text-white">01</span>
                    <h3 className="serif-title text-xl mb-2">Visual Edit</h3>
                    <p className="text-xs font-light leading-relaxed opacity-70">Transform architectural spaces with high-fidelity generation.</p>
                 </div>
                 <div className="p-6 border-r border-b md:border-b-0 border-black group hover:bg-black hover:text-white transition-colors cursor-default">
                    <span className="block text-[10px] font-bold uppercase tracking-ultra mb-4 text-neutral-400 group-hover:text-white">02</span>
                    <h3 className="serif-title text-xl mb-2">Cinematic Motion</h3>
                    <p className="text-xs font-light leading-relaxed opacity-70">Generate fluid 720p video from static architectural photography.</p>
                 </div>
                 <div className="p-6 border-r border-black group hover:bg-black hover:text-white transition-colors cursor-default">
                    <span className="block text-[10px] font-bold uppercase tracking-ultra mb-4 text-neutral-400 group-hover:text-white">03</span>
                    <h3 className="serif-title text-xl mb-2">Deep Analysis</h3>
                    <p className="text-xs font-light leading-relaxed opacity-70">Computer vision for detailed spatial and element reporting.</p>
                 </div>
              </div>
            </div>
          )}

          {/* ----- DESCRIBE STATE ----- */}
          {(appState === AppState.DESCRIBE || isGenerating) && originalImage && (
            <div className="flex flex-col lg:flex-row min-h-[600px] border border-black animate-in fade-in duration-500">
              
              {/* Left Column: Media */}
              <div className="lg:w-7/12 bg-neutral-100 relative border-b lg:border-b-0 lg:border-r border-black overflow-hidden flex items-center justify-center p-8">
                {mediaType === 'image' ? (
                  <img 
                    src={originalImage.base64} 
                    alt="Original" 
                    className="max-w-full max-h-full object-contain shadow-xl"
                  />
                ) : (
                  <video
                    src={originalImage.base64}
                    controls
                    className="max-w-full max-h-full object-contain shadow-xl"
                  />
                )}
                <div className="absolute top-0 left-0 bg-white border-r border-b border-black px-6 py-3">
                   <span className="text-[10px] font-bold uppercase tracking-ultra">Original Source</span>
                </div>
              </div>

              {/* Right Column: Controls */}
              <div className="lg:w-5/12 flex flex-col bg-white">
                 <div className="flex-1 p-8 md:p-12">
                    
                    {/* Mode Toggles */}
                    {mediaType === 'image' && (
                      <div className="grid grid-cols-2 gap-0 border border-black mb-12">
                        <button
                          onClick={() => setMode('image')}
                          disabled={isGenerating}
                          className={`py-4 text-[10px] font-bold uppercase tracking-ultra transition-colors ${
                            mode === 'image' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-50'
                          }`}
                        >
                          Transformation
                        </button>
                        <button
                          onClick={() => setMode('video')}
                          disabled={isGenerating}
                          className={`py-4 text-[10px] font-bold uppercase tracking-ultra transition-colors border-l border-black ${
                            mode === 'video' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-50'
                          }`}
                        >
                          Animation
                        </button>
                      </div>
                    )}

                    {/* Content Header */}
                    <div className="mb-8">
                       <h2 className="serif-title text-3xl mb-2">
                          {mode === 'image' ? 'Design Specification' : mode === 'video' ? 'Motion Directives' : 'Analysis Request'}
                       </h2>
                       <div className="w-12 h-[1px] bg-black"></div>
                    </div>

                    {/* Image Intelligence Tools */}
                    {mediaType === 'image' && mode === 'image' && (
                        <div className="mb-8 flex gap-4">
                           <button 
                             onClick={handleScanFeatures}
                             className="flex-1 flex items-center justify-center gap-2 border border-neutral-200 py-3 px-4 hover:border-black transition-colors group"
                           >
                             <Zap size={14} className={`text-neutral-400 group-hover:text-black ${isScanning ? 'animate-pulse' : ''}`}/>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-black">Identify Features</span>
                           </button>
                           <button 
                             onClick={handleAnalyze}
                             disabled={isAnalyzing}
                             className="flex-1 flex items-center justify-center gap-2 border border-neutral-200 py-3 px-4 hover:border-black transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             <Sparkles size={14} className={`text-neutral-400 group-hover:text-black ${isAnalyzing ? 'animate-spin text-black' : ''}`}/>
                             <span className={`text-[10px] font-bold uppercase tracking-widest group-hover:text-black ${isAnalyzing ? 'text-black' : 'text-neutral-400'}`}>
                               {isAnalyzing ? 'Thinking...' : 'Auto-Suggest'}
                             </span>
                           </button>
                        </div>
                    )}

                    {/* Video Options */}
                    {mode === 'video' && (
                        <div className="mb-8 grid grid-cols-2 gap-6 animate-in fade-in">
                           <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Monitor size={12} className="text-neutral-400"/>
                                <span className="text-[10px] font-bold uppercase tracking-ultra text-neutral-400">Aspect Ratio</span>
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                    onClick={() => setVideoAspectRatio('16:9')}
                                    className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-ultra transition-all ${videoAspectRatio === '16:9' ? 'bg-black text-white border-black' : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'}`}
                                 >
                                    16:9
                                 </button>
                                 <button 
                                    onClick={() => setVideoAspectRatio('9:16')}
                                    className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-ultra transition-all ${videoAspectRatio === '9:16' ? 'bg-black text-white border-black' : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'}`}
                                 >
                                    9:16
                                 </button>
                              </div>
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Maximize2 size={12} className="text-neutral-400"/>
                                <span className="text-[10px] font-bold uppercase tracking-ultra text-neutral-400">Resolution</span>
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                    onClick={() => setVideoResolution('720p')}
                                    className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-ultra transition-all ${videoResolution === '720p' ? 'bg-black text-white border-black' : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'}`}
                                 >
                                    720p
                                 </button>
                                 <button 
                                    onClick={() => setVideoResolution('1080p')}
                                    className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-ultra transition-all ${videoResolution === '1080p' ? 'bg-black text-white border-black' : 'bg-white text-neutral-400 border-neutral-200 hover:border-black hover:text-black'}`}
                                 >
                                    1080p
                                 </button>
                              </div>
                           </div>
                        </div>
                    )}

                    {detectedFeatures.length > 0 && (
                        <div className="mb-8 flex flex-wrap gap-2 animate-in fade-in">
                          {detectedFeatures.map((f, i) => (
                             <button key={i} onClick={() => addFeatureToPrompt(f)} className="text-[10px] uppercase border border-neutral-200 px-2 py-1 hover:bg-black hover:text-white transition-colors">{f}</button>
                          ))}
                        </div>
                    )}
                    
                    {/* Input Area */}
                    <div className="relative mb-6">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Detail your architectural vision..."
                        className="w-full h-48 p-0 bg-transparent border-none focus:ring-0 resize-none text-sm font-light leading-loose placeholder:text-neutral-300 placeholder:font-light outline-none"
                        disabled={isGenerating}
                      />
                      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-neutral-200"></div>
                      <div className={`absolute bottom-0 left-0 h-[1px] bg-black transition-all duration-300 ${prompt ? 'w-full' : 'w-0'}`}></div>
                    </div>

                 </div>

                 {/* Action Bar */}
                 <div className="p-8 md:p-12 border-t border-black flex justify-between items-center bg-white">
                    <button 
                      onClick={() => setAppState(AppState.UPLOAD)}
                      className="text-[10px] font-bold uppercase tracking-ultra hover:underline underline-offset-4 decoration-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={(!prompt.trim() && mode !== 'analysis') || isGenerating}
                      className="bg-black text-white px-10 py-5 text-[10px] font-bold uppercase tracking-ultra hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-3"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <span>Execute</span>}
                    </button>
                 </div>
              </div>
            </div>
          )}

          {/* ----- RESULT STATE ----- */}
          {appState === AppState.RESULT && (
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="border border-black bg-white">
                    {/* Toolbar */}
                    <div className="border-b border-black p-4 flex justify-between items-center bg-white sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <span className="serif-title text-xl">Output Reference</span>
                            <span className="text-[10px] font-bold uppercase tracking-ultra text-neutral-400 hidden sm:inline-block">
                                Generated via {mode === 'video' ? 'Veo 3.1' : 'Gemini 2.5'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                             <button 
                               onClick={handleRefine}
                               className="px-6 py-3 border border-neutral-200 hover:border-black text-[10px] font-bold uppercase tracking-ultra transition-all"
                             >
                                Refine
                             </button>
                             <button 
                               onClick={handleReset}
                               className="px-6 py-3 bg-black text-white border border-black hover:bg-neutral-800 text-[10px] font-bold uppercase tracking-ultra transition-all"
                             >
                                New Project
                             </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="p-8 md:p-16 bg-neutral-50 flex justify-center min-h-[600px]">
                        {mode === 'image' && originalImage && generatedImage && (
                            <div className="w-full max-w-6xl shadow-2xl">
                                <ComparisonSlider 
                                  beforeImage={originalImage} 
                                  afterImage={generatedImage} 
                                  onImageClick={handleImageClick}
                                />
                            </div>
                        )}
                         
                        {mode === 'video' && generatedVideo && (
                            <div className="w-full max-w-5xl shadow-2xl border border-black bg-black">
                                <video 
                                    src={generatedVideo.videoUrl} 
                                    controls 
                                    autoPlay 
                                    loop
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}

                        {mode === 'analysis' && generatedAnalysis && (
                            <div className="w-full max-w-5xl bg-white border border-black p-12 shadow-xl">
                                <h3 className="serif-title text-4xl mb-8">Architectural Report</h3>
                                <div className="w-24 h-[1px] bg-black mb-12"></div>
                                <div className="whitespace-pre-wrap font-serif text-lg leading-loose text-neutral-800">
                                    {generatedAnalysis}
                                </div>
                                <div className="mt-12 pt-8 border-t border-black flex justify-end">
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(generatedAnalysis)}
                                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-ultra hover:opacity-50"
                                    >
                                        <Copy size={14}/> Copy Text
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Downloads */}
                    {(generatedImage || generatedVideo) && (
                        <div className="border-t border-black p-8 bg-white flex justify-center">
                            <a 
                                href={mode === 'image' ? generatedImage!.base64 : generatedVideo!.videoUrl}
                                download={`vistascape-${Date.now()}.${mode === 'image' ? 'png' : 'mp4'}`}
                                className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-ultra border-b border-black pb-1 hover:opacity-50 transition-opacity"
                            >
                                <Download size={14} />
                                Download High Resolution Asset
                            </a>
                        </div>
                    )}
                </div>
             </div>
          )}

        </div>
      </main>

      <ChatBot />
    </div>
  );
};

export default App;