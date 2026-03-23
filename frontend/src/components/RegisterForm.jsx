import { useState } from 'react'
import styles from './RegisterForm.module.css'
import { useWallet } from '../hooks/useWallet'
import { getEvidenceRegistryContract } from '../contracts/evidenceRegistry'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').trim()

const RegisterForm = ({ onBack }) => {
    const { account, chainId, isCorrectNetwork, connect, provider, getSigner, error: walletError, setError: setWalletError } = useWallet()
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
    const [uploadDetails, setUploadDetails] = useState(null)

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

    const getApiUrl = (path) => {
        if (!BACKEND_URL) return path
        return `${BACKEND_URL.replace(/\/$/, '')}${path}`
    }

    const uploadToPinata = async ({ signer, selectedFile, fileHash }) => {
        const timestamp = Date.now()
        const normalisedAddress = account.toLowerCase()
        const message = [
            'Evidence Registry Pinata Upload',
            `address:${normalisedAddress}`,
            `chainId:${String(chainId).toLowerCase()}`,
            `timestamp:${timestamp}`
        ].join('\n')

        const signature = await signer.signMessage(message)
        const form = new FormData()
        form.append('file', selectedFile)
        form.append('caseId', formData.caseId.trim())
        form.append('fileHash', fileHash)
        form.append('officerName', formData.officerName.trim())
        form.append('notes', formData.notes.trim())

        const response = await fetch(getApiUrl('/pinata/upload'), {
            method: 'POST',
            headers: {
                'x-wallet-address': normalisedAddress,
                'x-wallet-signature': signature,
                'x-chain-id': String(chainId).toLowerCase(),
                'x-auth-timestamp': String(timestamp)
            },
            body: form
        })

        const payload = await response.json()
        if (!response.ok) {
            throw new Error(payload?.error || 'Pinata upload failed.')
        }

        return payload
    }

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        setFile(selectedFile)
        setHash('')
        setStatus('idle')
        setTxDetails(null)
        setErrorMsg(null)
        setUploadDetails(null)
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

        if (!chainId) {
            setErrorMsg('Unable to determine connected network.')
            return
        }

        setStatus('registering')

        try {
            // Ensure wallet error (if any) is cleared once user proceeds.
            setWalletError?.(null)

            const signer = await getSigner()
            const uploadResult = await uploadToPinata({
                signer,
                selectedFile: file,
                fileHash: hash
            })
            setUploadDetails(uploadResult)
            const contract = getEvidenceRegistryContract(signer)
            const defaultStatus = 0 // CustodyStatus.COLLECTED

            const tx = await contract.registerEvidence(
                hash,
                formData.caseId.trim(),
                formData.officerName.trim(),
                uploadResult.cid,
                defaultStatus
            )
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
                timestamp: formatDate(blockTimestampIso || new Date().toISOString())
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
                                    <span className={styles.fileIcon}>
                                        <svg viewBox="0 0 48 48" role="img" aria-label="file">
                                            <rect x="12" y="6" width="24" height="36" rx="3" />
                                            <line x1="16" y1="18" x2="32" y2="18" />
                                            <line x1="16" y1="24" x2="32" y2="24" />
                                            <line x1="16" y1="30" x2="26" y2="30" />
                                        </svg>
                                    </span>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</span>
                                </div>
                            ) : (
                                <>
                                    <span className={styles.uploadIcon}>
                                        <svg viewBox="0 0 48 48" role="img" aria-label="upload">
                                            <path d="M14 34h20a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" />
                                            <line x1="24" y1="31" x2="24" y2="20" />
                                            <polyline points="19,24 24,19 29,24" />
                                        </svg>
                                    </span>
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
                    <div className={styles.successHeader}>
                        <span className={styles.successIcon}>
                            <svg viewBox="0 0 48 48" role="img" aria-label="shield">
                                <path d="M24 4 L36 10 L36 22 C36 30 29 36 24 40 C19 36 12 30 12 22 L12 10 Z" />
                                <polyline points="16 22 22 28 32 18" />
                            </svg>
                        </span>
                        <h3>Evidence Secured on Blockchain</h3>
                    </div>
                    <div className={styles.txInfo}>
                        {uploadDetails?.cid && (
                            <p>
                                <strong>IPFS CID:</strong> {uploadDetails.cid}
                                {uploadDetails?.gatewayUrl && (
                                    <a
                                        className={styles.inlineLink}
                                        href={uploadDetails.gatewayUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open
                                    </a>
                                )}
                            </p>
                        )}
                        {uploadDetails?.size != null && <p><strong>IPFS Size:</strong> {uploadDetails.size} bytes</p>}
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
