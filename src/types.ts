export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  image?: string;
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isGeneratingAppeal: boolean;
  generatedAppeal: string | null;
  generationCount: number;
}

export interface PaymentInfo {
  id: string;
  encodedImage: string;
  payload: string;
  mock?: boolean;
}
