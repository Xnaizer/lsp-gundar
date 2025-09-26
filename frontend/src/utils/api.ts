const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          // If can't parse error as JSON, use the original message
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ API Error: ${config.method || 'GET'} ${url}`, errorMessage)
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Success: ${config.method || 'GET'} ${url}`)
      }
      
      return { data, status: response.status }
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ API Request Failed: ${config.method || 'GET'} ${url}`, error)
      }
      throw error
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

const api = new ApiClient(API_BASE_URL)
export default api