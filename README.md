# GeneVault

A blockchain-powered platform for decentralized bioengineering collaboration, enabling researchers, scientists, and innovators to share, fund, and monetize bioengineering designs (like genetic circuits, synthetic biology blueprints, and tissue engineering models) in a transparent, IP-protected manner — all on-chain.

---

## Overview

GeneVault addresses real-world challenges in bioengineering, such as fragmented collaboration due to intellectual property concerns, lack of transparent funding for open-source projects, and difficulties in verifying and rewarding contributions to biological innovations. By leveraging blockchain, it creates a secure ecosystem where designs are tokenized as NFTs, funded through community pools, and governed by DAOs, ensuring fair royalties and verifiable progress.

The platform consists of four main smart contracts written in Clarity, forming a decentralized hub for bioengineering advancements:

1. **BioDesign NFT Contract** – Manages the creation, ownership, and transfer of NFTs representing bioengineering designs.
2. **Governance DAO Contract** – Facilitates community voting on platform upgrades, design approvals, and ethical guidelines.
3. **Funding Pool Contract** – Handles crowdfunding for bioengineering projects with automated milestone-based releases.
4. **Royalty Sharing Contract** – Distributes royalties from design usages, licenses, or implementations to creators and contributors.

---

## Features

- **Tokenized bio designs** as NFTs with embedded metadata for genetic sequences or engineering specs  
- **DAO governance** for ethical oversight and community-driven decisions in bioengineering  
- **Crowdfunded projects** with transparent milestone tracking and fund releases  
- **Automated royalty sharing** for fair compensation on design adoptions or commercializations  
- **Integration hooks** for off-chain verification of lab results or simulations  
- **Open-source collaboration** while protecting IP through on-chain licensing  

---

## Smart Contracts

### BioDesign NFT Contract
- Mint NFTs for bioengineering designs with metadata (e.g., DNA sequences, CAD models)
- Transfer ownership and enforce licensing terms
- Update metadata for design iterations or improvements

### Governance DAO Contract
- Token-weighted voting on proposals (e.g., approving new designs, setting ethical standards)
- On-chain execution of approved decisions
- Quorum requirements and voting periods for bio-sensitive topics

### Funding Pool Contract
- Create and join funding pools for specific bio projects
- Milestone-based fund releases verified via oracle or DAO votes
- Refund mechanisms for unmet goals

### Royalty Sharing Contract
- Track usages or licenses of designs
- Automatic distribution of royalties to NFT holders and contributors
- Percentage splits configurable per design

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/genevault.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete bioengineering collaboration experience. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License