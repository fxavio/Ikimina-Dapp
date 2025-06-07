# Ikimina-Dapp
A simple DApp that enables a group of people to save money together in a trustless way. The app ensures transparency, fairness, and accountability through blockchain technology.

## Features
- Create and join savings groups (rotating savings and credit association)
- Make periodic contributions
- Withdraw funds in a fair, rotating order
- Transparent group and member status
- All logic enforced by smart contract

## Backend installation

1. Navigate to the backend directory:

   cd ikimina-backend
   
2. Install dependencies:
   
   npm install
   
3. Compile the smart contract:
   
   npm run compile
   
4. Run tests:
   
   npm run test
   
5. Start a local Hardhat node:
   
   npm run node
   
6. Deploy the contract to localhost:
  
   npm run local

7. Deploy the contract to Sepolia testnet:
   
   npm run sepolia


## Frontend installation

1. Navigate to the frontend directory:
   
   cd ikimina-frontend
  
2. Install dependencies:
  
   npm install
   
3. Start the frontend app:
  
   npm run dev
   
4. Open your browser and go to [http://localhost:3000](http://localhost:3000)

## Usage
- Connect your MetaMask wallet.
- Create a new group or join an existing group.
- Make contributions and withdraw funds as per group rules.

## Project Structure
- `ikimina-backend/` - Hardhat project for smart contracts
- `ikimina-frontend/` - Next.js frontend for interacting with the contract

## Requirements
- Node.js
- MetaMask extension
- Testnet ETH (for test networks)

## License
MIT

