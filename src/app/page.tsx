'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Lock, ShieldAlert, Key, Clock, Settings, LogOut, Loader2, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import GeneratorInterface from '@/components/GeneratorInterface';
import { supabase } from '@/lib/supabase';

export default function LockScreen() {
  const [password, setPassword] = useState('');
  const [accessType, setAccessType] = useState<'none' | 'master' | 'admin' | 'timed'>('none');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Check Hardcoded Master Key
      if (password === 'mohamed145') {
        setAccessType('master');
        setIsLoading(false);
        return;
      }

      // 2. Check Hardcoded Admin Key
      if (password === 'admin123') {
        setAccessType('admin');
        setIsLoading(false);
        return;
      }

      // 3. Check Supabase for Timed Codes
      const { data, error: sbError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', password)
        .single();

      if (sbError || !data) {
        setError('كلمة المرور غير صحيحة أو انتهت صلاحيتها');
        setIsLoading(false);
        return;
      }

      if (data.is_active === false) {
        setError('هذا الكود تم إيقافه من قبل المسؤول');
        setIsLoading(false);
        return;
      }

      if (data.type === 'timed' && data.expires_at) {
        const expires = new Date(data.expires_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((expires - now) / 1000);

        if (diff <= 0) {
          setError('هذا الكود انتهت صلاحيته');
          setIsLoading(false);
          return;
        }
        setTimeLeft(diff);
      }

      setAccessType(data.type as any);
    } catch (err) {
      setError('حدث خطأ في الاتصال بالنظام');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('SW registered:', reg);
        }).catch(err => {
          console.log('SW registration failed:', err);
        });
      });
    }

    let timer: NodeJS.Timeout;
    if (accessType === 'timed' && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev: number | null) => {
          if (prev && prev <= 1) {
            setAccessType('none');
            setPassword('');
            setError('انتهى وقت الوصول التلقائي');
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [accessType, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [duration, setDuration] = useState('');
  const [activeCodes, setActiveCodes] = useState<any[]>([]);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setActiveCodes(data);
  };

  const handleToggleCode = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('access_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchCodes();
  };

  const handleDeleteCode = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الكود؟')) {
      await supabase.from('access_codes').delete().eq('id', id);
      fetchCodes();
    }
  };

  useEffect(() => {
    if (accessType === 'admin') {
      fetchCodes();
    }
  }, [accessType]);

  const handleCreateCode = async () => {
    if (!duration || isNaN(parseInt(duration))) {
      alert('الرجاء إدخال مدة صحيحة بالساعات');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(duration));

    const { error: insError } = await supabase
      .from('access_codes')
      .insert([
        { code, type: 'timed', expires_at: expiresAt.toISOString(), is_active: true }
      ]);

    if (!insError) {
      setDuration('');
      fetchCodes();
      alert(`تم إنشاء الكود بنجاح: ${code}`);
    } else {
      alert(`فشل إنشاء الكود: ${insError.message}`);
    }
  };

  if (accessType === 'master') {
    return (
      <div className="min-h-screen bg-[#050505]" dir="rtl">
        <header className="fixed top-0 w-full h-24 px-8 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex justify-between items-center z-50 shadow-2xl">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black gold-gradient tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] min-w-[200px]">AI Automation Studio</h1>
            <div className="hidden md:flex px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(234,179,8,0.2)]">
              Master Access
            </div>
          </div>
          <button
            onClick={() => { setAccessType('none'); setPassword(''); }}
            className="group flex items-center gap-3 bg-white/5 hover:bg-red-500/10 px-6 py-3 rounded-2xl border border-white/10 hover:border-red-500/30 transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-zinc-400 group-hover:text-red-500 transition-colors uppercase tracking-widest">خروج آمن</span>
            <LogOut size={16} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
          </button>
        </header>
        <main className="pt-32 pb-10 px-4 max-w-[1920px] mx-auto">
          <GeneratorInterface />
        </main>
      </div>
    );
  }

  if (accessType === 'admin') {
    return (
      <div className="min-h-screen bg-[#080808] text-white" dir="rtl">
        <header className="fixed top-0 w-full p-6 bg-red-950/10 backdrop-blur-xl border-b border-red-500/20 flex justify-between items-center z-50">
          <h1 className="text-2xl font-black text-red-500 flex items-center gap-3">
            <Settings className="animate-spin-slow" size={28} /> لوحة التحكم الإدارية
          </h1>
          <button onClick={() => { setAccessType('none'); setPassword(''); }} className="bg-red-600/20 border border-red-600/40 text-red-500 px-6 py-2.5 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all">تسجيل الخروج</button>
        </header>
        <main className="pt-32 p-8 max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 glass-card p-8 rounded-[2.5rem] border-red-500/10 space-y-6">
              <h3 className="text-xl font-bold text-red-400">توليد اشتراك جديد</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">مدة الصلاحية (ساعات)</label>
                  <input
                    type="number"
                    placeholder="24"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl focus:border-red-500/50 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleCreateCode}
                  className="w-full bg-red-600 py-4 rounded-2xl font-black text-lg hover:bg-red-500 shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={20} /> إنشاء مفتاح دخول
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border-white/5">
              <h3 className="text-xl font-bold mb-6 text-zinc-300">سجل المفاتيح النشطة</h3>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {activeCodes.length > 0 ? (
                  activeCodes.map((c) => (
                    <div key={c.id} className="flex justify-between items-center bg-white/5 p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
                      <div className="space-y-1">
                        <span className="font-mono text-2xl font-black text-yellow-500 tracking-tighter">{c.code}</span>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold">
                          <span className={cn("px-2 py-0.5 rounded", c.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                            {c.is_active ? 'نشط' : 'متوقف'}
                          </span>
                          <span>ينتهي: {new Date(c.expires_at).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleCode(c.id, c.is_active)}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                          title={c.is_active ? "تعطيل" : "تفعيل"}
                        >
                          <ShieldAlert size={18} className={c.is_active ? "text-yellow-500" : "text-green-500"} />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(c.id)}
                          className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500 transition-colors text-red-500 hover:text-white"
                          title="حذف"
                        >
                          <LogOut size={18} className="rotate-90" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                    <p className="text-zinc-600 font-bold italic">لا توجد بيانات متاحة حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (accessType === 'timed') {
    return (
      <div className="min-h-screen bg-[#050505]" dir="rtl">
        <header className="fixed top-0 w-full p-4 bg-black/60 backdrop-blur-2xl border-b border-white/10 flex justify-between items-center z-50">
          <div className="flex items-center gap-3 text-red-500 font-black text-lg bg-red-500/10 px-6 py-2.5 rounded-full border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <Clock size={22} className="animate-pulse" />
            <span className="font-mono tracking-wider">{formatTime(timeLeft || 0)}</span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black gold-gradient tracking-tighter">AI VIDEO PRO</h1>
            <button onClick={() => { setAccessType('none'); setPassword(''); }} className="p-2 text-zinc-600 hover:text-white transition-colors"><LogOut size={20} /></button>
          </div>
        </header>
        <main className="pt-28 pb-10 px-4 max-w-[1920px] mx-auto">
          <GeneratorInterface />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Cinematic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-card p-10 rounded-[3rem] border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl relative overflow-hidden"
        >
          {/* Top Decorative bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-700 via-yellow-500 to-yellow-200 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-yellow-500/30 group relative">
              <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 rounded-full" />
              <Lock className="text-black relative z-10" size={36} strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">AI Automation Studio</h1>
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase">AI Video Factory Enterprise V2.2</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 px-2 uppercase tracking-widest">مفتاح الوصول المشفر</label>
              <div className="relative group">
                <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password / Master Key"
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] py-5 pr-14 pl-6 text-white focus:outline-none focus:border-yellow-500/50 focus:bg-black/60 transition-all placeholder:text-zinc-700 text-lg shadow-inner"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-sm font-bold text-center flex items-center justify-center gap-2"
              >
                <ShieldAlert size={16} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full gold-button text-black font-black py-5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(234,179,8,0.2)] active:scale-95 transition-all text-xl flex items-center justify-center gap-3 disabled:opacity-50 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-shimmer" />
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>تفعيل النظام</span>
                  <ChevronLeft size={24} />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Servers Online</span>
            </div>
            <p className="text-zinc-700 text-[10px] font-bold tracking-tighter uppercase">
              End-to-End Encrypted &bull; 2026 Ready
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
