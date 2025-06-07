import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contracts/Ikimina.json';
import contractAddresses from '../contracts/contract-address.json';
import styles from '../styles/Home.module.css';

const Ikimina = () => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [groupInfo, setGroupInfo] = useState({});
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [contribution, setContribution] = useState('');
  const [lastContribution, setLastContribution] = useState(null);
  const [contractBalance, setContractBalance] = useState('');
  const [currentEligible, setCurrentEligible] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [contributeLoading, setContributeLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [error, setError] = useState('');
  const [contributionHistory, setContributionHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [txHash, setTxHash] = useState('');
  const [groupList, setGroupList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(0);
  const [contractOwner, setContractOwner] = useState('');

  useEffect(() => {
    if (account) {
      initializeContract();
    }
  }, [account]);

  useEffect(() => {
    if (contract) {
      fetchGroups();
      // Fetch contract owner address
      contract.contractOwner().then(setContractOwner);
    }
  }, [contract]);

  useEffect(() => {
    if (contract && account) {
      loadContractData(selectedGroupId);
      fetchEventHistory(selectedGroupId);
    }
  }, [contract, account, selectedGroupId]);

  const initializeContract = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(
          contractAddresses.Ikimina,
          contractABI,
          signer
        );
        setContract(contractInstance);
      }
    } catch (error) {
      console.error('Error initializing contract:', error);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        setAccount(accounts[0]);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const groupCount = await contract.groupCount();
      const groups = [];
      for (let i = 0; i < Number(groupCount); i++) {
        const group = await contract.getGroup(i);
        // Only include groups that are not deleted (owner != 0x0 and name not empty)
        if (group[0] !== '0x0000000000000000000000000000000000000000' && group[1] && group[1].trim() !== '') {
          groups.push({
            id: i,
            name: group[1],
            description: group[2],
          });
        }
      }
      setGroupList(groups);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroupList([]);
    }
  };

  const loadContractData = async (groupId = 0) => {
    if (!contract) return;
    try {
      const [
        owner,
        name,
        description,
        goal,
        contributionAmount,
        maxWithdrawAmount,
        currentRound,
        lastWithdrawalTimestamp,
        memberCount,
        balance
      ] = await contract.getGroup(groupId);
      const membersList = await contract.getMembers(groupId);
      const eligibleMember = await contract.getCurrentEligibleMember(groupId);
      const contractBal = await contract.getContractBalance();
      // Use fallback for membership check: is the account in the members list?
      const isMemberStatus = Array.isArray(membersList) && account
        ? membersList.some(m => m.toLowerCase() === account.toLowerCase())
        : false;
      setIsMember(isMemberStatus);
      const lastContrib = await contract.getLastContributionDate(groupId, account);
      const contrib = await contract.getMemberContribution(groupId, account);
      setGroupInfo({
        owner: owner || '',
        name: name || '',
        description: description || '',
        goal: goal ? ethers.formatEther(goal) : '0',
        amount: contributionAmount ? ethers.formatEther(contributionAmount) : '0',
        maxWithdraw: maxWithdrawAmount ? ethers.formatEther(maxWithdrawAmount) : '0',
        currentRound,
        lastWithdrawalTimestamp,
        memberCount,
        balance: balance ? ethers.formatEther(balance) : '0',
      });
      setMembers(membersList || []);
      setCurrentEligible(eligibleMember || '');
      setContractBalance(contractBal ? ethers.formatEther(contractBal) : '0');
      setLastContribution(lastContrib);
      setContribution(contrib ? ethers.formatEther(contrib) : '0');
      setEligible(account && eligibleMember && account.toLowerCase() === eligibleMember.toLowerCase());
    } catch (error) {
      console.error('Error loading contract data:', error);
      setError('Failed to load contract data. Please try again.');
    }
  };

  // Fetch contribution and withdrawal history from contract events
  const fetchEventHistory = async (groupId = 0) => {
    try {
      if (!contract) return;
      const provider = contract.runner.provider;
      const contractAddress = contract.target;
      // Fetch ContributionMade events
      const contribFilter = contract.filters.ContributionMade();
      const contribEvents = await provider.getLogs({
        ...contribFilter,
        address: contractAddress,
        fromBlock: 0,
        toBlock: 'latest',
      });
      // Only show events for the selected groupId
      const parsedContribs = await Promise.all(contribEvents.map(async (e) => {
        const parsed = contract.interface.parseLog(e);
        // For multi-group: check groupId in event args (if present), else fallback to show all
        if (parsed.args.groupId !== undefined && Number(parsed.args.groupId) !== Number(groupId)) return null;
        const block = await provider.getBlock(e.blockNumber);
        return {
          groupId: parsed.args.groupId !== undefined ? Number(parsed.args.groupId) : null,
          member: parsed.args.member,
          amount: (parsed.args.amount != null) ? ethers.formatEther(parsed.args.amount) : '0',
          timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toLocaleString() : 'N/A',
          logIndex: (typeof e.logIndex !== 'undefined' ? String(e.logIndex) : 'noidx') + '-' + e.transactionHash
        };
      }));
      setContributionHistory(parsedContribs.filter(e => e && (e.groupId === null || e.groupId === Number(groupId))).reverse());
      // Fetch FundsWithdrawn events
      const withdrawFilter = contract.filters.FundsWithdrawn();
      const withdrawEvents = await provider.getLogs({
        ...withdrawFilter,
        address: contractAddress,
        fromBlock: 0,
        toBlock: 'latest',
      });
      const parsedWithdrawals = await Promise.all(withdrawEvents.map(async (e) => {
        const parsed = contract.interface.parseLog(e);
        if (parsed.args.groupId !== undefined && Number(parsed.args.groupId) !== Number(groupId)) return null;
        const block = await provider.getBlock(e.blockNumber);
        return {
          groupId: parsed.args.groupId !== undefined ? Number(parsed.args.groupId) : null,
          member: parsed.args.member,
          amount: (parsed.args.amount != null) ? ethers.formatEther(parsed.args.amount) : '0',
          timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toLocaleString() : 'N/A',
          logIndex: (typeof e.logIndex !== 'undefined' ? String(e.logIndex) : 'noidx') + '-' + e.transactionHash
        };
      }));
      setWithdrawalHistory(parsedWithdrawals.filter(e => e && (e.groupId === null || e.groupId === Number(groupId))).reverse());
    } catch (err) {
      console.error('Error fetching event history:', err);
    }
  };

  const joinGroup = async () => {
    if (!contract) return;
    setJoinLoading(true);
    setError('');
    try {
      // Use the correct contribution amount for the selected group
      const value = ethers.parseEther(groupInfo.amount);
      const tx = await contract.joinGroup(selectedGroupId, { value });
      await tx.wait();
      await loadContractData(selectedGroupId);
      alert('Joined group successfully!');
    } catch (error) {
      let message = 'Error joining group.';
      if (error?.reason) {
        message = 'Opps: ' + error.reason;
      } else if (error?.data?.message) {
        message = 'Contract error: ' + error.data.message;
      } else if (error?.message) {
        message = 'Error joining group: ' + error.message;
      }
      setError(message);
    } finally {
      setJoinLoading(false);
    }
  };

  const makeContribution = async () => {
    if (!contract) return;
    setContributeLoading(true);
    setError('');
    setTxHash('');
    try {
      // Use the correct value type for ethers v6: pass value as a BigInt, not an object
      const value = ethers.parseEther(groupInfo.amount);
      const tx = await contract.makeContribution(selectedGroupId, { value });
      setTxHash(tx.hash);
      await tx.wait();
      await loadContractData(selectedGroupId);
      alert('Contribution successful!');
    } catch (error) {
      let message = 'Error making contribution.';
      if (error?.reason) {
        if (error.reason === 'You can only contribute once every 30 days') {
          message = 'You can only contribute once every 30 days. Please wait before making another contribution.';
        } else if (error.reason === 'Withdrawal not allowed yet') {
          message = 'Withdrawal is not allowed yet. Please wait until you are eligible to withdraw.';
        } else {
          message = 'Opps: ' + error.reason;
        }
      } else if (error?.data?.message) {
        message = 'Contract error: ' + error.data.message;
      } else if (error?.message) {
        message = 'Error making contribution: ' + error.message;
      }
      setError(message);
      console.error(message, error);
    } finally {
      setContributeLoading(false);
    }
  };

  const withdraw = async () => {
    if (!contract) return;
    setWithdrawLoading(true);
    setError('');
    try {
      // Check if contract balance is enough before calling withdraw
      const contractBal = Number(contractBalance);
      const maxWithdraw = Number(groupInfo.maxWithdraw);
      if (contractBal < maxWithdraw) {
        setError('Withdrawal failed: Contract does not have enough balance for the max withdraw amount.');
        setWithdrawLoading(false);
        return;
      }
      const tx = await contract.withdraw(selectedGroupId);
      await tx.wait();
      await loadContractData(selectedGroupId);
      alert('Withdrawal successful!');
    } catch (error) {
      let message = 'Error withdrawing.';
      if (error?.reason) {
        if (error.reason === 'Withdrawal not allowed yet') {
          message = 'Withdrawal is not allowed yet. Please wait until you are eligible to withdraw.';
        } else if (error.reason === 'Not enough contract balance to withdraw max amount') {
          message = 'Withdrawal failed: Contract does not have enough balance for the max withdraw amount.';
        } else {
          message = 'Opps: ' + error.reason;
        }
      } else if (error?.data?.message) {
        message = 'Contract error: ' + error.data.message;
      } else if (error?.message) {
        message = 'Error withdrawing: ' + error.message;
      }
      setError(message);
      console.error(message, error);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (!account) {
    return (
      <div className={styles.container}>
        {/* <h2>Amali Savings DApp</h2> */}
        <button className={styles.btn} onClick={connectWallet}>Connect MetaMask</button>
      </div>
    );
  }

  // Only show group info after wallet is connected
  if (!groupList || groupList.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.heading}>Create Group Info</h3>
        <h4 style={{marginTop: 0}}>No groups available. Please create a group first.</h4>
        <a href="/create-group" className={styles.btn} style={{marginTop: 16}}>Create Group</a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Create Group Info</h3>
      <p style={{marginBottom: 8}}><b>Connected Account:</b> {account}</p>
      <div style={{ margin: '16px 0' }}>
        <label htmlFor="groupSelect"><b>Select Group:</b></label>
        <select id="groupSelect" value={selectedGroupId} onChange={e => setSelectedGroupId(Number(e.target.value))}>
          {groupList.length === 0 && <option value={0}>No groups</option>}
          {groupList.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.description})</option>
          ))}
        </select>
      </div>
      <h2 className={styles.heading}>Group Info:</h2>
      <p><b>Name:</b> {groupInfo.name}</p>
      <p><b>Description:</b> {groupInfo.description}</p>
      <p><b>Goal:</b> {groupInfo.goal} ETH</p>
      <p><b>Contribution Amount:</b> {groupInfo.amount} ETH</p>
      <p><b>Max Withdraw:</b> {groupInfo.maxWithdraw} ETH</p>
      <p><b>Owner:</b> {groupInfo.owner}</p>
      <p><b>Contract Balance:</b> {contractBalance} ETH</p>
      <p><b>Current Eligible Member:</b> {currentEligible}</p>
      <h3 className={styles.heading}>Members:</h3>
      <ul className={styles.ul}>
        {members.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <h3 className={styles.heading}>Your Status:</h3>
      <p>Is Member: {isMember ? 'Yes' : 'No'}</p>
      <p>Your Total Contribution: {contribution} ETH</p>
      <p>Last Contribution Date: {lastContribution ? new Date(Number(lastContribution) * 1000).toLocaleString() : 'N/A'}</p>
      {!isMember && groupList.length > 0 && (
        <button className={styles.btn} onClick={joinGroup} disabled={joinLoading}>{joinLoading ? 'Joining...' : 'Join Group'}</button>
      )}
      {isMember && (
        <button className={styles.btn} style={{ marginRight: '12px' }} onClick={makeContribution} disabled={contributeLoading}>{contributeLoading ? 'Contributing...' : 'Make Contribution'}</button>
      )}
      {contributeLoading && txHash && (
        <div style={{ margin: '12px 0', color: '#0070f3' }}>
          Transaction pending: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0, 10)}... (view on Etherscan)</a>
        </div>
      )}
      {eligible && (
        <button className={styles.btn} onClick={withdraw} disabled={withdrawLoading} style={{ marginLeft: isMember ? '0' : undefined }}>
          {withdrawLoading ? 'Withdrawing...' : 'Withdraw'}
        </button>
      )}
      {error && (
        <div className={styles.error}>{error}</div>
      )}
      <h3 className={styles.heading}>Contribution History:</h3>
      <ul className={styles.ul}>
        {contributionHistory.length === 0 && <li>No contributions yet.</li>}
        {contributionHistory.map((c) => (
          <li key={c.logIndex}>
            <b>{c.member}</b> contributed {c.amount} ETH on {c.timestamp}
          </li>
        ))}
      </ul>
      <h3 className={styles.heading}>Withdrawal History:</h3>
      <ul className={styles.ul}>
        {withdrawalHistory.length === 0 && <li>No withdrawals yet.</li>}
        {withdrawalHistory.map((w) => (
          <li key={w.logIndex}>
            <b>{w.member}</b> withdrew {w.amount} ETH on {w.timestamp}
          </li>
        ))}
      </ul>
      {/* Delete Group button for group owner or contract owner, only if group has no members or zero balance */}
      {/* {(account && (account.toLowerCase() === groupInfo.owner?.toLowerCase() || account.toLowerCase() === contractOwner?.toLowerCase()) && (members.length === 0 || groupInfo.balance === '0')) && ( */}
      {(account && (account.toLowerCase() === groupInfo.owner?.toLowerCase() || account.toLowerCase() === contractOwner?.toLowerCase()) && (members.length === 1)) && (
       <button className={styles.btn} style={{ background: 'red', color: 'white', marginTop: 12 }} onClick={async () => {
          if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
          setError('');
          try {
            const tx = await contract.deleteGroup(selectedGroupId);
            await tx.wait();
            alert('Group deleted!');
            await fetchGroups();
            await loadContractData(selectedGroupId);
          } catch (err) {
            setError('Error deleting group: ' + (err.reason || err.message));
          }
        }}>Delete Group</button>
      )}
    </div>
  );
};

export default Ikimina;