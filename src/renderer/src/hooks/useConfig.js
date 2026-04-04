import { useState, useEffect } from 'react'

export function useConfig() {
  const [config, setConfig] = useState({ pngWatchFolder: '', studios: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.config.load().then((cfg) => {
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  async function saveConfig(updated) {
    await window.api.config.save(updated)
    setConfig(updated)
  }

  return { config, loading, saveConfig }
}
