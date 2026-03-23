import { useState, useEffect } from 'react'
import styles from './SystemFooter.module.css'

const SystemFooter = () => {
    const [time, setTime] = useState(new Date())

    const formatDate = (value) => {
        const date = new Date(value)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <footer className={styles.footer}>
            <div className={styles.section}>
                <span className={styles.label}>Timestamp:</span>
                <span className={styles.value}>{formatDate(time)}</span>
            </div>
        </footer>
    )
}

export default SystemFooter
