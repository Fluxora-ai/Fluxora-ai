export interface Message {
  role?: 'user' | 'assistant' | 'tool';
  type: 'human' | 'ai' | 'tool' | 'HumanMessage' | 'AIMessage' | 'ToolMessage';
  content: string;
  id?: string;
}

export interface Thread {
  thread_id: string;
  title: string;
  updated_at: string;
}

export interface User {
  email: string;
  token: string;
}
