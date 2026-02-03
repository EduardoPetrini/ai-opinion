/**
 * API endpoint to view and manage ignored models
 */

import { getIgnoredModels } from '../utils/modelService'

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    // Return list of ignored models
    return {
      ignoredModels: getIgnoredModels(),
      count: getIgnoredModels().length
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
