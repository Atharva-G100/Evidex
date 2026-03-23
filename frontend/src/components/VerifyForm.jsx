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

    const formatDate = (value) => {
        const date = new Date(value)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    }

    const buildIpfsUrl = (cid) => `https://gateway.pinata.cloud/ipfs/${cid}`

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
            const [caseId, officerName, ipfsCid, uploader, timestamp, status] = await contract.getEvidence(hash)

            const ts = Number(timestamp)
            if (!ts) {
                setStatus('failure')
                return
            }

            const when = formatDate(ts * 1000)

            const custodyStatus = Number(status)
            let statusLabel = 'Analyzed'
            if (custodyStatus === 0) statusLabel = 'Collected'
            else if (custodyStatus === 1) statusLabel = 'Transferred'

            setEvidenceData({
                officerName,
                caseId,
                ipfsCid,
                uploader,
                timestamp: when,
                status: statusLabel
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
                        <span className={styles.fileIcon}>
                            <svg viewBox="0 0 48 48" role="img" aria-label="file">
                                <rect x="10" y="6" width="28" height="36" rx="3" />
                                <line x1="16" y1="18" x2="32" y2="18" />
                                <line x1="16" y1="24" x2="32" y2="24" />
                                <line x1="16" y1="30" x2="26" y2="30" />
                            </svg>
                        </span>
                                <div className={styles.fileName}>{file.name}</div>
                            </div>
                        ) : (
                            <>
                                <span className={styles.uploadIcon}>
                                    <svg viewBox="0 0 48 48" role="img" aria-label="scan">
                                        <circle cx="20" cy="20" r="9" />
                                        <circle cx="20" cy="20" r="5" />
                                        <line x1="30" y1="30" x2="40" y2="40" />
                                    </svg>
                                </span>
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
                        <span className={styles.resultIcon}>
                            <svg viewBox="0 0 48 48" role="img" aria-label="shield">
                                <path d="M24 4 L38 10 L38 22 C38 32 29 40 24 44 C19 40 10 32 10 22 L10 10 Z" />
                            </svg>
                        </span>
                        <h3>INTEGRITY CONFIRMED</h3>
                    </div>
                    <div className={styles.resultDetails}>
                        <p><strong>Status:</strong> <span className={styles.tagSuccess}>{evidenceData.status}</span></p>
                        <p><strong>Registrar:</strong> {evidenceData.officerName}</p>
                        <p><strong>Case ID:</strong> {evidenceData.caseId}</p>
                        {evidenceData.ipfsCid && (
                            <p>
                                <strong>IPFS CID:</strong> {evidenceData.ipfsCid}
                                <a
                                    className={styles.inlineLink}
                                    href={buildIpfsUrl(evidenceData.ipfsCid)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open
                                </a>
                            </p>
                        )}
                        <p><strong>Uploader:</strong> {evidenceData.uploader}</p>
                        <p><strong>Timestamp:</strong> {evidenceData.timestamp}</p>
                    </div>
                </div>
            )}

            {status === 'failure' && (
                <div className={`${styles.resultBox} ${styles.failure}`}>
                    <div className={styles.resultHeader}>
                        <span className={styles.resultIcon}>
                            <svg viewBox="0 0 48 48" role="img" aria-label="alert">
                                <circle cx="24" cy="24" r="18" />
                                <line x1="24" y1="14" x2="24" y2="30" />
                                <circle cx="24" cy="36" r="1.5" />
                            </svg>
                        </span>
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
