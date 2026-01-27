'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Video, Image as ImageIcon, Mic, Wand2, Play as PlayIcon, Volume2, Sparkles, Camera, AudioWaveform, Download, Layers, ChevronRight, ChevronLeft, Film, Youtube, Globe, Monitor, X, Maximize2, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ProgressLog from './ProgressLog';
import SceneCard from './SceneCard';

interface Scene {
    script: string;
    imagePrompt: string;
    pexelsQuery: string;
    videoUrl: string | null;
    imageUrl: string | null;
    audioUrl?: string | null; // Pre-fetched Voiceover
    cameraAngle: string;
    mood: string;
}

interface ProductionData {
    title: string;
    aspectRatio: '16:9' | '9:16';
    scenes: Scene[];
}

interface LogEntry {
    id: string;
    message: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

export default function GeneratorInterface() {
    // Input State
    const [title, setTitle] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [language, setLanguage] = useState<'ar' | 'en'>('ar');

    // Production State
    const [isGenerating, setIsGenerating] = useState(false);
    const [production, setProduction] = useState<ProductionData | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Playback State
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [showCinemaMode, setShowCinemaMode] = useState(false);

    // Voice State - Google Translate TTS (Arabic)
    const [selectedVoice] = useState('arabic'); // Google TTS only has one Arabic voice
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Inject Ken Burns Effect
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes ken-burns {
                0% { transform: scale(1) translate(0, 0); }
                100% { transform: scale(1.15) translate(-2%, -2%); }
            }
            .animate-ken-burns {
                animation: ken-burns 10s ease-in-out infinite alternate;
            }
        `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    // Lazy Init Music
    const getMusic = () => {
        if (!musicRef.current) {
            musicRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a7315b.mp3?filename=epic-cinematic-11390.mp3');
            musicRef.current.loop = true;
            musicRef.current.volume = 0.3;
        }
        return musicRef.current;
    };

    // --- LOGGING HELPER ---
    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            message,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour12: false }),
            type
        };
        setLogs(prev => [...prev, entry]);
    };

    // --- STAGE 1 & 2: GENERATION & ASSET FETCHING ---
    const handleGenerate = async () => {
        if (!title) return;
        setIsGenerating(true);
        setProduction(null);
        setLogs([]);
        setActiveSceneIndex(0);
        setShowCinemaMode(false);
        try {
            addLog(`جاري الاتصال بمعالج Gemini: "${title}"...`, 'info');
            const scriptRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, language, aspectRatio }),
            });

            const scriptData = await scriptRes.json();
            if (!scriptRes.ok) {
                throw new Error(scriptData.error || 'فشل توليد السكريبت');
            }

            addLog('تم إنشاء السكريبت بنجاح (5 مشاهد).', 'success');

            const updatedScenes: Scene[] = [];
            setProduction({ title, aspectRatio, scenes: [] });

            for (let i = 0; i < scriptData.scenes.length; i++) {
                const scene = scriptData.scenes[i];
                addLog(`جاري جلب الملفات للمشهد ${i + 1}...`, 'info');

                const currentScene: Scene = { ...scene, videoUrl: null, imageUrl: null };
                const orientation = aspectRatio === '16:9' ? 'landscape' : 'portrait';

                // Try Video
                try {
                    const videoRes = await fetch(`/api/pexels?type=video&query=${encodeURIComponent(scene.pexelsQuery)}&orientation=${orientation}`);
                    const videoData = await videoRes.json();
                    if (videoData.url) {
                        currentScene.videoUrl = videoData.url;
                        addLog(`تم العثور على فيديو للمشهد ${i + 1}`, 'success');
                    }
                } catch (e) { }

                // Try Photo Fallback
                if (!currentScene.videoUrl) {
                    try {
                        const photoRes = await fetch(`/api/pexels?type=photo&query=${encodeURIComponent(scene.pexelsQuery)}&orientation=${orientation}`);
                        const photoData = await photoRes.json();
                        if (photoData.url) {
                            currentScene.imageUrl = photoData.url;
                            addLog(`تم العثور على صورة للمشهد ${i + 1}`, 'success');
                        }
                    } catch (e) { }
                }

                // AI Image Fallback (Flux)
                if (!currentScene.videoUrl && !currentScene.imageUrl) {
                    currentScene.imageUrl = `/api/image?prompt=${encodeURIComponent(scene.imagePrompt)}`;
                    addLog(`تم توليد صورة بالذكاء الاصطناعي للمشهد ${i + 1}`, 'warning');
                }

                // Pre-fetch TTS Audio
                try {
                    const ttsRes = await fetch('/api/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: scene.script, voice: 'arabic' }),
                    });
                    if (ttsRes.ok) {
                        const blob = await ttsRes.blob();
                        currentScene.audioUrl = URL.createObjectURL(blob);
                        addLog(`تم تجهيز الصوت للمشهد ${i + 1}`, 'success');
                    }
                } catch (e) {
                    console.error('Audio pre-fetch error:', e);
                }

                updatedScenes.push(currentScene);
                setProduction(prev => prev ? { ...prev, scenes: [...updatedScenes] } : null);
            }
            addLog('تم الإنتاج وجاهز للعرض السينمائي.', 'success');
        } catch (error: any) {
            addLog(`خطأ: ${error.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // --- STAGE 3: VOICEOVER (Edge TTS) ---
    const handleSpeak = async (text: string, onEnd?: () => void, prefetchedUrl?: string | null) => {
        // Stop any existing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setCurrentWordIndex(-1);
        setIsSpeaking(true);

        try {
            let audioUrl = prefetchedUrl;

            if (!audioUrl) {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice: selectedVoice }),
                });

                if (!response.ok) throw new Error('TTS API failed');
                const audioBlob = await response.blob();
                audioUrl = URL.createObjectURL(audioBlob);
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onloadedmetadata = () => {
                const words = text.split(/\s+/);
                const duration = audio.duration; // Actual duration in seconds
                let wordIdx = 0;
                const wordInterval = setInterval(() => {
                    if (wordIdx < words.length) {
                        setCurrentWordIndex(wordIdx);
                        wordIdx++;
                    } else {
                        clearInterval(wordInterval);
                    }
                }, (duration * 1000) / words.length);

                audio.onended = () => {
                    clearInterval(wordInterval);
                    setCurrentWordIndex(-1);
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                    if (onEnd) onEnd();
                };
            };

            await audio.play();
        } catch (error) {
            console.error('TTS Error:', error);
            setIsSpeaking(false);
            if (onEnd) onEnd();
        }
    };

    const playScene = (index: number) => {
        if (!production || index >= production.scenes.length) {
            setIsPlaying(false);
            if (musicRef.current) musicRef.current.pause();
            return;
        }

        setActiveSceneIndex(index);
        if (musicRef.current) musicRef.current.volume = 0.1;

        const scene = production.scenes[index];
        handleSpeak(scene.script, () => {
            if (musicRef.current) musicRef.current.volume = 0.3;
            if (isPlaying) {
                setTimeout(() => playScene(index + 1), 50); // Reduced gap
            }
        }, scene.audioUrl);
    };

    const startFullPlayback = () => {
        if (!production) return;

        // Warm up audio context for mobile
        setShowCinemaMode(true);
        setIsPlaying(true);

        const music = getMusic();
        music.play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true));

        playScene(0); // Start immediately
    };

    const stopPlayback = () => {
        setIsPlaying(false);
        setShowCinemaMode(false);
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (musicRef.current) musicRef.current.pause();
    };

    const handleDownload = async () => {
        if (!production) return;

        addLog('بدء عملية التصدير الشاملة... يرجى عدم إغلاق الصفحة', 'info');
        setIsRecording(true);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d')!;

            // Choose best mimeType for cross-platform support (Android/iOS/PC)
            const mimeTypes = [
                'video/mp4;codecs=avc1',
                'video/webm;codecs=h264',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ];
            const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

            const canvasStream = canvas.captureStream(30);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioDestination = audioContext.createMediaStreamDestination();

            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDestination.stream.getAudioTracks()
            ]);

            const recorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 4000000 // High quality
            });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `AI_Video_${Date.now()}.${extension}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 200);
                setIsRecording(false);
                addLog('تم تصدير الفيديو بنجاح إلى جهازك!', 'success');
            };

            recorder.start();

            // Render scenes sequentially
            for (let i = 0; i < production.scenes.length; i++) {
                const scene = production.scenes[i];
                addLog(`جاري دمج المشهد ${i + 1}/${production.scenes.length}...`, 'info');

                const isVideo = !!scene.videoUrl;
                let asset: HTMLImageElement | HTMLVideoElement;

                if (isVideo) {
                    asset = document.createElement('video');
                    asset.src = scene.videoUrl!;
                    asset.crossOrigin = 'anonymous';
                    asset.muted = true;
                    asset.playsInline = true;
                    await new Promise((resolve) => {
                        asset.onloadeddata = resolve;
                        asset.onerror = resolve;
                        (asset as HTMLVideoElement).load();
                    });
                    (asset as HTMLVideoElement).currentTime = 0;
                    await (asset as HTMLVideoElement).play();
                } else {
                    asset = new Image();
                    asset.crossOrigin = 'anonymous';
                    asset.src = scene.imageUrl || '';
                    await new Promise((resolve) => {
                        asset.onload = resolve;
                        asset.onerror = resolve;
                    });
                }

                // Get audio with robust fallback
                let audioBlob: Blob | null = null;
                if (scene.audioUrl) {
                    try {
                        const audioFetch = await fetch(scene.audioUrl);
                        if (audioFetch.ok) {
                            audioBlob = await audioFetch.blob();
                        }
                    } catch (e) {
                        console.warn('Local blob fetch failed, falling back to API:', e);
                    }
                }

                if (!audioBlob) {
                    try {
                        const ttsResponse = await fetch('/api/tts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: scene.script, voice: 'arabic' }),
                        });
                        if (ttsResponse.ok) {
                            audioBlob = await ttsResponse.blob();
                        }
                    } catch (e) {
                        console.error('TTS API fallback failed:', e);
                    }
                }

                if (!audioBlob) {
                    addLog(`تنبيه: فشل تحميل صوت المشهد ${i + 1}، سيتم تخطيه.`, 'warning');
                    continue;
                }

                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioDestination);

                const words = scene.script.split(/\s+/);
                const duration = audioBuffer.duration;
                const startTime = Date.now();
                source.start();

                // Render Loop
                await new Promise<void>((resolve) => {
                    const renderFrame = () => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const progress = Math.min(elapsed / duration, 1);

                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // 1. Draw Asset
                        if (isVideo) {
                            ctx.drawImage(asset, 0, 0, canvas.width, canvas.height);
                        } else {
                            ctx.save();
                            const scale = 1 + (progress * 0.1);
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.scale(scale, scale);
                            ctx.drawImage(asset, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
                            ctx.restore();
                        }

                        // 2. Subtitles
                        const currentWordIdx = Math.floor(progress * words.length);
                        if (currentWordIdx < words.length) {
                            ctx.fillStyle = 'rgba(0,0,0,0.6)';
                            ctx.fillRect(0, canvas.height - 180, canvas.width, 180);

                            ctx.font = 'bold 80px Arial';
                            ctx.fillStyle = '#facc15';
                            ctx.textAlign = 'center';
                            ctx.fillText(words[currentWordIdx], canvas.width / 2, canvas.height - 70);
                        }

                        if (progress < 1) {
                            requestAnimationFrame(renderFrame);
                        } else {
                            if (isVideo) (asset as HTMLVideoElement).pause();
                            resolve();
                        }
                    };
                    renderFrame();
                });

                await new Promise(r => setTimeout(r, 100));
            }

            recorder.stop();
            audioContext.close();

        } catch (err) {
            console.error('Export error:', err);
            addLog('عذراً، حدث خطأ أثناء التصدير', 'error');
            setIsRecording(false);
        }
    };

    const retrySceneAudio = () => {
        if (!production) return;
        handleSpeak(production.scenes[activeSceneIndex].script);
    };

    return (
        <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 h-[calc(100vh-140px)]" dir="rtl">

            {/* LEFT: SETTINGS & LOGS */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="glass-card p-6 rounded-[2rem] border-white/5 space-y-6 flex-1">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Monitor size={20} className="text-yellow-500" />
                        لوحة التحكم
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">عنوان الفيديو</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="أدخل موضوع الفيديو..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-500/50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">المعلق الصوتي (عربي)</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs flex items-center gap-2">
                                    <Mic size={16} className="text-yellow-500" />
                                    <span>صوت عربي (Google)</span>
                                </div>
                                <button
                                    onClick={() => handleSpeak('مرحبا بك في استوديو الذكاء الاصطناعي')}
                                    className={cn("px-4 rounded-xl text-white transition-all", isSpeaking ? "bg-yellow-500/30 animate-pulse" : "bg-white/10 hover:bg-white/20")}
                                    title="تجربة الصوت"
                                    disabled={isSpeaking}
                                >
                                    <Volume2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/40 p-1 rounded-xl border border-white/5 flex">
                                <button onClick={() => setAspectRatio('16:9')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold", aspectRatio === '16:9' ? "bg-white/10 text-white" : "text-zinc-600")}>16:9</button>
                                <button onClick={() => setAspectRatio('9:16')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold", aspectRatio === '9:16' ? "bg-white/10 text-white" : "text-zinc-600")}>9:16</button>
                            </div>
                            <div className="flex-1 bg-black/40 p-1 rounded-xl border border-white/5 flex">
                                <button onClick={() => setLanguage('ar')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold", language === 'ar' ? "bg-white/10 text-white" : "text-zinc-600")}>AR</button>
                                <button onClick={() => setLanguage('en')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold", language === 'en' ? "bg-white/10 text-white" : "text-zinc-600")}>EN</button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">تأثيرات الانتقال</label>
                            <button className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs flex items-center justify-between">
                                <span>انتقال سينمائي (تلاشي + زووم)</span>
                                <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                            </button>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !title}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Wand2 size={20} />}
                            بدء الإنتاج
                        </button>
                    </div>
                </div>
                <div className="h-[200px]">
                    <ProgressLog logs={logs} />
                </div>
            </div>

            {/* MIDDLE: PREVIEW */}
            <div className="lg:col-span-6 flex flex-col gap-6">
                <div
                    onClick={() => production && startFullPlayback()}
                    className="glass-card rounded-[2.5rem] bg-black border-white/5 relative overflow-hidden shadow-2xl flex-1 flex flex-col cursor-pointer group"
                >
                    <div className="flex-1 relative bg-zinc-950 flex items-center justify-center">
                        {production && production.scenes.length > activeSceneIndex ? (
                            <>
                                {production.scenes[activeSceneIndex]?.videoUrl ? (
                                    <video src={production.scenes[activeSceneIndex].videoUrl!} className="w-full h-full object-cover opacity-50" />
                                ) : production.scenes[activeSceneIndex]?.imageUrl ? (
                                    <img src={production.scenes[activeSceneIndex].imageUrl!} className="w-full h-full object-cover opacity-50" />
                                ) : <div className="w-full h-full bg-zinc-900" />}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/50 p-6 rounded-full border border-white/10 group-hover:scale-110 transition-transform">
                                        <PlayIcon size={48} className="text-white fill-white" />
                                    </div>
                                </div>
                                <div className="absolute bottom-6 left-6 text-yellow-500 font-bold text-xs bg-black/80 px-4 py-2 rounded-full border border-white/5">
                                    اضغط للتشغيل الكامل
                                </div>
                            </>
                        ) : (
                            <div className="text-center opacity-30 flex flex-col items-center gap-4">
                                <Film size={64} />
                                <p className="text-xs font-mono">
                                    {isGenerating ? "جاري الإنتاج..." : "بانتظار العنوان والبدء..."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT: SCENE LIST */}
            <div className="lg:col-span-3 glass-card p-6 rounded-[2rem] border-white/5 flex flex-col h-full bg-zinc-900/10">
                <h3 className="text-xs font-black text-zinc-500 uppercase flex items-center gap-2 mb-6">
                    <Layers size={14} /> المشاهد المنتجة
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-24 lg:mb-0">
                    {production && production.scenes.map((scene, idx) => (
                        <SceneCard
                            key={idx}
                            index={idx}
                            scene={scene}
                            isActive={activeSceneIndex === idx}
                            onClick={() => setActiveSceneIndex(idx)}
                        />
                    ))}
                </div>
            </div>

            {/* UNIFIED ACTION BAR - Works on Mobile & Desktop */}
            <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 z-50">
                <div className="max-w-[800px] mx-auto flex items-center justify-center gap-4">
                    <button
                        onClick={startFullPlayback}
                        disabled={!production}
                        className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
                    >
                        <PlayIcon size={18} fill="currentColor" /> تشغيل الفيلم
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!production}
                        className="bg-white hover:bg-gray-100 disabled:opacity-50 text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
                    >
                        <Download size={18} /> تصدير الفيديو
                    </button>
                </div>
            </div>

            {/* --- CINEMA MODE OVERLAY --- */}
            <AnimatePresence>
                {showCinemaMode && production && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black to-transparent absolute top-0 w-full z-10">
                            <h2 className="text-white font-black text-2xl">{production.title}</h2>
                            <button onClick={stopPlayback} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                                <X size={32} />
                            </button>
                        </div>

                        {/* Screen */}
                        <div className="flex-1 relative flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeSceneIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="w-full h-full relative">
                                    {production.scenes[activeSceneIndex]?.videoUrl ? (
                                        <video src={production.scenes[activeSceneIndex].videoUrl!} className="w-full h-full object-contain" autoPlay muted loop playsInline />
                                    ) : production.scenes[activeSceneIndex]?.imageUrl ? (
                                        <img src={production.scenes[activeSceneIndex].imageUrl!} className="w-full h-full object-contain animate-ken-burns" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                            <Sparkles className="animate-pulse" size={64} />
                                        </div>
                                    )}

                                    {/* SINGLE WORD DISPLAY - Only show current word */}
                                    <div className="absolute bottom-32 left-0 w-full text-center px-4">
                                        <AnimatePresence mode="wait">
                                            {currentWordIndex >= 0 && production.scenes[activeSceneIndex]?.script && (
                                                <motion.div
                                                    key={currentWordIndex}
                                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="inline-block"
                                                >
                                                    <span className="text-4xl md:text-7xl font-black text-yellow-400 drop-shadow-2xl">
                                                        {production.scenes[activeSceneIndex].script.split(/\s+/)[currentWordIndex]}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* CINEMA CONTROLS */}
                        <div className="h-32 bg-zinc-950 border-t border-white/5 flex items-center justify-center gap-8 pb-8">
                            <button onClick={retrySceneAudio} className="p-6 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 hover:bg-yellow-500/20" title="إعادة الصوت">
                                <Volume2 size={32} />
                            </button>

                            <button onClick={() => setActiveSceneIndex(Math.max(0, activeSceneIndex - 1))} className="p-4 text-white hover:bg-white/10 rounded-full transition-all"><ChevronRight size={40} /></button>

                            <button
                                onClick={() => isPlaying ? stopPlayback() : startFullPlayback()}
                                className={cn("w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl", isPlaying ? "bg-red-500/20 text-red-500 border border-red-500" : "bg-white text-black")}
                            >
                                {isPlaying ? <div className="w-6 h-6 bg-current rounded-sm" /> : <PlayIcon size={32} fill="currentColor" />}
                            </button>

                            <button onClick={() => setActiveSceneIndex(Math.min(production.scenes.length - 1, activeSceneIndex + 1))} className="p-4 text-white hover:bg-white/10 rounded-full transition-all"><ChevronLeft size={40} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
