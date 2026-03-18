import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserProvider } from 'ethers'

const WalletContext = createContext(null)

const EXPECTED_CHAIN_ID = (import.meta.env.VITE_EXPECTED_CHAIN_ID || '0xaa36a7').toLowerCase()

function normaliseChainId(chainId) {
  if (!chainId) return null
  return String(chainId).toLowerCase()
}

function getReadableNetwork(chainId) {
  const id = normaliseChainId(chainId)
  if (id === '0xaa36a7') return 'Sepolia'
  if (!id) return 'Unknown'
  return `Chain ${parseInt(id, 16)}`
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const hasEthereum = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'

  const provider = useMemo(() => {
    if (!hasEthereum) return null
    // 'any' lets the provider handle chain changes without throwing.
    return new BrowserProvider(window.ethereum, 'any')
  }, [hasEthereum])

  const refreshState = useCallback(async () => {
    if (!hasEthereum) return
    try {
      const [acc] = await window.ethereum.request({ method: 'eth_accounts' })
      const cid = await window.ethereum.request({ method: 'eth_chainId' })
      setAccount(acc || null)
      setChainId(cid || null)
    } catch (e) {
      // Keep errors non-fatal; user can still click Connect.
      setError(e?.message || 'Failed to read wallet state.')
    }
  }, [hasEthereum])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  useEffect(() => {
    if (!hasEthereum) return

    const onAccountsChanged = (accounts) => {
      setAccount(accounts?.[0] || null)
      setError(null)
    }

    const onChainChanged = (newChainId) => {
      setChainId(newChainId)
      setError(null)
    }

    window.ethereum.on?.('accountsChanged', onAccountsChanged)
    window.ethereum.on?.('chainChanged', onChainChanged)

    return () => {
      window.ethereum.removeListener?.('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener?.('chainChanged', onChainChanged)
    }
  }, [hasEthereum])

  const connect = useCallback(async () => {
    setError(null)

    if (!hasEthereum) {
      setError('MetaMask not detected. Please install MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const cid = await window.ethereum.request({ method: 'eth_chainId' })

      setAccount(accounts?.[0] || null)
      setChainId(cid || null)

      if (normaliseChainId(cid) !== EXPECTED_CHAIN_ID) {
        setError(`Wrong network: connected to ${getReadableNetwork(cid)}. Please switch to Sepolia.`)
      }
    } catch (e) {
      if (e?.code === 4001) {
        setError('Connection request rejected in MetaMask.')
      } else {
        setError(e?.message || 'Failed to connect to MetaMask.')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [hasEthereum])

  const isCorrectNetwork = normaliseChainId(chainId) === EXPECTED_CHAIN_ID

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error('Wallet provider not available.')
    return await provider.getSigner()
  }, [provider])

  const value = {
    hasEthereum,
    provider,
    account,
    chainId,
    networkName: getReadableNetwork(chainId),
    isCorrectNetwork,
    connect,
    isConnecting,
    error,
    setError,
    getSigner
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
