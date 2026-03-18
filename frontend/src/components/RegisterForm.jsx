import { useState } from 'react'
import styles from './RegisterForm.module.css'
import { useWallet } from '../hooks/useWallet'
import { getEvidenceRegistryContract } from '../contracts/evidenceRegistry'

const RegisterForm = ({ onBack }) => {
    const { account, isCorrectNetwork, connect, provider, getSigner, error: walletError, setError: setWalletError } = useWallet()
    const [file, setFile] = useState(null)
    const [hash, setHash] = useState('')
    const [isHashing, setIsHashing] = useState(false)
    const [formData, setFormData] = useState({
        caseId: '',
        officerName: '',
        evidenceType: 'Digital',
        notes: ''
    })
    const [status, setStatus] = useState('idle') // idle, hashing, ready, registering, success
    const [txDetails, setTxDetails] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        setFile(selectedFile)
        setHash('')
        setStatus('idle')
        setTxDetails(null)
        setErrorMsg(null)
    }

    const generateHash = async () => {
        if (!file) return
        setIsHashing(true)
        setStatus('hashing')
        setErrorMsg(null)

        try {
            // Simulate "Working" delay for effect
            await new Promise(r => setTimeout(r, 1000));

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

    const registerEvidence = async () => {
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

        if (!formData.caseId.trim() || !formData.officerName.trim()) {
            setErrorMsg('Please enter both Case ID and Officer Name before registering.')
            return
        }

        setStatus('registering')

        try {
            // Ensure wallet error (if any) is cleared once user proceeds.
            setWalletError?.(null)

            const signer = await getSigner()
            const contract = getEvidenceRegistryContract(signer)

            const tx = await contract.registerEvidence(hash, formData.caseId.trim(), formData.officerName.trim())
            const receipt = await tx.wait()

            let blockTimestampIso = null
            try {
                if (provider && receipt?.blockNumber != null) {
                    const block = await provider.getBlock(receipt.blockNumber)
                    if (block?.timestamp) {
                        blockTimestampIso = new Date(Number(block.timestamp) * 1000).toISOString()
                    }
                }
            } catch {
                // Non-critical.
            }

            setTxDetails({
                txHash: tx.hash,
                blockNumber: receipt?.blockNumber,
                timestamp: blockTimestampIso || new Date().toISOString()
            })
            setStatus('success')
        } catch (e) {
            // Common MetaMask + EVM failure cases
            if (e?.code === 4001) {
                setErrorMsg('Transaction rejected in MetaMask.')
            } else {
                const msg = e?.shortMessage || e?.reason || e?.message || 'Transaction failed.'
                setErrorMsg(msg)
            }
            setStatus('ready')
        }
    }

    return (
        <div className={styles.container}>
            <button onClick={onBack} className={styles.backBtn}>← Back to Dashboard</button>

            <h2 className={styles.heading}>Register New Evidence</h2>

            <div className={styles.grid}>
                {/* Left Column: File Upload */}
                <div className={styles.leftCol}>
                    <div className={styles.uploadBox}>
                        <div className={styles.scanLine}></div>
                        <input
                            type="file"
                            id="fileInput"
                            className={styles.fileInput}
                            onChange={handleFileChange}
                        />
                        <label htmlFor="fileInput" className={styles.uploadLabel}>
                            {file ? (
                                <div className={styles.filePreview}>
                                    <span className={styles.fileIcon}>📄</span>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</span>
                                </div>
                            ) : (
                                <>
                                    <span className={styles.uploadIcon}>☁️</span>
                                    <span>Drag & Drop or Click to Upload</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Right Column: Metadata */}
                <div className={styles.rightCol}>
                    <div className={styles.formGroup}>
                        <label>Case ID</label>
                        <input
                            type="text"
                            placeholder="e.g. CCS-2026-X01"
                            value={formData.caseId}
                            onChange={e => setFormData({ ...formData, caseId: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Officer Name</label>
                        <input
                            type="text"
                            placeholder="Officer Name"
                            value={formData.officerName}
                            onChange={e => setFormData({ ...formData, officerName: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Evidence Type</label>
                        <select
                            value={formData.evidenceType}
                            onChange={e => setFormData({ ...formData, evidenceType: e.target.value })}
                        >
                            <option>Digital Forensics</option>
                            <option>Physical (Photo)</option>
                            <option>Document Scan</option>
                            <option>Audio/Video Log</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Chain of Custody Notes</label>
                        <textarea
                            rows="3"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                {!hash && (
                    <button
                        className={styles.actionBtn}
                        onClick={generateHash}
                        disabled={!file || isHashing}
                    >
                        {isHashing ? 'Computing Cryptographic Hash...' : 'Generate SHA-256 Digest'}
                    </button>
                )}

                {hash && (
                    <div className={styles.hashResult}>
                        <label>Computed SHA-256 Digest:</label>
                        <div className={styles.hashBox}>{hash}</div>

                        {status !== 'success' && (
                            <button
                                className={`${styles.actionBtn} ${styles.registerBtn}`}
                                onClick={registerEvidence}
                                disabled={status === 'registering'}
                            >
                                {status === 'registering' ? 'Broadcasting to Network...' : 'Commit to Blockchain'}
                            </button>
                        )}
                    </div>
                )}
            </div>

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

            {/* Success State */}
            {status === 'success' && txDetails && (
                <div className={styles.successBox}>
                    <h3>✅ Evidence Secured on Blockchain</h3>
                    <div className={styles.txInfo}>
                        <p><strong>TX Hash:</strong> {txDetails.txHash}</p>
                        <p><strong>Block Height:</strong> {txDetails.blockNumber}</p>
                        <p><strong>Timestamp:</strong> {txDetails.timestamp}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RegisterForm
