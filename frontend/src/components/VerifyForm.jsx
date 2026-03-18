import { useState } from 'react'
import styles from './VerifyForm.module.css'
import { useWallet } from '../hooks/useWallet'
import { getEvidenceRegistryContract } from '../contracts/evidenceRegistry'

const VerifyForm = ({ onBack }) => {
    const { account, isCorrectNetwork, connect, provider, error: walletError, setError: setWalletError } = useWallet()
    const [file, setFile] = useState(null)
    const [hash, setHash] = useState('')
    const [isHashing, setIsHashing] = useState(false)
    const [status, setStatus] = useState('idle') // idle, hashing, ready, verifying, success, failure
    const [evidenceData, setEvidenceData] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        setFile(selectedFile)
        setHash('')
        setStatus('idle')
        setEvidenceData(null)
        setErrorMsg(null)
    }

    const generateHash = async () => {
        if (!file) return
        setIsHashing(true)
        setStatus('hashing')
        setErrorMsg(null)

        try {
            // Delay for effect
            await new Promise(r => setTimeout(r, 800));

            const buffer = await file.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            setHash(hashHex)
            setStatus('ready')
        } catch (error) {
            console.error("Hashing failed", error)
        } finally {
            setIsHashing(false)
        }
    }

    const verifyEvidence = async () => {
        if (!hash) return

        setErrorMsg(null)

        if (!account) {
            setErrorMsg('Wallet not connected. Please connect MetaMask first.')
            return
        }

        if (!isCorrectNetwork) {
            setErrorMsg('Wrong network. Please switch MetaMask to Sepolia.')
            return
        }

        setStatus('verifying')

        try {
            setWalletError?.(null)

            if (!provider) throw new Error('Wallet provider not available.')
            const contract = getEvidenceRegistryContract(provider)
            const [caseId, officerName, uploader, timestamp] = await contract.getEvidence(hash)

            const ts = Number(timestamp)
            if (!ts) {
                setStatus('failure')
                return
            }

            const when = new Date(ts * 1000).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })

            setEvidenceData({
                officerName,
                caseId,
                uploader,
                timestamp: when,
                status: 'Immutable / Verified'
            })
            setStatus('success')
        } catch (e) {
            const msg = e?.shortMessage || e?.reason || e?.message || 'Verification failed.'
            setErrorMsg(msg)
            setStatus('ready')
        }
    }

    return (
        <div className={styles.container}>
            <button onClick={onBack} className={styles.backBtn}>← Back to Dashboard</button>

            <h2 className={styles.heading}>Verify Evidence Integrity</h2>

            <div className={styles.verifyBox}>
                <div className={styles.uploadSection}>
                    <input
                        type="file"
                        id="verifyFileInput"
                        className={styles.fileInput}
                        onChange={handleFileChange}
                    />
                    <label htmlFor="verifyFileInput" className={styles.uploadLabel}>
                        {file ? (
                            <div className={styles.filePreview}>
                                <span className={styles.fileIcon}>📄</span>
                                <div className={styles.fileName}>{file.name}</div>
                            </div>
                        ) : (
                            <>
                                <span className={styles.uploadIcon}>🔍</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>INITIATE FILE SCAN</span>
                            </>
                        )}
                    </label>
                </div>

                <div className={styles.actionSection}>
                    {!hash && (
                        <button
                            className={styles.actionBtn}
                            onClick={generateHash}
                            disabled={!file || isHashing}
                        >
                            {isHashing ? 'COMPUTING HASH...' : 'GENERATE CHECKSUM'}
                        </button>
                    )}

                    {hash && (
                        <div className={styles.hashDisplay}>
                            <label>SHA-256 Checksum:</label>
                            <div className={styles.hashValue}>{hash}</div>

                            {status !== 'success' && status !== 'failure' && (
                                <button
                                    className={`${styles.actionBtn} ${styles.verifyBtn}`}
                                    onClick={verifyEvidence}
                                    disabled={status === 'verifying'}
                                >
                                    {status === 'verifying' ? 'QUERYING BLOCKCHAIN...' : 'VERIFY INTEGRITY'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            {status === 'success' && evidenceData && (
                <div className={`${styles.resultBox} ${styles.success}`}>
                    <div className={styles.resultHeader}>
                        <span className={styles.resultIcon}>🛡️</span>
                        <h3>INTEGRITY CONFIRMED</h3>
                    </div>
                    <div className={styles.resultDetails}>
                        <p><strong>Status:</strong> <span className={styles.tagSuccess}>{evidenceData.status}</span></p>
                        <p><strong>Registrar:</strong> {evidenceData.officerName}</p>
                        <p><strong>Case ID:</strong> {evidenceData.caseId}</p>
                        <p><strong>Uploader:</strong> {evidenceData.uploader}</p>
                        <p><strong>Timestamp:</strong> {evidenceData.timestamp}</p>
                    </div>
                </div>
            )}

            {status === 'failure' && (
                <div className={`${styles.resultBox} ${styles.failure}`}>
                    <div className={styles.resultHeader}>
                        <span className={styles.resultIcon}>❌</span>
                        <h3>INTEGRITY MISMATCH</h3>
                    </div>
                    <div className={styles.resultDetails}>
                        <p>CRITICAL ALERT: The cryptographic hash of this file does not match any record on the registry.</p>
                    </div>
                </div>
            )}

            {/* Wallet / error hints */}
            {(walletError || errorMsg) && (
                <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', opacity: 0.95 }}>
                        {errorMsg || walletError}
                    </div>
                    {!account && (
                        <div style={{ marginTop: '0.6rem' }}>
                            <button className={styles.actionBtn} onClick={connect}>Connect MetaMask</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default VerifyForm
