import WalletConnect from './WalletConnect'
import styles from './Navbar.module.css'
import { useWallet } from '../hooks/useWallet'
import evidexLogo from '../assets/evidex.svg'

const Navbar = () => {
    const { networkName, isCorrectNetwork } = useWallet()

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <img src={evidexLogo} alt="Evidex logo" className={styles.logoIcon} />
            </div>

            <div className={styles.actions}>
                <div className={styles.network}>
                    <span className={styles.networkDot}></span>
                    {isCorrectNetwork ? networkName : `Wrong network (${networkName})`}
                </div>
                <WalletConnect />
            </div>
        </nav>
    )
}

export default Navbar
