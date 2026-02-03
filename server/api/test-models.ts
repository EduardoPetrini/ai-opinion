
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.force) {
    await fetchModels()
  }

  return {
    models: getModels(),
    count: getModels().length
  }
})
