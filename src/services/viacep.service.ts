import { IViaCepData } from '../models/Result.js';

const VIACEP_BASE_URL = 'https://viacep.com.br/ws';

export interface ViaCepResponse {
  success: boolean;
  found: boolean;
  data: IViaCepData | null;
  error: string | null;
}

export async function fetchCep(cep: string): Promise<ViaCepResponse> {
  try {
    const response = await fetch(`${VIACEP_BASE_URL}/${cep}/json/`);

    if (!response.ok) {
      return {
        success: false,
        found: false,
        data: null,
        error: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as { erro?: boolean } & IViaCepData;

    // ViaCEP returns { erro: true } for invalid CEPs - treat as success (processed correctly, just not found)
    if (data.erro) {
      return {
        success: true,
        found: false,
        data: null,
        error: null,
      };
    }

    return {
      success: true,
      found: true,
      data: data as IViaCepData,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      success: false,
      found: false,
      data: null,
      error: errorMessage,
    };
  }
}

export function isRetryableError(error: string | null): boolean {
  if (!error) return false;
  
  // Retry on network errors, timeouts, and 5xx errors
  const retryablePatterns = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'HTTP Error: 5',
    'fetch failed',
    'network',
  ];

  return retryablePatterns.some((pattern) =>
    error.toLowerCase().includes(pattern.toLowerCase())
  );
}
