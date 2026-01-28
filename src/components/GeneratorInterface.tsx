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
    audioUrl?: string | null;
    subtitles?: any[]; // Word boundaries from Edge TTS
    cameraAngle: string;
    mood: string;
    visualReady?: boolean;
    audioReady?: boolean;
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

    // Voice & Music Selection
    const [selectedVoice, setSelectedVoice] = useState('ar-EG-ShakirNeural');
    const [selectedMusic, setSelectedMusic] = useState('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a7315b.mp3?filename=epic-cinematic-11390.mp3');

    const musicLibrary = [
        { name: 'ملحمي', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a7315b.mp3?filename=epic-cinematic-11390.mp3' },
        { name: 'دراما', url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884b904d9c.mp3' },
        { name: 'تكنولوجي', url: 'https://cdn.pixabay.com/download/audio/2023/11/01/audio_145d58fb28.mp3' },
    ];

    const voiceLibrary = [
        { id: 'ar-EG-ShakirNeural', name: 'شاكر (رجل)' },
        { id: 'ar-EG-SalmaNeural', name: 'سلمى (سيدة)' },
    ];

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const musicRef = useRef<HTMLAudioElement | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);

    // Inject Advanced CSS Effects
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes ken-burns {
                0% { transform: scale(1) translate(0, 0); }
                100% { transform: scale(1.15) translate(-2%, -2%); }
            }
            .animate-ken-burns {
                animation: ken-burns 12s ease-in-out infinite alternate;
            }
            @keyframes golden-pulse {
                0% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.2); }
                50% { box-shadow: 0 0 25px rgba(234, 179, 8, 0.5); }
                100% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.2); }
            }
            .lightning-border {
                border-color: rgba(234, 179, 8, 0.5) !important;
                background: linear-gradient(145deg, rgba(20,20,20,0.8), rgba(0,0,0,0.9)) !important;
            }
            .ken-burns-fast {
                animation: ken-burns 10s ease-in-out infinite alternate !important;
            }
            .subtitle-stroke {
                text-shadow: 0 0 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8);
                font-family: 'Inter', sans-serif;
                font-weight: 900;
                letter-spacing: -0.05em;
            }
            .gold-progress {
                background: linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fcf6ba, #bf953f);
                background-size: 200% auto;
                animation: shine 2s linear infinite;
                box-shadow: 0 0 20px rgba(191, 149, 63, 0.4);
            }
            @keyframes shine {
                to { background-position: 200% center; }
            }
            .scene-active {
                box-shadow: 0 0 30px rgba(234, 179, 8, 0.2), inset 0 0 20px rgba(234, 179, 8, 0.1);
                border-color: rgba(234, 179, 8, 0.5) !important;
            }
            .cinematic-blur {
                filter: contrast(1.1) brightness(1.05) saturate(1.2);
                transition: filter 0.5s ease;
            }
            .cinematic-blur:hover {
                filter: contrast(1.15) brightness(1.1) saturate(1.3);
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
    // --- RESET APP HELPER ---
    const handleResetApp = () => {
        if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط الأداة؟ سيتم حذف جميع المشاهد الحالية.')) {
            localStorage.clear();
            setTitle('');
            setProduction(null);
            setLogs([]);
            setActiveSceneIndex(0);
            setIsPlaying(false);
            window.location.reload();
        }
    };

    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            message,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour12: false }),
            type
        };
        setLogs(prev => [...prev.slice(-100), entry]);
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
            const cacheKey = `lightning_v3_global_${title}_${aspectRatio}_${selectedVoice}`;
            const cached = localStorage.getItem(cacheKey);

            async function processScene(i: number, scene: Scene) {
                const orientation = aspectRatio === '16:9' ? 'landscape' : 'portrait';
                try {
                    const updateScene = (updates: Partial<Scene>) => {
                        setProduction(prev => {
                            if (!prev) return null;
                            const ns = [...prev.scenes];
                            ns[i] = { ...ns[i], ...updates };
                            return { ...prev, scenes: ns };
                        });
                    };


                    // 🛡️ Stability Mode: Sequential Fetching (Strict Mobile Safety)

                    // 1. Fetch Visuals
                    try {
                        const [vRes, pRes] = await Promise.allSettled([
                            fetch(`/api/pexels?type=video&query=${encodeURIComponent(scene.pexelsQuery)}&orientation=${orientation}`).then(r => r.json()),
                            fetch(`/api/pexels?type=photo&query=${encodeURIComponent(scene.pexelsQuery)}&orientation=${orientation}`).then(r => r.json())
                        ]);

                        if (vRes.status === 'fulfilled' && vRes.value?.url) {
                            updateScene({ videoUrl: vRes.value.url, visualReady: true });
                            addLog(`المشهد ${i + 1}: فيديو جاهز ✅`, 'success');
                        } else if (pRes.status === 'fulfilled' && pRes.value?.url) {
                            updateScene({ imageUrl: pRes.value.url, visualReady: true });
                            addLog(`المشهد ${i + 1}: صورة جاهزة ✅`, 'success');
                        } else {
                            updateScene({ imageUrl: `/api/image?prompt=${encodeURIComponent(scene.imagePrompt)}`, visualReady: true });
                        }
                    } catch (e) {
                        updateScene({ visualReady: true });
                    }

                    // 2. Fetch Audio (After Visuals are done)
                    // ⚡️ Speed-Demon: Optimistic Proxy URL (Instant Playback Start)
                    const proxyUrl = `/api/tts?text=${encodeURIComponent(scene.script)}&voice=${selectedVoice}`;
                    updateScene({ audioUrl: proxyUrl });

                    try {
                        const ttsRes = await fetch('/api/tts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: scene.script, voice: selectedVoice, metadata: true }),
                        });

                        if (ttsRes.ok) {
                            const ttsData = await ttsRes.json();
                            updateScene({
                                subtitles: ttsData.subtitles,
                                audioReady: true
                            });
                            addLog(`المشهد ${i + 1}: الصوت جاهز ✅`, 'success');

                        } else {
                            updateScene({ audioReady: true });
                        }
                    } catch (e) {
                        const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(scene.script)}&tl=ar&total=1&idx=0&textlen=${scene.script.length}&client=tw-ob&prev=input`;
                        updateScene({ audioUrl: gUrl, audioReady: true });
                    }
                } catch (e) { }
            }

            // --- CACHE DISABLED & CLEARED FOR FRESHNESS ---
            localStorage.removeItem(cacheKey);
            setProduction(null);
            addLog(`جاري بدء إنتاج جديد كلياً...`, 'info');

            addLog(`جاري التحليل المباشر (Streaming): "${title}"...`, 'info');
            const scriptRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, language: 'ar', aspectRatio }),
            });
            if (!scriptRes.body) throw new Error('فشل بدء البث');

            const reader = scriptRes.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let lineBuffer = '';
            let sceneCount = 0;
            const currentScenes: Scene[] = [];
            setProduction({ title, aspectRatio, scenes: [] });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() || ''; // Buffer partial line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const data = trimmed.replace('data: ', '').trim();
                        if (data === '[DONE]') continue;
                        try {
                            const json = JSON.parse(data);
                            accumulatedContent += json.choices?.[0]?.delta?.content || '';
                        } catch (e) { }
                    } else if (trimmed.length > 0 && !trimmed.includes('"choices":')) {
                        // Raw JSON chunk fallback
                        accumulatedContent += trimmed;
                    }
                }

                // Enhanced Regex: Flexible about field order and spaces
                // We look for objects that have at least "script" and "imagePrompt"
                // This regex is slightly more generic to catch variations
                const matches = accumulatedContent.match(/\{"script":\s*".*?"(?:[^{}]|\{[^{}]*\})*?\}/g);

                if (matches && matches.length > sceneCount) {
                    for (let i = sceneCount; i < matches.length; i++) {
                        try {
                            // Basic cleaning for common JSON-in-string issues
                            let jsonStr = matches[i].trim();
                            if (!jsonStr.endsWith('}')) jsonStr += '}';
                            const sceneData = JSON.parse(jsonStr);
                            if (sceneData.script) {
                                const newScene: Scene = {
                                    script: sceneData.script,
                                    imagePrompt: sceneData.imagePrompt || '',
                                    pexelsQuery: sceneData.pexelsQuery || '',
                                    cameraAngle: sceneData.cameraAngle || '',
                                    mood: sceneData.mood || '',
                                    videoUrl: null,
                                    imageUrl: null
                                };
                                currentScenes.push(newScene);
                                setProduction(prev => ({ ...prev!, scenes: [...currentScenes] }));
                                processScene(i, newScene);
                                sceneCount++;
                                addLog(`المشهد ${sceneCount}: تم استلام السكريبت ✅`, 'success');
                            }
                        } catch (e) {
                            console.error('Parsing error on scene match:', e, matches[i]);
                        }
                    }
                }
            }

            // Fallback: If after stream ends, accumulatedContent has valid JSON but no matches were caught during streaming
            if (sceneCount === 0 && accumulatedContent.length > 10) {
                try {
                    const fullData = JSON.parse(accumulatedContent);
                    const scenes = fullData.scenes || [];
                    for (let i = 0; i < scenes.length; i++) {
                        const sceneData = scenes[i];
                        const newScene: Scene = { ...sceneData, videoUrl: null, imageUrl: null };
                        currentScenes.push(newScene);
                        setProduction(prev => ({ ...prev!, scenes: [...currentScenes] }));
                        processScene(i, newScene);
                        sceneCount++;
                        addLog(`المشهد ${sceneCount}: (استعادة) ✅`, 'success');
                    }
                } catch (e) { }
            }

            if (sceneCount === 0) {
                throw new Error('لم يتم العثور على مشاهد. ربما حدث خطأ في استجابة الذكاء الاصطناعي.');
            }

            addLog('⚡️ اكتمل الإنتاج بنجاح!', 'success');
            setProduction(current => {
                if (current && current.scenes.length > 0) {
                    localStorage.setItem(cacheKey, JSON.stringify(current));
                }
                return current;
            });
        } catch (error: any) {
            addLog(`خطأ: ${error.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // --- STAGE 3: VOICEOVER (Edge TTS) ---
    const handleSpeak = (text: string, onEnd?: () => void, prefetchedUrl?: string | null, subtitles?: any[]) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        setCurrentWordIndex(-1);
        setIsSpeaking(true);
        const audioUrl = prefetchedUrl || `/api/tts?text=${encodeURIComponent(text)}&voice=${selectedVoice}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // --- SUBTITLE SYNC ---
        if (subtitles && subtitles.length > 0) {
            const sortedSubs = [...subtitles].sort((a, b) => a.audio_offset - b.audio_offset);
            const updateWords = () => {
                if (!audioRef.current || audioRef.current !== audio) return;
                const currentTimeMs = (audioRef.current.currentTime * 1000);
                const conv = 10000;
                const idx = sortedSubs.findIndex((s, i) => {
                    const src = s.audio_offset / conv;
                    const nxt = sortedSubs[i + 1] ? (sortedSubs[i + 1].audio_offset / conv) : Infinity;
                    return currentTimeMs >= src && currentTimeMs < nxt;
                });
                if (idx !== -1) setCurrentWordIndex(idx);
                if (!audioRef.current.paused) requestAnimationFrame(updateWords);
            };
            audio.onplay = () => requestAnimationFrame(updateWords);
        }

        // --- STABILITY LISTENERS ---
        audio.onended = () => {
            setCurrentWordIndex(-1);
            setIsSpeaking(false);
            if (onEnd) onEnd();
        };

        audio.onerror = () => {
            console.warn("Audio Load Error - Skipping Scene");
            setCurrentWordIndex(-1);
            setIsSpeaking(false);
            if (onEnd) onEnd();
        };

        audio.play().catch(err => {
            console.warn("Playback failed - skipping:", err);
            if (onEnd) onEnd();
        });
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
            if (isPlaying) setTimeout(() => playScene(index + 1), 100);
        }, scene.audioUrl, scene.subtitles);
    };

    const startFullPlayback = () => {
        if (!production) return;
        setShowCinemaMode(true);
        setIsPlaying(true);
        const music = getMusic();
        music.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
        playScene(0);
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
        addLog('جاري تحضير ملف الروابط (تصدير آمن)...', 'info');

        const lines = production.scenes.map((scene, i) => {
            return `Scene ${i + 1}:\nVideo/Image: ${scene.videoUrl || scene.imageUrl}\nAudio: ${scene.audioUrl}\nScript: ${scene.script}\n-------------------`;
        });

        const content = `Titie: ${production.title}\n\n${lines.join('\n\n')}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${production.title}_assets.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addLog('✅ تم تحميل ملف الروابط. يمكن استخدامه لتحميل الأصول يدوياً.', 'success');
    };

    const retrySceneAudio = () => {
        if (!production || !production.scenes[activeSceneIndex]) return;
        handleSpeak(production.scenes[activeSceneIndex].script, undefined, production.scenes[activeSceneIndex].audioUrl, production.scenes[activeSceneIndex].subtitles);
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
                        {/* Voice Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">المعلق الصوتي</label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-yellow-500/50 appearance-none"
                            >
                                {voiceLibrary.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>

                        {/* Music Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">الموسيقى الخلفية</label>
                            <select
                                value={selectedMusic}
                                onChange={(e) => setSelectedMusic(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-yellow-500/50 appearance-none"
                            >
                                {musicLibrary.map(m => <option key={m.name} value={m.url}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/40 p-1 rounded-xl border border-white/5 flex">
                                <button onClick={() => setAspectRatio('16:9')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", aspectRatio === '16:9' ? "bg-yellow-500 text-black" : "text-zinc-600 hover:text-zinc-400")}>عرضي 16:9</button>
                                <button onClick={() => setAspectRatio('9:16')} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", aspectRatio === '9:16' ? "bg-yellow-500 text-black" : "text-zinc-600 hover:text-zinc-400")}>طولي 9:16</button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !title}
                                className={cn(
                                    "flex-1 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg",
                                    isGenerating ? "bg-zinc-800 text-yellow-500 cursor-not-allowed animate-[golden-pulse_1s_infinite]" : "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 active:scale-95"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                                        <span>جاري الإنتاج الصاعق...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="text-black" />
                                        <span>بدء الإنتاج "البرق"</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleResetApp}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl transition-all flex items-center justify-center aspect-square"
                                title="إعادة ضبط الأداة"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="h-[250px]">
                    <ProgressLog logs={logs} production={production} />
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

            {/* UNIFIED ACTION BAR */}
            <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 z-50">
                <div className="max-w-[800px] mx-auto flex items-center justify-center gap-4">
                    <button
                        onClick={startFullPlayback}
                        disabled={!production || production.scenes.length === 0}
                        className={cn(
                            "group px-8 py-4 rounded-full font-black flex items-center gap-3 transition-all",
                            production?.scenes[0]?.audioUrl && (production?.scenes[0]?.imageUrl || production?.scenes[0]?.videoUrl)
                                ? "bg-yellow-500 text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                    >
                        <PlayIcon size={20} fill="currentColor" className={cn(production?.scenes[0]?.audioUrl && "animate-pulse")} />
                        <span>تشغيل الفيلم</span>
                        {(!production?.scenes[0]?.audioUrl) && production && (
                            <div className="w-4 h-4 border-2 border-zinc-500/30 border-t-zinc-500 rounded-full animate-spin ml-2" />
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!production || isRecording}
                        className="bg-white hover:bg-gray-100 disabled:opacity-50 text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all relative overflow-hidden"
                    >
                        {isRecording && (
                            <motion.div
                                className="absolute bottom-0 left-0 h-1 gold-progress"
                                initial={{ width: 0 }}
                                animate={{ width: `${renderProgress}%` }}
                            />
                        )}
                        <Download size={18} className={cn(isRecording && "animate-bounce")} />
                        {isRecording ? `جاري التصدير ${Math.floor(renderProgress)}%` : "تحميل الروابط (أرشيف)"}
                    </button>
                </div>
            </div>

            {/* --- CINEMA MODE OVERLAY --- */}
            <AnimatePresence>
                {showCinemaMode && production && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col"
                    >
                        <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black to-transparent absolute top-0 w-full z-10">
                            <h2 className="text-white font-black text-2xl">{production.title}</h2>
                            <button onClick={stopPlayback} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                                <X size={32} />
                            </button>
                        </div>
                        <div className="flex-1 relative flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeSceneIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="w-full h-full relative">
                                    {production.scenes[activeSceneIndex]?.videoUrl ? (
                                        <video src={production.scenes[activeSceneIndex].videoUrl!} className="w-full h-full object-contain" autoPlay muted loop playsInline />
                                    ) : production.scenes[activeSceneIndex]?.imageUrl ? (
                                        <img src={production.scenes[activeSceneIndex].imageUrl!} className="w-full h-full object-contain animate-ken-burns" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900" />
                                    )}
                                    <div className="absolute bottom-32 left-0 w-full text-center px-4">
                                        <AnimatePresence mode="wait">
                                            {currentWordIndex >= 0 && (
                                                <motion.div
                                                    key={currentWordIndex}
                                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="inline-block"
                                                >
                                                    <span className="text-5xl md:text-8xl font-black text-yellow-400 subtitle-stroke uppercase tracking-tighter">
                                                        {production.scenes[activeSceneIndex].script.split(/\s+/)[currentWordIndex]}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <div className="h-32 bg-zinc-950 border-t border-white/5 flex items-center justify-center gap-8 pb-8">
                            <button onClick={retrySceneAudio} className="p-6 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 hover:bg-yellow-500/20">
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
