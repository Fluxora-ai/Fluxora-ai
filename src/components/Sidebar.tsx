'use client';

import React from 'react';
import { useChat } from '@/providers/ChatProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Plus, MessageSquare, Trash2, LogOut, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from 'framer-motion';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
    const { threads, activeThreadId, setActiveThreadId, createThread, deleteThread, fetchHistory } = useChat();
    const { logout } = useAuth();
    const [search, setSearch] = React.useState('');

    // Be defensive: thread titles may be missing or null from backend; coerce to string
    const filteredThreads = threads.filter(t => (t.title || '').toLowerCase().includes(search.toLowerCase()));

    const handleThreadClick = (id: string) => {
        setActiveThreadId(id);
        fetchHistory(id);
    };

    const handleNewChat = async () => {
        const id = await createThread();
        if (id) {
            setActiveThreadId(id);
        }
    };

    return (
        <m.aside
            initial={false}
            animate={{ width: isOpen ? 260 : 0 }}
            className={cn(
                "h-screen bg-[#0a0a0a] border-r border-white/5 flex flex-col relative overflow-hidden transition-all duration-300",
                !isOpen && "invisible"
            )}
        >
            <div className="p-4 flex flex-col gap-4 h-full">
                {/* Header */}
                <button
                    onClick={handleNewChat}
                    className="flex items-center gap-3 w-full p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </button>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search threads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-white/10"
                    />
                </div>

                {/* Thread List */}
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {filteredThreads.map((thread) => (
                            <m.div
                                key={thread.thread_id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={cn(
                                    "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all relative",
                                    activeThreadId === thread.thread_id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                                onClick={() => handleThreadClick(thread.thread_id)}
                            >
                                <MessageSquare className="w-4 h-4 shrink-0" />
                                <span className="truncate text-sm flex-1">{thread.title || 'New Chat'}</span>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteThread(thread.thread_id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </m.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full p-3 rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </m.aside>
    );
}
