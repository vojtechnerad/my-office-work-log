import { useEffect } from 'react'

function App(): React.JSX.Element {
  useEffect(() => {
    void window.mowl.health()
  }, [])

  return <main>MOWL</main>
}

export default App
