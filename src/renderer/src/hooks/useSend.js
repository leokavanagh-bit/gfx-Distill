import { useState, useEffect } from 'react'

export function useSend() {
  const [status, setStatus] = useState('idle') // idle | sending | complete | error
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    window.api.send.onProgress((data) => {
      if (data.step === 'error') {
        setError(data.message)
        setStatus('error')
      } else if (data.step === 'complete') {
        setStatus('complete')
        setProgressMessage('Done!')
      } else {
        setProgressMessage(data.message)
      }
    })
    return () => window.api.send?.removeProgressListeners?.()
  }, [])

  async function execute(params) {
    setStatus('sending')
    setError(null)
    setProgressMessage('Starting...')
    try {
      await window.api.send.execute(params)
      // complete status is set by onProgress handler when step === 'complete'
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setError(null)
    setProgressMessage('')
  }

  return { status, progressMessage, error, execute, reset }
}
