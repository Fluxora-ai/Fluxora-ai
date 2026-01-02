'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Message, Thread } from '@/types';
import { useAuth } from './AuthProvider';

interface ChatContextType {
    threads: Thread[];
    activeThreadId: string | null;
    setActiveThreadId: (id: string | null) => void;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    fetchThreads: () => Promise<void>;
    createThread: () => Promise<string | null>;
    deleteThread: (id: string) => Promise<void>;
    fetchHistory: (id: string) => Promise<void>;
    sendMessage: (content: string, threadId?: string) => Promise<{ response: string, thread_id: string } | null>;
    isStreaming: boolean;
    setIsStreaming: (val: boolean) => void;
    showToolCalls: boolean;
    setShowToolCalls: (val: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const parseContent = (content: unknown): string => {
    if (content === null || content === undefined) return '';

    if (Array.isArray(content)) {
        return content
            .map((block) => {
                if (typeof block === 'string') return block;
                if (typeof block === 'object' && block !== null) {
                    const b = block as Record<string, unknown>;
                    return String(b.text ?? b.content ?? JSON.stringify(b));
                }
                return String(block);
            })
            .join('\n');
    }

    if (typeof content === 'string') {
        const trimmed = content.trim();
        try {
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                const parsed = JSON.parse(trimmed);
                return parseContent(parsed);
            }
        } catch (e) {
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const textRegex = /['"]text['"]:\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/g;
                const matches: string[] = [];
                let match: RegExpExecArray | null;
                while ((match = textRegex.exec(trimmed)) !== null) {
                    matches.push(match[2].replace(/\\(['"])/g, '$1').replace(/\\n/g, '\n'));
                }

                if (matches.length > 0) {
                    return matches.join('\n');
                }
            }
        }
        return content;
    }

    if (typeof content === 'object' && content !== null) {
        const obj = content as Record<string, unknown>;
        return String(obj.text ?? obj.content ?? JSON.stringify(obj));
    }

    return String(content);
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { token, logout } = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [showToolCalls, setShowToolCalls] = useState(false);
    const isInitialLoad = React.useRef(true);
    const lastLoadedThreadId = React.useRef<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fluxora-api.aakashjammula.org';
    // NOTE: `API_URL` should come from environment and not contain secrets in client-side code.
    // Keep sensitive endpoints and secrets on the server; only public API base URLs belong here.

    const fetchThreads = React.useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/threads`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) return logout();
            const data = await res.json();
            setThreads(Array.isArray(data) ? (data as Thread[]) : (data.threads || []));
        } catch (err) {
            console.error('Failed to fetch threads', err);
        }
    }, [API_URL, token, logout]);

    const createThread = async () => {
        if (!token) return null;
        try {
            const res = await fetch(`${API_URL}/threads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            if (res.status === 401) {
                logout();
                return null;
            }
            const data = await res.json();
            await fetchThreads();
            return data.thread_id;
        } catch (err) {
            console.error('Failed to create thread', err);
            return null;
        }
    };

    const deleteThread = async (id: string) => {
        if (!token) return;
        try {
            await fetch(`${API_URL}/threads/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setThreads(threads.filter((t) => t.thread_id !== id));
            if (activeThreadId === id) {
                setActiveThreadId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete thread', err);
        }
    };

    const fetchHistory = async (id: string) => {
        if (!token) return;

        isInitialLoad.current = true;
        lastLoadedThreadId.current = id;

        // 1. Load from localStorage for instant UI feedback. Guard access
        // because localStorage may be unavailable in some environments.
        try {
            const saved = localStorage.getItem(`chat_history_${id}`);
            if (saved) {
                try {
                    setMessages(JSON.parse(saved));
                } catch (e) {
                    console.warn('Failed to parse cached chat history', e);
                    setMessages([]);
                }
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.warn('localStorage access failed while loading chat history', e);
            setMessages([]);
        }

        // 2. Sync with backend
        try {
            const res = await fetch(`${API_URL}/threads/${id}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) return logout();

            if (res.ok) {
                const data = await res.json();
                // backend returns { "messages": [...] } based on screenshot
                const rawMessages = Array.isArray(data) ? data as unknown[] : (Array.isArray(data?.messages) ? data.messages as unknown[] : []);
                const processed: Message[] = rawMessages
                    .filter((m) => {
                        if (!m) return false;
                        const candidate = m as any;
                        const hasToolCalls = Boolean(candidate.tool_calls || candidate.additional_kwargs?.tool_calls);
                        const role = String(candidate.role ?? candidate.type ?? candidate.sender ?? '').toLowerCase();

                        if (role === 'tool' || role === 'toolmessage' || hasToolCalls) return true;

                        const content = candidate.content ?? candidate.message ?? candidate.text ?? '';
                        if (Array.isArray(content) && content.length === 0) return false;
                        return Boolean(content);
                    })
                    .map((m) => {
                        const obj = m as any;
                        const role = String(obj.role ?? obj.type ?? obj.sender ?? '').toLowerCase();
                        const isHuman = role === 'human' || role === 'user' || role === 'humanmessage';
                        const isTool = role === 'tool' || role === 'toolmessage';

                        let messageType: 'human' | 'ai' | 'tool' = 'ai';
                        if (isHuman) messageType = 'human';
                        else if (isTool) messageType = 'tool';

                        let finalContent = parseContent(obj.content ?? obj.message ?? obj.text ?? '');
                        const toolCalls = obj.tool_calls || obj.additional_kwargs?.tool_calls;

                        if (!finalContent && toolCalls) {
                            finalContent = `**System: Tool Usage**\n\`\`\`json\n${JSON.stringify(toolCalls, null, 2)}\n\`\`\``;
                        }

                        return {
                            id: String(obj.id ?? Math.random().toString()),
                            content: finalContent,
                            type: messageType
                        } as Message;
                    });

                // ALWAYS update messages and cache, even if empty, to stay in sync with backend.
                setMessages(processed);
                try {
                    localStorage.setItem(`chat_history_${id}`, JSON.stringify(processed));
                } catch (e) {
                    console.warn('Failed to persist chat history to localStorage', e);
                }
            }
        } catch (err) {
            console.error('Failed to fetch backend history', err);
        } finally {
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 100);
        }
    };

    const sendMessage = async (message: string, thread_id?: string) => {
        if (!token) return null;
        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, thread_id }),
            });
            if (res.status === 401) {
                logout();
                return null;
            }
            const data = await res.json();

            // Handle complex response content
            const rawResponse = data.response || data.reply || '';
            const processedResponse = parseContent(rawResponse);

            await fetchThreads();
            if (data.thread_id) await fetchHistory(data.thread_id);
            return {
                ...data,
                response: processedResponse
            };
        } catch (err) {
            console.error('Failed to send message', err);
            return null;
        }
    };

    useEffect(() => {
        if (token) {
            fetchThreads();
        }
    }, [token, fetchThreads]);

    // Persist messages to local storage whenever they change
    useEffect(() => {
        if (!isInitialLoad.current && activeThreadId && activeThreadId === lastLoadedThreadId.current && messages.length > 0) {
            try {
                localStorage.setItem(`chat_history_${activeThreadId}`, JSON.stringify(messages));
            } catch (e) {
                console.warn('Failed to persist chat history', e);
            }
        }
    }, [messages, activeThreadId]);

    return (
        <ChatContext.Provider
            value={{
                threads,
                activeThreadId,
                setActiveThreadId,
                messages,
                setMessages,
                fetchThreads,
                createThread,
                deleteThread,
                fetchHistory,
                sendMessage,
                isStreaming,
                setIsStreaming,
                showToolCalls,
                setShowToolCalls
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
