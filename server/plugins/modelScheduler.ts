
export default defineNitroPlugin(async (nitroApp) => {
  // Initial fetch on server startup
  await fetchModels()

  // Schedule updates every hour (3600000 ms)
  setInterval(async () => {
    await fetchModels()
  }, 3600000)
})
