import { Sparkles } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                <Sparkles className="relative w-12 h-12 text-blue-500 animate-bounce" />
            </div>
            <p className="text-white/20 text-sm tracking-[0.2em] uppercase">Initialising Fluxora-ai</p>
        </div>
    );
}
