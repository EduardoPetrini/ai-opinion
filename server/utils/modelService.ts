
let cachedModels: string[] = []

interface OpenRouterModel {
  id: string
  slug: string
  name: string
  pricing: {
    prompt: string
    completion: string
  }
}

interface OpenRouterResponse {
  data: {
    models: OpenRouterModel[]
  }
}

export const fetchModels = async () => {
  try {
    console.log('Fetching free models from OpenRouter...')
    const response = await fetch('https://openrouter.ai/api/frontend/models/find?q=free')

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as OpenRouterResponse

    if (data && data.data && Array.isArray(data.data.models)) {
      // Filter for models that are actually free/available if needed, 
      // but the endpoint ?q=free should handle most of it.
      // We'll map to just the slug (id).
      const newModels = data.data.models.map((m: OpenRouterModel) => m.slug)

      if (newModels.length > 0) {
        cachedModels = newModels
        console.log(`Successfully updated model list. ${cachedModels.length} models available.`)
      } else {
        console.warn('Fetched model list was empty. Keeping existing models.')
      }
    }
  } catch (error) {
    console.error('Error fetching models from OpenRouter:', error)
    // Don't clear cachedModels on error, keep using the old ones
  }
}

export const getModels = () => {
  // Return a copy to prevent mutation
  return [...cachedModels]
}
