require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env

const networks = {
  hardhat: {
    // Enables forking later if needed.
    hardfork: 'merge'
  },
  localhost: {
    url: 'http://127.0.0.1:8545'
  }
}

if (SEPOLIA_RPC_URL) {
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
  }
}

module.exports = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks,
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 40000
  }
}
