import { useState, useEffect } from 'react'
import styles from './SystemFooter.module.css'

const SystemFooter = () => {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <footer className={styles.footer}>
            <div className={styles.section}>
                <span className={styles.label}>Timestamp:</span>
                <span className={styles.value}>{time.toLocaleString()}</span>
            </div>
        </footer>
    )
}

export default SystemFooter
