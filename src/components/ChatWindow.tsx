'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { useChat } from '@/providers/ChatProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Send, Loader2, Bot, User, CornerDownLeft, Sparkles, Terminal, Wrench } from 'lucide-react';
import dynamic from 'next/dynamic';
import { m, AnimatePresence, LazyMotion, domMax } from 'framer-motion';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-white/5 h-4 w-32 rounded" />
});

export default function ChatWindow() {
    const {
        messages,
        setMessages,
        activeThreadId,
        setActiveThreadId,
        isStreaming,
        setIsStreaming,
        sendMessage,
        showToolCalls,
        setShowToolCalls
    } = useChat();
    const { token } = useAuth();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isStreaming || !token) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to UI immediately
        const newUserMsg = { type: 'human' as const, content: userMessage, id: Date.now().toString() };
        setMessages(prev => [...prev, newUserMsg]);
        setIsStreaming(true);

        try {
            const result = await sendMessage(userMessage, activeThreadId || undefined);

            if (result) {
                const { thread_id } = result;

                if (!activeThreadId) {
                    setActiveThreadId(thread_id);
                }
            }
        } catch (err) {
            console.error('Failed to send message', err);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <LazyMotion features={domMax}>
            <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
                {/* Header with Toggle */}
                <div className="flex-none h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center relative overflow-hidden">
                            <Image src="/logo.png" alt="Fluxora" fill className="object-cover" />
                        </div>
                        <span className="text-sm font-medium text-white/90">Fluxora-ai</span>
                    </div>

                    <button
                        onClick={() => setShowToolCalls(!showToolCalls)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium",
                            showToolCalls
                                ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        {showToolCalls ? "Hide Tools" : "Show Tools"}
                    </button>
                </div>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar pb-12"
                >
                    {messages.length === 0 && !isStreaming ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-bounce relative overflow-hidden">
                                <Image src="/logo.png" alt="Fluxora" fill className="object-cover" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-white/90">How can I help you today?</h2>
                                <p className="text-white/40 max-w-sm mt-2">Fluxora-ai is ready to search and assist with your complex queries.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto w-full space-y-8">
                            <AnimatePresence>
                                {messages
                                    .filter(msg => showToolCalls || msg.type !== 'tool')
                                    .map((msg, idx) => (
                                        <m.div
                                            key={msg.id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "flex gap-4 group",
                                                (msg.type === 'human' || msg.type === 'HumanMessage') ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex gap-4 max-w-[85%]",
                                                (msg.type === 'human' || msg.type === 'HumanMessage') && "flex-row-reverse"
                                            )}>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border relative overflow-hidden",
                                                    (msg.type === 'human' || msg.type === 'HumanMessage')
                                                        ? "bg-white/10 border-white/10 text-white/70"
                                                        : msg.type === 'tool'
                                                            ? "bg-amber-600/10 border-amber-500/20 text-amber-400"
                                                            : "bg-blue-600/10 border-blue-500/20"
                                                )}>
                                                    {msg.type === 'human' || msg.type === 'HumanMessage'
                                                        ? <User className="w-4 h-4" />
                                                        : msg.type === 'tool'
                                                            ? <Wrench className="w-4 h-4" />
                                                            : <Image src="/logo.png" alt="Fluxora" fill className="object-cover" />
                                                    }
                                                </div>

                                                <div className={cn(
                                                    "prose prose-invert max-w-none p-4 rounded-2xl",
                                                    (msg.type === 'human' || msg.type === 'HumanMessage')
                                                        ? "bg-white/5 border border-white/10 text-white/90"
                                                        : msg.type === 'tool'
                                                            ? "bg-white/[0.02] border border-white/5 text-amber-200/70 font-mono text-[11px] leading-relaxed"
                                                            : "bg-transparent text-white/90"
                                                )}>
                                                    {msg.type === 'tool' ? (
                                                        <pre className="whitespace-pre-wrap break-all">
                                                            {msg.content}
                                                        </pre>
                                                    ) : (
                                                        // Security: disable raw HTML rendering to reduce XSS risk.
                                                        // For stronger sanitization, consider adding `rehype-sanitize`
                                                        // and a custom `components` map to control link `rel` attributes.
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={true}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>
                                            </div>
                                        </m.div>
                                    ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
                    <div className="max-w-3xl mx-auto relative group">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        <form
                            onSubmit={handleSend}
                            className="relative bg-white/5 border border-white/10 rounded-2xl p-2 flex items-end gap-2 focus-within:border-white/20 transition-all"
                        >
                            <textarea
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Message Fluxora-ai..."
                                className="flex-1 bg-transparent border-none outline-none resize-none p-3 text-white placeholder:text-white/20 min-h-[52px] max-h-40"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isStreaming}
                                className="mb-1 p-3 rounded-xl bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 transition-all active:scale-95"
                            >
                                {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                        <div className="mt-2 flex justify-center">
                            <p className="text-[10px] text-white/20 flex items-center gap-1 uppercase tracking-widest">
                                <CornerDownLeft className="w-3 h-3" /> Shift + Enter for new line
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </LazyMotion>
    );
}
