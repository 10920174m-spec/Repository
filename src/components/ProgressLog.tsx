'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogEntry {
    id: string;
    message: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

interface ProgressLogProps {
    logs: LogEntry[];
    production?: any;
}

export default function ProgressLog({ logs, production }: ProgressLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="glass-card w-full h-full min-h-[250px] flex flex-col rounded-3xl border-white/5 bg-black/80 font-mono text-xs overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-yellow-500" />
                    <span className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">نظام المتابعة الصاعقة</span>
                </div>
                {production && (
                    <div className="flex gap-2">
                        {production.scenes.map((s: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${s.videoUrl || s.imageUrl ? 'bg-green-500' : 'bg-zinc-800 animate-pulse'}`} />
                                    <div className={`w-1.5 h-1.5 rounded-full ${s.audioUrl ? 'bg-blue-500' : 'bg-zinc-800 animate-pulse'}`} />
                                </div>
                                <span className="text-[7px] text-zinc-600">S{i + 1}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-1.5 custom-scrollbar">
                {logs.length === 0 && (
                    <div className="text-zinc-700 italic">بانتظار بدء العمليات...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
                        <span className={`${log.type === 'success' ? 'text-green-400' :
                            log.type === 'error' ? 'text-red-400' :
                                log.type === 'warning' ? 'text-yellow-400' :
                                    'text-blue-300'
                            }`}>
                            {log.type === 'info' && '> '}
                            {log.type === 'success' && '✓ '}
                            {log.type === 'error' && '✗ '}
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
