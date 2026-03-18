import { useMemo } from 'react'
import styles from './WalletConnect.module.css'
import { useWallet } from '../hooks/useWallet'

const WalletConnect = () => {
    const { account, connect, isConnecting } = useWallet()

    const displayAccount = useMemo(() => {
        if (!account) return null
        return `${account.slice(0, 6)}...${account.slice(-4)}`
    }, [account])

    return (
        <button
            className={styles.connectBtn}
            onClick={connect}
            disabled={!!account || isConnecting}
        >
            {account ? (
                <span className={styles.connected}>
                    <span className={styles.dot}></span>
                    {displayAccount}
                </span>
            ) : (
                isConnecting ? 'Connecting…' : 'Connect Wallet'
            )}
        </button>
    )
}

export default WalletConnect
