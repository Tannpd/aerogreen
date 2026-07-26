import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// Custom chain that proxies RPC through Vercel same-origin to bypass browser CORS policies
const getRpcEndpoint = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.origin}/api/rpc`;
  }
  return 'https://studio.genlayer.com/api';
};

const customStudionet = {
  ...studionet,
  rpcUrls: {
    default: { http: [getRpcEndpoint()] },
    public: { http: [getRpcEndpoint()] },
  }
};

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: customStudionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: customStudionet, account });
}

// Persistent account helper: guarantees exact same keypair and address across operations
function getStoredAccount(customPk) {
  if (customPk && customPk.startsWith('0x') && customPk.length === 66) {
    const acc = createAccount(customPk);
    try {
      localStorage.setItem('genlayer_aerogreen_pk', acc.privateKey);
    } catch (e) {}
    return acc;
  }

  try {
    const storedPk = localStorage.getItem('genlayer_aerogreen_pk');
    if (storedPk && storedPk.startsWith('0x') && storedPk.length === 66) {
      return createAccount(storedPk);
    }
  } catch (e) {
    console.warn('LocalStorage PK read warning:', e);
  }
  
  // Generate new keypair and persist
  const newAcc = createAccount();
  if (newAcc && newAcc.privateKey) {
    try {
      localStorage.setItem('genlayer_aerogreen_pk', newAcc.privateKey);
    } catch (e) {
      console.warn('LocalStorage PK write warning:', e);
    }
  }
  return newAcc;
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, '');
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useAeroGreen() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [flights, setFlights] = useState([]);
  const [contractBalance, setContractBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Trigger MetaMask popup or connect persistent GenLayer account
  const connectWallet = useCallback(async () => {
    try {
      let selectedAddr = '';
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            selectedAddr = accounts[0];
          }
        } catch (e) {
          console.warn('MetaMask connection skipped or rejected:', e);
        }
      }
      
      const acc = getStoredAccount();
      const finalAddr = selectedAddr || acc.address;
      setAddress(finalAddr);
      setGlAccount(acc);
      return finalAddr;
    } catch (err) {
      console.error('Wallet connect error:', err);
      const fallbackAcc = getStoredAccount();
      setAddress(fallbackAcc.address);
      setGlAccount(fallbackAcc);
      return fallbackAcc.address;
    }
  }, []);

  // Switch wallet by custom Private Key
  const switchAccount = (privateKeyHex) => {
    try {
      const formattedPk = privateKeyHex.trim();
      const acc = getStoredAccount(formattedPk);
      setAddress(acc.address);
      setGlAccount(acc);
      return acc.address;
    } catch (e) {
      console.error('Invalid private key:', e);
      throw new Error('Invalid Private Key. Must be a 32-byte hex string starting with 0x.');
    }
  };

  // Generate a brand new wallet address
  const generateNewWallet = () => {
    const acc = createAccount();
    if (acc && acc.privateKey) {
      try {
        localStorage.setItem('genlayer_aerogreen_pk', acc.privateKey);
      } catch (e) {}
    }
    setAddress(acc.address);
    setGlAccount(acc);
    return acc.address;
  };

  const fetchFlightsState = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setLoading(true);
    try {
      const client = getReadClient();
      const countBig = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_flights_count',
        args: [],
      });
      
      const count = Number(countBig);
      const fetchedFlights = [];

      for (let i = 0; i < count; i++) {
        const flightJsonStr = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_flight',
          args: [i],
        });
        if (flightJsonStr && flightJsonStr !== '{}') {
          try {
            const parsed = JSON.parse(flightJsonStr);
            fetchedFlights.push(parsed);
          } catch (e) {
            console.error('Error parsing flight json:', e);
          }
        }
      }
      
      const rawBalance = await client.getBalance({ address: CONTRACT_ADDRESS });
      setContractBalance(rawBalance.toString());
      setFlights(fetchedFlights.reverse());
      setError('');
    } catch (err) {
      console.error('Error fetching flight ESG audits:', err);
      setError('Failed to fetch flight ESG records: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register Flight ESG Stake
  const registerFlightEsgStake = async (flightCode, flightLogUrl, stakeAmountGen) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Registering flight ${flightCode} & locking ${stakeAmountGen} GEN ESG collateral...`);

    try {
      const client = getWriteClient(currentAccount);
      const valueWei = parseGen(stakeAmountGen);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'register_flight_esg_stake',
        args: [flightCode.trim().toUpperCase(), flightLogUrl.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Transmitting flight registration transaction to GenLayer Virtual Machine...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Flight registered & ESG collateral locked.');
      await fetchFlightsState();
      return receipt;
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Audit Flight Carbon Offset
  const auditFlightCarbonOffset = async (flightId, carbonRegistryUrl) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Auditing carbon offset for flight #${flightId}...`);

    try {
      const client = getWriteClient(currentAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'audit_flight_carbon_offset',
        args: [Number(flightId), carbonRegistryUrl.trim()],
      });
      
      setTxHash(hash);
      setTxStatus('Aviation ESG AI Inspectors are rendering flight fuel logs & carbon certificates. Enforcing multi-node consensus. Please wait 15-30s...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Audit execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Flight ESG audit completed. Airline stake verified or slashed based on greenwashing verdict.');
      await fetchFlightsState();
      return receipt;
    } catch (err) {
      console.error('Flight audit failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Recover ESG Stake
  const recoverEsgStake = async (flightId) => {
    let currentAccount = glAccount || getStoredAccount();
    if (!glAccount) {
      setGlAccount(currentAccount);
      setAddress(currentAccount.address);
    }
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Recovering ESG collateral stake for flight #${flightId}...`);

    try {
      const client = getWriteClient(currentAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'recover_esg_stake',
        args: [Number(flightId)],
      });
      
      setTxHash(hash);
      setTxStatus('Transmitting stake recovery transaction...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Recovery execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! ESG collateral stake recovered to airline wallet.');
      await fetchFlightsState();
      return receipt;
    } catch (err) {
      console.error('Stake recovery failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial flights data on mount without triggering wallet popup
  useEffect(() => {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      fetchFlightsState();
    }
  }, [fetchFlightsState]);

  return {
    address,
    glAccount,
    flights,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    switchAccount,
    generateNewWallet,
    fetchFlightsState,
    registerFlightEsgStake,
    auditFlightCarbonOffset,
    recoverEsgStake,
    contractAddress: CONTRACT_ADDRESS,
  };
}
