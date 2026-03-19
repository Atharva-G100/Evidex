import InvestigatorPanel from '../components/InvestigatorPanel'
import styles from './Dashboard.module.css'

const Dashboard = ({ onNavigate }) => {
  return (
      <div className={styles.dashboard}>
          <h2 className={styles.title}>Welcome back, Officer.</h2>
          <p className={styles.subtitle}>SECURE TERMINAL ACCESS GRANTED</p>

            <div className={styles.cardContainer}>
                {/* Register Card */}
                <div
                    className={`${styles.card} ${styles.registerCard}`}
                    onClick={() => onNavigate('register')}
                >
                    <div className={styles.cornerTopLeft}></div>
                    <div className={styles.cornerBottomRight}></div>

                    <div className={styles.iconBadge}>
                        <svg viewBox="0 0 48 48" aria-hidden="true">
                            <rect x="6" y="10" width="36" height="28" rx="4" ry="4" />
                            <path d="M14 18h20M14 24h20" strokeWidth="2" />
                        </svg>
                    </div>
                    <h3>REGISTER EVIDENCE</h3>
                    <p>Securely upload and hash new digital evidence to the immutable registry.</p>
                </div>

                {/* Verify Card */}
                <div
                    className={`${styles.card} ${styles.verifyCard}`}
                    onClick={() => onNavigate('verify')}
                >
                    <div className={styles.cornerTopLeft}></div>
                    <div className={styles.cornerBottomRight}></div>

                    <div className={styles.iconBadge}>
                        <svg viewBox="0 0 48 48" aria-hidden="true">
                            <circle cx="19" cy="19" r="10" />
                            <line x1="27" y1="27" x2="38" y2="38" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h3>VERIFY INTEGRITY</h3>
                    <p>Cross-reference file hashes against the blockchain to detect tampering.</p>
                </div>
        </div>

        <InvestigatorPanel />
    </div>
  )
}

export default Dashboard
