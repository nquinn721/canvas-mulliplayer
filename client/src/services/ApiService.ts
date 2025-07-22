class ApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or fallback to localhost:3001/api
    this.baseUrl =
      (import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api";
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Utility method to get the base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const apiService = new ApiService();
