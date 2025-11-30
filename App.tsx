import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Copy, Download, Loader2, RefreshCw, Sparkles, Tags, UploadCloud, Wand2, X, Zap, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import { AppState, ImageData, VideoData } from './types';
import { generateImageEdit, analyzeImage, identifyFeatures, generateVideo } from './services/geminiService';
import { StepIndicator } from './components/StepIndicator';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ChatBot } from './components/ChatBot';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<VideoData | null>(null);
  
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Intelligence States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState<string[]>([]);
  
  // Mode selection
  const [mode, setMode] = useState<'image' | 'video'>('image');
  
  const [fileName, setFileName] = useState<string>("");
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file.");
      return;
    }

    setFileName(file.name);
    setDetectedFeatures([]);
    setGeneratedVideo(null);
    setGeneratedImage(null);

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
    } else {
      // Video generation requires paid key selection
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
    setPrompt("");
    setError(null);
    setFileName("");
    setDetectedFeatures([]);
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
      <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-start z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4 text-white">
                <button 
                    onClick={() => setShowFullPreview(false)}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-sm outline-none group"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <span className="font-medium text-lg text-shadow-sm truncate max-w-md md:max-w-xl">
                    {fileName || "Generated Image"}
                </span>
            </div>
        </div>
        <button 
            onClick={() => setShowFullPreview(false)}
            className="fixed top-6 right-6 z-[110] flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg hover:shadow-white/5 active:scale-95 cursor-pointer group"
        >
            <span className="font-medium tracking-wide">Return</span>
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <div className="flex-1 w-full h-full p-4 md:p-8 flex items-center justify-center overflow-hidden">
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
    <div className="min-h-screen bg-earth-50 text-gray-800 font-sans selection:bg-leaf-200">
      <nav className="bg-white border-b border-earth-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-leaf-700">
            <Sparkles size={24} className="text-leaf-500" />
            <span className="text-xl font-bold tracking-tight">VistaScape AI</span>
          </div>
          <div className="text-sm font-medium text-gray-500 hidden sm:block">
            Professional Image Editing & Visualization
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 relative">
        <StepIndicator currentState={appState} />

        <div className="bg-white rounded-2xl shadow-xl border border-earth-100 overflow-hidden min-h-[500px] flex flex-col relative transition-all duration-300">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-md flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ----- UPLOAD STATE ----- */}
          {appState === AppState.UPLOAD && (
            <div className="flex flex-col items-center justify-center flex-1 p-8 md:p-16 text-center animate-in fade-in duration-500">
              <div 
                onClick={triggerFileSelect}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer group flex flex-col items-center gap-4 ${
                  isDragging 
                    ? 'border-leaf-600 bg-leaf-100 ring-4 ring-leaf-100' 
                    : 'border-leaf-300 hover:border-leaf-500 bg-leaf-50 hover:bg-leaf-100'
                }`}
              >
                <div className="bg-white p-4 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <UploadCloud size={40} className="text-leaf-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Photo</h2>
                  <p className="text-gray-500 mb-4">Drag and drop or click to browse</p>
                  <span className="text-xs text-gray-400">Supports JPG, PNG</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl text-left">
                 <div className="bg-earth-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-earth-800 mb-1">Upload Image</h3>
                    <p className="text-xs text-gray-600">Start by uploading a photo of the space or object you want to edit.</p>
                 </div>
                 <div className="bg-earth-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-earth-800 mb-1">Describe Changes</h3>
                    <p className="text-xs text-gray-600">Tell the AI to add a filter, remove an object, or redesign the scene.</p>
                 </div>
                 <div className="bg-earth-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-earth-800 mb-1">Instant Results</h3>
                    <p className="text-xs text-gray-600">See your edits come to life in seconds with Gemini Flash.</p>
                 </div>
              </div>
            </div>
          )}

          {/* ----- DESCRIBE STATE ----- */}
          {(appState === AppState.DESCRIBE || isGenerating) && originalImage && (
            <div className="flex flex-col lg:flex-row h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:w-1/2 bg-gray-900 relative min-h-[300px] lg:min-h-full">
                <img 
                  src={originalImage.base64} 
                  alt="Original" 
                  className="w-full h-full object-cover absolute inset-0 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                  <span className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">Step 2</span>
                  <h2 className="text-white text-2xl font-bold">Describe Your Vision</h2>
                </div>
              </div>

              <div className="lg:w-1/2 p-6 md:p-8 flex flex-col">
                <div className="flex-1">
                  
                  {/* Mode Selector */}
                  <div className="bg-earth-100 p-1 rounded-xl flex mb-6">
                    <button
                      onClick={() => setMode('image')}
                      disabled={isGenerating}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        mode === 'image' ? 'bg-white text-leaf-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <ImageIcon size={16} />
                      Image Edit
                    </button>
                    <button
                      onClick={() => setMode('video')}
                      disabled={isGenerating}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        mode === 'video' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <VideoIcon size={16} />
                      Animate (Veo)
                    </button>
                  </div>

                  {/* Gemini Intelligence (Image Mode Only) */}
                  {mode === 'image' && (
                    <div className="mb-6 p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <Sparkles size={16} className="text-indigo-600" />
                         <h3 className="text-sm font-bold text-indigo-900 tracking-tight">Gemini Intelligence</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleScanFeatures}
                            disabled={isScanning || isAnalyzing || isGenerating}
                            className="flex flex-col items-start p-3 rounded-lg border border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                          >
                             <div className="flex items-center gap-2 mb-1 text-indigo-700">
                               <Zap size={14} className={isScanning ? "animate-pulse" : ""} />
                               <span className="text-xs font-bold uppercase tracking-wider">Smart Scan</span>
                             </div>
                             <p className="text-[10px] text-gray-500 leading-tight">
                                {isScanning ? "Scanning..." : "Detect elements (Flash)"}
                             </p>
                          </button>
                          <button
                            onClick={handleAnalyze}
                            disabled={isScanning || isAnalyzing || isGenerating}
                            className="flex flex-col items-start p-3 rounded-lg border border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                          >
                             <div className="flex items-center gap-2 mb-1 text-indigo-700">
                               {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                               <span className="text-xs font-bold uppercase tracking-wider">Vision Draft</span>
                             </div>
                             <p className="text-[10px] text-gray-500 leading-tight">
                                {isAnalyzing ? "Analyzing..." : "Create detailed plan (Pro)"}
                             </p>
                          </button>
                      </div>
                      {detectedFeatures.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-indigo-50 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
                             <Tags size={12} />
                             <span>Detected Elements (Click to keep)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {detectedFeatures.map((feature, idx) => (
                               <button
                                 key={idx}
                                 onClick={() => addFeatureToPrompt(feature)}
                                 className="px-2 py-1 bg-white border border-indigo-100 rounded text-[10px] font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                               >
                                 {feature}
                               </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    {mode === 'image' ? 'What changes would you like to see?' : 'How should this scene be animated?'}
                  </label>
                  
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={mode === 'image' 
                        ? "Describe your vision... e.g., 'Add a retro filter', 'Remove the person in the background', 'Add a pool'."
                        : "Describe the motion... e.g., 'Cinematic pan of the garden', 'Trees swaying in the wind'."
                      }
                      className="w-full h-32 p-4 pb-12 rounded-xl border border-gray-200 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-200 resize-none transition-all outline-none text-gray-700 text-base leading-relaxed bg-earth-50/50"
                      disabled={isGenerating}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(prompt)}
                      className="absolute bottom-3 right-3 p-1.5 text-gray-400 hover:text-leaf-600 bg-white/50 hover:bg-white rounded-lg transition-all group"
                      type="button"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  
                  {mode === 'image' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['Add a pool', 'Remove person', 'Retro filter', 'Modern style'].map((tag) => (
                        <button 
                          key={tag}
                          onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-leaf-50 hover:border-leaf-300 hover:text-leaf-700 transition-colors"
                          disabled={isGenerating}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <button 
                    onClick={() => setAppState(AppState.UPLOAD)}
                    className="text-gray-500 hover:text-gray-800 text-sm font-medium px-4 py-2"
                    disabled={isGenerating}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={`${mode === 'image' ? 'bg-leaf-600 hover:bg-leaf-700 shadow-leaf-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {mode === 'image' ? 'Generating...' : 'Animating...'}
                      </>
                    ) : (
                      <>
                        {mode === 'image' ? <Sparkles size={20} /> : <VideoIcon size={20} />}
                        {mode === 'image' ? 'Generate' : 'Animate'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----- RESULT STATE ----- */}
          {appState === AppState.RESULT && (
            <div className="flex flex-col h-full animate-in zoom-in-95 duration-500 relative">
              <button
                onClick={handleRefine}
                className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-white hover:bg-leaf-50 text-gray-700 hover:text-leaf-700 rounded-full shadow-lg border border-gray-200 transition-all text-sm font-semibold group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Return
              </button>

              <div className="flex-1 bg-gray-100 p-4 md:p-8 flex items-center justify-center">
                <div className="w-full max-w-5xl">
                  {mode === 'image' && originalImage && generatedImage && (
                    <>
                      <ComparisonSlider 
                        beforeImage={originalImage} 
                        afterImage={generatedImage} 
                        onImageClick={handleImageClick}
                      />
                      <p className="text-center text-gray-400 text-xs mt-3">Click image for full screen</p>
                    </>
                  )}

                  {mode === 'video' && generatedVideo && (
                    <div className="rounded-xl overflow-hidden shadow-2xl bg-black aspect-video relative group">
                      <video 
                        src={generatedVideo.videoUrl} 
                        controls 
                        autoPlay 
                        loop
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm pointer-events-none">
                        VEO GENERATION
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 border-t border-gray-200">
                 <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Instructions Used</h3>
                      <p className="text-gray-800 text-sm line-clamp-2 md:line-clamp-none">
                        {prompt}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={handleRefine}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw size={18} />
                        <span className="hidden sm:inline">Refine</span>
                      </button>
                      
                      {mode === 'image' && generatedImage && (
                        <a 
                          href={generatedImage.base64} 
                          download={`edited-image-${Date.now()}.png`}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-leaf-600 text-white font-medium hover:bg-leaf-700 transition-colors shadow-sm"
                        >
                          <Download size={18} />
                          <span>Download</span>
                        </a>
                      )}

                      {mode === 'video' && generatedVideo && (
                         <a 
                           href={generatedVideo.videoUrl}
                           download={`video-${Date.now()}.mp4`}
                           className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                         >
                           <Download size={18} />
                           <span>Download</span>
                         </a>
                      )}
                      
                      <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        New Project
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Powered by Google Gemini 2.5 Flash Image, 3.0 Pro Preview & Veo 3.1</p>
        </div>

        <ChatBot />
      </main>
    </div>
  );
};

export default App;