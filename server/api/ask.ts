/**
 * Server API route for querying multiple LLMs via OpenRouter
 * 
 * Accepts POST requests with a user question and session ID.
 * Streams responses via WebSocket as each model completes.
 */

import { sendToClient } from '../plugins/websocket'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.openrouterApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file.'
    })
  }

  // Parse request body
  const body = await readBody(event)
  const { question, sessionId } = body

  if (!question || typeof question !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question is required and must be a string'
    })
  }

  if (!sessionId || typeof sessionId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Session ID is required and must be a string'
    })
  }

  // All available free models from OpenRouter
  // All available free models from OpenRouter (fetched dynamically)
  const allModels = getModels()

  // Fallback if no models are available (should not happen if plugin working correctly)
  if (allModels.length === 0) {
    console.warn('No models found in cache, using fallback list')
    allModels.push(
      "google/gemma-3-12b-it",
      "deepseek/deepseek-r1-0528",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2-vl-7b-instruct",
      "google/gemma-3-27b-it"
    )
  }

  // Randomly select 15 models from the available list
  const models = allModels
    .sort(() => Math.random() - 0.5)
    .slice(0, 15)

  // Send initial message with selected models
  sendToClient(sessionId, {
    type: 'models_selected',
    models: models
  })

  /**
   * Query a single model via OpenRouter and stream result via WebSocket
   */
  async function queryModel(modelName: string) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Optional, for rankings
          'X-Title': 'AI Opinion App' // Optional, for rankings
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1024,
          messages: [
            {
              role: 'system',
              content: 'You must respond in plain text only (no markdown, no formatting, no special characters). Keep your response to a maximum of 140 characters. Be concise and direct.'
            },
            {
              role: 'user',
              content: question
            }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || 'No response received'

      const result = {
        model: modelName,
        status: 'success',
        response: content
      }

      // Send result immediately via WebSocket
      sendToClient(sessionId, {
        type: 'result',
        data: result
      })

      return result
    } catch (error: any) {
      const result = {
        model: modelName,
        status: 'error',
        error: error.message || 'Unknown error occurred'
      }

      // Send error immediately via WebSocket
      sendToClient(sessionId, {
        type: 'result',
        data: result
      })

      return result
    }
  }

  // Execute all requests in parallel (don't wait for results)
  // Results are streamed via WebSocket as they complete
  Promise.allSettled(models.map(model => queryModel(model)))
    .then(() => {
      // Send completion message
      sendToClient(sessionId, {
        type: 'complete'
      })
    })
    .catch((error) => {
      console.error('Error in parallel execution:', error)
      sendToClient(sessionId, {
        type: 'error',
        error: 'Failed to process all models'
      })
    })

  // Return immediate acknowledgment
  return {
    success: true,
    message: 'Request received. Results will be streamed via WebSocket.',
    sessionId,
    modelCount: models.length
  }
})
