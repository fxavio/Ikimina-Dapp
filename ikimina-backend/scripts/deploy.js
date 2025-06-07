require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const artifact = require("../artifacts/contracts/Ikimina.sol/Ikimina.json");
const frontendDir = path.resolve(__dirname, "../../ikimina-frontend/contracts");

async function main() {
  const Ikimina = await ethers.getContractFactory("Ikimina");
  const ikimina = await Ikimina.deploy();
  await ikimina.waitForDeployment();

  const address = await ikimina.getAddress();
  console.log("Ikimina contract deployed successfully!");
  console.log(`Ikimina deployed to: ${address}`);

  // Save contract address and ABI for frontend in separate JSON files (like your sample)
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // Write contract address
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify({ Ikimina: address }, null, 2)
  );

  // Write contract ABI
  fs.writeFileSync(
    path.join(frontendDir, "Ikimina.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  console.log(`Contract address and ABI saved to: ${frontendDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});