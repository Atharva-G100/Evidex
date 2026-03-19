import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEvidenceRegistryContract } from '../contracts/evidenceRegistry'
import { useWallet } from '../hooks/useWallet'
import deployed from '../contracts/deployed.json'
import styles from '../pages/Dashboard.module.css'

const InvestigatorPanel = () => {
  const { provider, getSigner, isCorrectNetwork } = useWallet()
  const [targetAddress, setTargetAddress] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isGranting, setIsGranting] = useState(false)
  const [investigators, setInvestigators] = useState([])

  const contractAddress = useMemo(() => deployed?.address || '', [])

  const loadInvestigators = useCallback(async () => {
    if (!provider || !isCorrectNetwork) {
      setInvestigators([])
      return
    }

    try {
      const contract = getEvidenceRegistryContract(provider)
      const events = await contract.queryFilter(contract.filters.InvestigatorUpdated(), 0, 'latest')

      const current = {}
      events.forEach(evt => {
        const investigator = evt.args?.investigator
        current[investigator] = evt.args?.granted
      })

      const list = Object.entries(current)
        .filter(([, granted]) => granted)
        .map(([address]) => address)

      setInvestigators(list)
    } catch (error) {
      console.error('Failed to load investigators', error)
    }
  }, [provider, isCorrectNetwork])

  useEffect(() => {
    loadInvestigators()
  }, [loadInvestigators])

  const grantInvestigator = async () => {
    if (!targetAddress?.trim()) return
    setIsGranting(true)
    setStatusMessage('')

    try {
      const signer = await getSigner()
      const contract = getEvidenceRegistryContract(signer)
      const tx = await contract.grantInvestigator(targetAddress.trim())
      await tx.wait()
      setStatusMessage(`Granted investigator access to ${targetAddress.trim()}`)
      setTargetAddress('')
      await loadInvestigators()
    } catch (error) {
      setStatusMessage(error?.shortMessage || error?.message || 'Grant failed')
    } finally {
      setIsGranting(false)
    }
  }

  const handleCopyContract = async () => {
    if (!contractAddress) return
    try {
      await navigator.clipboard.writeText(contractAddress)
      setStatusMessage('Contract address copied')
    } catch (error) {
      setStatusMessage('Copy failed')
    }
  }

  return (
    <section className={styles.adminPanel}>
      <div className={styles.adminHeader}>
        <div>
          <p className={styles.adminLabel}>Contract</p>
          <p className={styles.adminValue}>{contractAddress || 'Not deployed yet'}</p>
        </div>
        <button className={styles.copyButton} onClick={handleCopyContract} disabled={!contractAddress}>
          COPY ADDRESS
        </button>
      </div>

      <div className={styles.formRow}>
        <input
          type="text"
          placeholder="0x Investigator wallet"
          value={targetAddress}
          onChange={event => setTargetAddress(event.target.value)}
          className={styles.panelInput}
        />
        <button className={styles.grantButton} onClick={grantInvestigator} disabled={!isCorrectNetwork || isGranting}>
          {isGranting ? 'Granting…' : 'Grant Access'}
        </button>
      </div>

      <p className={styles.helpText}>
        Use the owner wallet to add investigator access for the Sepolia accounts that need to register evidence.
      </p>

      {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}

      <div className={styles.listHeader}>
        <p>Granted investigators</p>
        <span className={styles.listBadge}>{investigators.length}</span>
      </div>
      <ul className={styles.list}>
        {investigators.map(address => (
          <li key={address}>
            <span>{address}</span>
          </li>
        ))}
        {investigators.length === 0 && (
          <li className={styles.emptyLine}>No investigators have been granted yet.</li>
        )}
      </ul>
    </section>
  )
}

export default InvestigatorPanel
