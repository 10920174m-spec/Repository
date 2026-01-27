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
}

export default function ProgressLog({ logs }: ProgressLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="glass-card w-full h-full min-h-[200px] flex flex-col rounded-3xl border-white/5 bg-black/80 font-mono text-xs overflow-hidden" dir="rtl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                <Terminal size={14} className="text-yellow-500" />
                <span className="text-zinc-400 font-bold uppercase tracking-widest">سجل النظام</span>
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
