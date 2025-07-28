
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface WebsiteProject {
  id: string;
  name: string;
  chatHistory: Message[];
  generatedCode: string | null;
}

export type DeployState = 
  | { status: 'idle' }
  | { status: 'loading'; projectId: string | null }
  | { status: 'success'; url: string; projectId: string | null }
  | { status: 'error'; error?: string; projectId: string | null };

export interface GenerateCodeResult {
  summary: string;
  code: string | null;
}
