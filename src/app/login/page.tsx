'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Mail, Lock, Chrome, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setToken } = useAuth();
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cortex-backend.aakashjammula.org';

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/login/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setStep('otp');
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/verify/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token);
                router.push('/');
            } else {
                setError(data.detail || 'Invalid OTP');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/login/google`;
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
            {/* Background shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl relative z-10"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Welcome to Cortex
                    </h1>
                    <p className="text-white/50">Your advanced AI assistant</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Chrome className="w-5 h-5 relative z-10" />
                        <span className="relative z-10">Continue with Google</span>
                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-center text-xs text-white/30 uppercase tracking-[0.2em] py-2">or</p>

                    <m.div
                        initial={false}
                        animate={{ height: step === 'email' ? 'auto' : 'auto' }}
                        className="space-y-4"
                    >
                        <form onSubmit={step === 'email' ? handleSendOtp : handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Secondary Option: Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={step === 'otp' || loading}
                                        placeholder="name@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500/30 transition-all text-sm disabled:opacity-50"
                                        required
                                    />
                                </div>
                            </div>

                            {step === 'otp' && (
                                <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-2"
                                >
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Verification Code</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            disabled={loading}
                                            placeholder="Enter 6-digit code"
                                            maxLength={6}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500/30 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </m.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white/5 border border-white/10 text-white/70 font-medium py-3 rounded-xl hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 group text-sm"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {step === 'email' ? 'Send Code' : 'Verify & Sign In'}
                                    </>
                                )}
                            </button>
                        </form>
                    </m.div>
                </div>
            </m.div>
        </div>
    );
}
