'use client';

import { motion } from 'framer-motion';
import { Video, Image as ImageIcon, Copy } from 'lucide-react';

interface SceneCardProps {
    index: number;
    scene: any;
    isActive: boolean;
    onClick: () => void;
}

export default function SceneCard({ index, scene, isActive, onClick }: SceneCardProps) {
    return (
        <motion.div
            layout
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative group cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ${isActive
                ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)] bg-zinc-900'
                : 'border-white/5 hover:border-white/20 bg-black/40'
                }`}
        >
            {/* Media Preview */}
            <div className="aspect-video w-full bg-black relative overflow-hidden">
                {scene.videoUrl ? (
                    <video
                        src={scene.videoUrl}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        muted
                        loop
                        autoPlay
                        playsInline
                    />
                ) : scene.imageUrl ? (
                    <img
                        src={scene.imageUrl}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        alt="Scene Preview"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-700">
                        <ImageIcon size={32} />
                        <span className="text-xs mt-2 font-mono">جاري البحث...</span>
                    </div>
                )}

                {/* Badge */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                    مشهد {index + 1}
                </div>
            </div>

            {/* Script Text */}
            <div className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm font-medium leading-relaxed ${isActive ? 'text-white' : 'text-zinc-400'}`} dir="rtl">
                        {scene.script}
                    </p>
                </div>

                {/* Metadata Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-zinc-500 uppercase tracking-widest truncate max-w-[100px]">
                        {scene.cameraAngle}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-zinc-500 uppercase tracking-widest truncate max-w-[100px]">
                        {scene.mood}
                    </span>
                </div>

                {/* ⚡️ Speed-Demon: Status Indicators */}
                <div className="flex gap-3 pt-2 border-t border-white/5 mt-2">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${scene.visualReady || scene.imageUrl || scene.videoUrl ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="text-[10px] text-zinc-500">البصريات</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${scene.audioReady || scene.audioUrl ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="text-[10px] text-zinc-500">الصوت</span>
                    </div>
                </div>
            </div>

            {/* Active Indicator */}
            {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500" />
            )}
        </motion.div>
    );
}
