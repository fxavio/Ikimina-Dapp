import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractAddress from '../contracts/contract-address.json';
import contractABI from '../contracts/Ikimina.json';

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [maxWithdrawAmount, setMaxWithdrawAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress.Ikimina, contractABI, provider);
      const groupCount = await contract.groupCount();
      const groupList = [];
      for (let i = 0; i < Number(groupCount); i++) {
        const group = await contract.getGroup(i);
        if (group[0] !== '0x0000000000000000000000000000000000000000' && group[1] && group[1].trim() !== '') {
          groupList.push({
            id: i,
            owner: group[0],
            name: group[1],
            description: group[2],
            goal: ethers.formatEther(group[3]),
            contributionAmount: ethers.formatEther(group[4]),
            maxWithdrawAmount: ethers.formatEther(group[5]),
            currentRound: group[6],
            lastWithdrawalTimestamp: group[7],
            memberCount: group[8],
            balance: ethers.formatEther(group[9]),
          });
        }
      }
      setGroups(groupList);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is required');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress.Ikimina, contractABI, signer);
      const value = ethers.parseEther(contributionAmount || '0');
      const tx = await contract.createGroup(
        groupName,
        description,
        ethers.parseEther(goal || '0'),
        ethers.parseEther(contributionAmount || '0'),
        ethers.parseEther(maxWithdrawAmount || '0'),
        { value }
      );
      await tx.wait();
      setMessage('Group info created and saved to blockchain!');
      setGroupName('');
      setDescription('');
      setGoal('');
      setContributionAmount('');
      setMaxWithdrawAmount('');
      await fetchGroups();
    } catch (err) {
      setMessage('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  // --- Styles ---
  const cardStyle = {
    maxWidth: 440,
    margin: '2rem auto',
    padding: 32,
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  };
  const labelStyle = { fontWeight: 500, color: '#4a5568', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%', padding: 10, marginTop: 4, borderRadius: 8, border: '1px solid #cbd5e0', fontSize: 16 };
  const btnStyle = { padding: '10px 24px', borderRadius: 8, background: '#3182ce', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: 8 };
  const msgStyle = (message) => ({
    color: message.startsWith('Error') ? '#c53030' : '#2f855a',
    background: message.startsWith('Error') ? '#fed7d7' : '#c6f6d5',
    borderRadius: 8,
    padding: '10px 16px',
    marginTop: 16,
    fontWeight: 500,
    fontSize: 15,
  });
  const groupCard = {
    marginBottom: 16,
    border: '1px solid #cbd5e0',
    borderRadius: 8,
    padding: 12,
    background: '#f7fafc',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 18, color: '#2d3748' }}>Create Group Info</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="groupName" style={labelStyle}>Group Name:</label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            required
            style={inputStyle}
            placeholder="e.g. Family Savings"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="description" style={labelStyle}>Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            placeholder="Describe your group purpose"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="goal" style={labelStyle}>Group Goal (ETH):</label>
          <input
            id="goal"
            type="number"
            min="0"
            step="any"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            required
            style={inputStyle}
            placeholder="e.g. 10"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="contributionAmount" style={labelStyle}>Contribution Amount (ETH):</label>
          <input
            id="contributionAmount"
            type="number"
            min="0"
            step="any"
            value={contributionAmount}
            onChange={e => setContributionAmount(e.target.value)}
            required
            style={inputStyle}
            placeholder="e.g. 0.1"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="maxWithdrawAmount" style={labelStyle}>Max Withdraw Amount (ETH):</label>
          <input
            id="maxWithdrawAmount"
            type="number"
            min="0"
            step="any"
            value={maxWithdrawAmount}
            onChange={e => setMaxWithdrawAmount(e.target.value)}
            required
            style={inputStyle}
            placeholder="e.g. 1"
          />
        </div>
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
      {message && <div style={msgStyle(message)}>{message}</div>}

      <h3 style={{ marginTop: 36, fontWeight: 600, color: '#2d3748' }}>Existing Groups</h3>
      <ul style={{ paddingLeft: 0, marginTop: 12 }}>
        {groups.length === 0 && <li style={{ color: '#718096' }}>No groups found.</li>}
        {groups.map(g => (
          <li key={g.id} style={groupCard}>
            <div style={{ fontWeight: 600, fontSize: 17, color: '#2b6cb0' }}>{g.name}</div>
            <div style={{ color: '#4a5568', marginBottom: 6 }}>{g.description}</div>
            <div style={{ fontSize: 14, color: '#2d3748', marginBottom: 4 }}>
              <b>Goal:</b> {g.goal} ETH &nbsp;|&nbsp; <b>Contribution:</b> {g.contributionAmount} ETH &nbsp;|&nbsp; <b>Max Withdraw:</b> {g.maxWithdrawAmount} ETH
            </div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 6 }}>
              <b>Members:</b> {g.memberCount}
            </div>
            <a
              href={`/?groupId=${g.id}`}
              style={{ color: '#3182ce', textDecoration: 'underline', fontWeight: 500, fontSize: 14 }}
            >
              View Group
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}