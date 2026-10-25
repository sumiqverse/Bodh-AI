export interface HealthResponse {
  readonly status: 'ok';
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetchFn?: typeof fetch;
}

export class BodhaiApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async getHealth(): Promise<HealthResponse> {
    const url = `${this.baseUrl}/health`;
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'status' in data && data.status === 'ok') {
      return data as HealthResponse;
    }

    throw new Error('Invalid health response received from server');
  }
}
