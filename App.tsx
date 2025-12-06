import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Copy, Download, Loader2, RefreshCw, Sparkles, Tags, UploadCloud, Wand2, X, Zap, Video as VideoIcon, Image as ImageIcon, FileVideo } from 'lucide-react';
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
        const result = await generateVideo(originalImage, prompt);
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
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4 text-black">
                <button 
                    onClick={() => setShowFullPreview(false)}
                    className="bg-white hover:bg-black hover:text-white p-3 border border-black transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <span className="font-bold text-lg uppercase tracking-widest bg-white px-2">
                    {fileName || "PREVIEW"}
                </span>
            </div>
             <button 
                onClick={() => setShowFullPreview(false)}
                className="pointer-events-auto flex items-center gap-2 bg-black hover:bg-neutral-800 text-white px-6 py-3 transition-all cursor-pointer"
            >
                <span className="font-bold tracking-widest text-xs uppercase">Close</span>
                <X size={16} />
            </button>
        </div>
       
        <div className="flex-1 w-full h-full p-8 md:p-16 flex items-center justify-center overflow-hidden bg-neutral-100">
             <img 
                src={generatedImage.base64} 
                alt="Full Generated Preview" 
                className="w-full h-full object-contain shadow-2xl"
             />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <nav className="bg-white border-b border-black px-6 py-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-white">
               <Sparkles size={16} />
            </div>
            <span className="text-2xl font-bold tracking-[0.2em] uppercase">VistaScape</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 hidden sm:block">
            AI Design Studio
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12 md:py-16 relative">
        <StepIndicator currentState={appState} />

        <div className="bg-white min-h-[600px] flex flex-col relative transition-all duration-300">
          
          {error && (
            <div className="bg-neutral-50 border-l-2 border-black p-4 mb-8 flex items-start gap-3">
              <AlertCircle className="text-black shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ----- UPLOAD STATE ----- */}
          {appState === AppState.UPLOAD && (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center animate-in fade-in duration-500">
              <div 
                onClick={triggerFileSelect}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-2xl border border-dashed p-16 transition-all cursor-pointer group flex flex-col items-center gap-6 ${
                  isDragging 
                    ? 'border-black bg-neutral-50' 
                    : 'border-neutral-300 hover:border-black bg-white'
                }`}
              >
                <div className="bg-black text-white p-5 group-hover:scale-110 transition-transform duration-500">
                  <UploadCloud size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-3">Upload Media</h2>
                  <p className="text-neutral-500 font-light text-sm">Drag and drop or click to browse</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl text-left">
                 <div className="border border-neutral-100 p-6 hover:border-black transition-colors duration-300">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-2">Visual Edit</h3>
                    <p className="text-xs text-neutral-500 font-light leading-relaxed">Transform spaces with high-fidelity AI editing. Perfect for renovations and styling.</p>
                 </div>
                 <div className="border border-neutral-100 p-6 hover:border-black transition-colors duration-300">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-2">Motion (Veo)</h3>
                    <p className="text-xs text-neutral-500 font-light leading-relaxed">Bring static environments to life with cinematic video generation.</p>
                 </div>
                 <div className="border border-neutral-100 p-6 hover:border-black transition-colors duration-300">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-2">Analysis</h3>
                    <p className="text-xs text-neutral-500 font-light leading-relaxed">Deep understanding of video content for insights and descriptions.</p>
                 </div>
              </div>
            </div>
          )}

          {/* ----- DESCRIBE STATE ----- */}
          {(appState === AppState.DESCRIBE || isGenerating) && originalImage && (
            <div className="flex flex-col lg:flex-row h-full animate-in fade-in slide-in-from-bottom-4 duration-500 border border-neutral-200">
              <div className="lg:w-1/2 bg-neutral-100 relative min-h-[400px] lg:min-h-full flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-200">
                {mediaType === 'image' ? (
                  <img 
                    src={originalImage.base64} 
                    alt="Original" 
                    className="w-full h-full object-cover absolute inset-0 grayscale-[10%]"
                  />
                ) : (
                  <video
                    src={originalImage.base64}
                    controls
                    className="w-full max-h-full object-contain z-10"
                  />
                )}
                
                <div className="absolute top-0 left-0 bg-black text-white px-4 py-2">
                  <span className="text-xs font-bold uppercase tracking-widest">Original</span>
                </div>
              </div>

              <div className="lg:w-1/2 p-8 md:p-12 flex flex-col bg-white">
                <div className="flex-1">
                  
                  {/* Mode Selector - Only for Images */}
                  {mediaType === 'image' && (
                    <div className="flex mb-8 border border-black">
                      <button
                        onClick={() => setMode('image')}
                        disabled={isGenerating}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                          mode === 'image' ? 'bg-black text-white' : 'bg-white text-neutral-400 hover:text-black'
                        }`}
                      >
                        Image Edit
                      </button>
                      <button
                        onClick={() => setMode('video')}
                        disabled={isGenerating}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                          mode === 'video' ? 'bg-black text-white' : 'bg-white text-neutral-400 hover:text-black border-l border-neutral-200'
                        }`}
                      >
                        Animate
                      </button>
                    </div>
                  )}

                  {/* Video Analysis Header */}
                  {mediaType === 'video' && (
                    <div className="mb-8 p-4 border border-black flex items-center gap-4 bg-neutral-50">
                       <div className="p-2 bg-black text-white">
                         <FileVideo size={20} strokeWidth={1.5} />
                       </div>
                       <div>
                         <h3 className="font-bold text-xs uppercase tracking-widest">Video Understanding</h3>
                         <p className="text-[10px] uppercase text-neutral-500 mt-1">Gemini 3.0 Pro Analysis</p>
                       </div>
                    </div>
                  )}

                  {/* Gemini Intelligence (Image Mode Only) */}
                  {mediaType === 'image' && mode === 'image' && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                         <Sparkles size={14} className="text-black" />
                         <h3 className="text-xs font-bold uppercase tracking-widest">Intelligence</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={handleScanFeatures}
                            disabled={isScanning || isAnalyzing || isGenerating}
                            className="flex items-center justify-between p-4 border border-neutral-200 hover:border-black transition-all group text-left"
                          >
                             <div>
                               <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Scan</span>
                               <span className="text-[10px] text-neutral-400 font-light">Detect elements</span>
                             </div>
                             <Zap size={14} className={`text-neutral-300 group-hover:text-black ${isScanning ? "animate-pulse" : ""}`} />
                          </button>
                          <button
                            onClick={handleAnalyze}
                            disabled={isScanning || isAnalyzing || isGenerating}
                            className="flex items-center justify-between p-4 border border-neutral-200 hover:border-black transition-all group text-left"
                          >
                             <div>
                               <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Draft</span>
                               <span className="text-[10px] text-neutral-400 font-light">Auto-suggestion</span>
                             </div>
                             {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} className="text-neutral-300 group-hover:text-black" />}
                          </button>
                      </div>
                      {detectedFeatures.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider text-neutral-400">
                             <Tags size={12} />
                             <span>Detected</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {detectedFeatures.map((feature, idx) => (
                               <button
                                 key={idx}
                                 onClick={() => addFeatureToPrompt(feature)}
                                 className="px-3 py-1 border border-neutral-200 text-[10px] font-medium uppercase tracking-wide hover:bg-black hover:text-white transition-colors"
                               >
                                 {feature}
                               </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="text-xs font-bold uppercase tracking-widest block mb-4">
                    {mode === 'image' 
                        ? 'Directives' 
                        : mode === 'video' 
                          ? 'Motion Prompt'
                          : 'Inquiry'}
                  </label>
                  
                  <div className="relative group">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        mode === 'analysis' ? "Ask about the video..." :
                        mode === 'image' 
                        ? "Describe changes..."
                        : "Describe motion..."
                      }
                      className="w-full h-40 p-6 bg-neutral-50 border border-neutral-200 focus:border-black focus:ring-0 resize-none transition-all outline-none text-sm font-light leading-relaxed placeholder:text-neutral-300"
                      disabled={isGenerating}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(prompt)}
                      className="absolute bottom-4 right-4 p-2 text-neutral-300 hover:text-black transition-colors"
                      type="button"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  {mode === 'image' && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {['Pool', 'Minimalist', 'Modern', 'Night'].map((tag) => (
                        <button 
                          key={tag}
                          onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                          className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-black transition-colors underline decoration-transparent hover:decoration-black underline-offset-4"
                          disabled={isGenerating}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-neutral-100 flex items-center justify-between">
                  <button 
                    onClick={() => setAppState(AppState.UPLOAD)}
                    className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                    disabled={isGenerating}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={(!prompt.trim() && mode !== 'analysis' ) || isGenerating}
                    className="bg-black text-white disabled:bg-neutral-200 disabled:text-neutral-400 px-10 py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all flex items-center gap-3"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing
                      </>
                    ) : (
                      <>
                        {mode === 'image' ? 'Execute' : mode === 'video' ? 'Animate' : 'Analyze'}
                        <ArrowLeft size={16} className="rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----- RESULT STATE ----- */}
          {appState === AppState.RESULT && (
            <div className="flex flex-col h-full animate-in fade-in duration-700 relative border border-neutral-200">
              <div className="absolute top-0 right-0 z-20">
                <button
                    onClick={handleRefine}
                    className="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest border-l border-b border-black hover:bg-neutral-50 transition-colors"
                >
                    Return
                </button>
              </div>

              <div className="flex-1 bg-white p-8 md:p-12 flex items-center justify-center min-h-[500px]">
                <div className="w-full max-w-5xl">
                  {/* IMAGE RESULT */}
                  {mode === 'image' && originalImage && generatedImage && (
                    <div className="shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)]">
                      <ComparisonSlider 
                        beforeImage={originalImage} 
                        afterImage={generatedImage} 
                        onImageClick={handleImageClick}
                      />
                    </div>
                  )}

                  {/* VIDEO RESULT */}
                  {mode === 'video' && generatedVideo && (
                    <div className="bg-black aspect-video relative group border border-black">
                      <video 
                        src={generatedVideo.videoUrl} 
                        controls 
                        autoPlay 
                        loop
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* ANALYSIS RESULT */}
                  {mode === 'analysis' && generatedAnalysis && (
                    <div className="bg-white border border-black flex flex-col md:flex-row max-h-[600px]">
                      {originalImage && (
                        <div className="md:w-1/2 bg-neutral-900 flex items-center justify-center p-8">
                           <video 
                             src={originalImage.base64} 
                             controls 
                             className="max-w-full max-h-[400px] object-contain border border-white/20"
                           />
                        </div>
                      )}
                      <div className="md:w-1/2 p-10 overflow-y-auto bg-neutral-50">
                         <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-200">
                            <Sparkles size={20} className="text-black" />
                            <h2 className="text-lg font-bold uppercase tracking-widest text-black">Insights</h2>
                         </div>
                         <div className="prose prose-sm max-w-none text-neutral-600 font-light leading-relaxed whitespace-pre-wrap">
                            {generatedAnalysis}
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border-t border-black p-8">
                 <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 border-l-2 border-black pl-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Configuration</h3>
                      <p className="text-black text-sm font-light italic">
                        "{prompt || "Auto-analysis"}"
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <button 
                        onClick={handleRefine}
                        className="flex items-center gap-2 px-6 py-3 border border-neutral-200 text-xs font-bold uppercase tracking-widest hover:border-black transition-colors"
                      >
                        <RefreshCw size={14} />
                        <span className="hidden sm:inline">Refine</span>
                      </button>
                      
                      {mode === 'image' && generatedImage && (
                        <a 
                          href={generatedImage.base64} 
                          download={`edited-image-${Date.now()}.png`}
                          className="flex items-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                        >
                          <Download size={14} />
                          <span>Save</span>
                        </a>
                      )}

                      {mode === 'video' && generatedVideo && (
                         <a 
                           href={generatedVideo.videoUrl}
                           download={`video-${Date.now()}.mp4`}
                           className="flex items-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                         >
                           <Download size={14} />
                           <span>Save</span>
                         </a>
                      )}

                       {mode === 'analysis' && (
                         <button 
                           onClick={() => navigator.clipboard.writeText(generatedAnalysis || "")}
                           className="flex items-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                         >
                           <Copy size={14} />
                           <span>Copy</span>
                         </button>
                      )}
                      
                      <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                      >
                        New
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-12 text-center text-neutral-300 text-[10px] uppercase tracking-widest">
          <p>Powered by Google Gemini 2.5 & Veo 3.1</p>
        </div>

        <ChatBot />
      </main>
    </div>
  );
};

export default App;