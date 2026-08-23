import { Problem, Submission } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = {
  getProblems: async (): Promise<Problem[]> => {
    const res = await fetch(`${API_URL}/problems`);
    if (!res.ok) throw new Error('Failed to fetch problems');
    return res.json();
  },

  getProblem: async (code: string): Promise<Problem> => {
    const res = await fetch(`${API_URL}/problems/${code}`);
    if (!res.ok) throw new Error('Failed to fetch problem');
    return res.json();
  },

  submitCode: async (problemCode: string, sourceCode: string, language: string = 'cpp'): Promise<Submission> => {
    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemCode, sourceCode, language }),
    });
    if (!res.ok) throw new Error('Failed to submit code');
    return res.json();
  },

  runCustomInput: async (problemCode: string, sourceCode: string, input: string, language: string = 'cpp'): Promise<any> => {
    const res = await fetch(`${API_URL}/submissions/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemCode, sourceCode, input, language }),
    });
    if (!res.ok) throw new Error('Failed to run custom input');
    return res.json();
  },

  getSubmission: async (id: string): Promise<Submission> => {
    const res = await fetch(`${API_URL}/submissions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch submission');
    return res.json();
  },

  getSubmissions: async (problemCode?: string, page: number = 1): Promise<{ data: Submission[], total: number }> => {
    const url = new URL(`${API_URL}/submissions`);
    if (problemCode) url.searchParams.append('problemCode', problemCode);
    url.searchParams.append('page', page.toString());
    
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch submissions');
    return res.json();
  },
};
