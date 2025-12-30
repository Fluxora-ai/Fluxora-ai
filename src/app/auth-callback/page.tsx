'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setToken } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            router.push('/');
        } else {
            router.push('/login');
        }
    }, [searchParams, setToken, router]);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-white/50 animate-pulse">Completing sign in...</p>
        </div>
    );
}
