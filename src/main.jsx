import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { isElectron } from './lib/desktop'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      gcTime: 10 * 60 * 1000,  // cache retention
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function SystemLifecycleBridge() {
  useEffect(() => {
    if (!isElectron || !window.emsApi?.onWakeUp) {
      return undefined;
    }

    return window.emsApi.onWakeUp(() => {
      queryClient.invalidateQueries()
    })
  }, [])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SystemLifecycleBridge />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
