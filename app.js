let provider;
let signer;
let contract;
let isOwner = false;
let userAddress = "";

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const walletAddressDisplay = document.getElementById('walletAddress');
const connStatus = document.getElementById('connStatus');
const accessLevelDisplay = document.getElementById('accessLevel');
const sysMessage = document.getElementById('sysMessage');
const loadContractBtn = document.getElementById('loadContractBtn');
const contractAddressInput = document.getElementById('contractAddressInput');

const navAdmin = document.getElementById('navAdmin');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

const electionsList = document.getElementById('electionsList');
const createElectionBtn = document.getElementById('createElectionBtn');
const refreshElectionsBtn = document.getElementById('refreshElectionsBtn');

// Initialize Layout and Contract Address
window.addEventListener('DOMContentLoaded', async () => {
    // Tab Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(item.dataset.tab).classList.add('active');
        });
    });

    // Auto-fill contract address if injected via script
    if (typeof CONTRACT_ADDRESS !== 'undefined' && CONTRACT_ADDRESS !== '') {
        contractAddressInput.value = CONTRACT_ADDRESS;
    }

    // Auto connect if already permitted
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error("Auto connect failed:", error);
        }
    }
});

function showMessage(message, type = 'info') {
    sysMessage.textContent = `> ${message}`;
    sysMessage.className = `sys-message ${type}`;
    sysMessage.style.display = 'block';

    // reset animation
    sysMessage.style.animation = 'none';
    sysMessage.offsetHeight; /* trigger reflow */
    sysMessage.style.animation = null;

    setTimeout(() => {
        sysMessage.style.display = 'none';
    }, 5000);
}

async function connectWallet() {
    if (window.ethereum) {
        try {
            showMessage("Requesting access...", "info");

            // Standard EIP-1193 request, waits until user confirms in MetaMask
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            userAddress = accounts[0];

            walletAddressDisplay.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
            connStatus.textContent = "CONNECTED";
            connStatus.style.color = "var(--success)";
            connectBtn.textContent = "LINK_ESTABLISHED";
            connectBtn.disabled = true;

            showMessage("Identity protocol synced.", "success");

            // Auto-load contract if address is present
            if (contractAddressInput.value.trim() !== '') {
                await initContract();
            }
        } catch (error) {
            console.error(error);
            showMessage("Authentication failed or rejected.", "error");
        }
    } else {
        showMessage("Web3 Provider missing (e.g. MetaMask).", "error");
    }
}

async function initContract() {
    const address = contractAddressInput.value.trim();
    if (!address) {
        showMessage("Invalid contract address.", "error");
        return;
    }

    if (!signer) {
        showMessage("Authenticate first.", "error");
        return;
    }

    try {
        contract = new ethers.Contract(address, contractABI, signer);
        await checkOwner();
        await loadElections();
        showMessage("Contract linked successfully.", "success");

        // Auto-switch to dashboard tab
        document.querySelector('[data-tab="tab-dashboard"]').click();
    } catch (error) {
        console.error(error);
        showMessage("Contract link failed. Check address and network.", "error");
    }
}

async function checkOwner() {
    try {
        const owner = await contract.owner();
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
            isOwner = true;
            accessLevelDisplay.textContent = "ADMINISTRATOR";
            accessLevelDisplay.style.color = "var(--secondary)";
            navAdmin.classList.remove('hidden');
        } else {
            isOwner = false;
            accessLevelDisplay.textContent = "VOTER";
            accessLevelDisplay.style.color = "var(--text-main)";
            navAdmin.classList.add('hidden');
        }
    } catch (error) {
        console.error("Owner check error:", error);
    }
}

async function createElection() {
    const title = document.getElementById('electionTitle').value.trim();
    const candidatesInput = document.getElementById('candidatesList').value.trim();

    if (!title || !candidatesInput) {
        showMessage("Parameters missing.", "error");
        return;
    }

    const candidates = candidatesInput.split(',').map(c => c.trim()).filter(c => c !== "");

    if (candidates.length === 0) {
        showMessage("Invalid candidate array.", "error");
        return;
    }

    try {
        createElectionBtn.disabled = true;
        createElectionBtn.textContent = "PROCESSING...";
        showMessage("Broadcasting transaction...", "info");

        const tx = await contract.createElection(title, candidates);
        await tx.wait();

        showMessage("Contract execution confirmed.", "success");
        document.getElementById('electionTitle').value = "";
        document.getElementById('candidatesList').value = "";
        await loadElections();
    } catch (error) {
        console.error(error);
        showMessage(error.reason || "Execution failed.", "error");
    } finally {
        createElectionBtn.disabled = false;
        createElectionBtn.textContent = "INITIALIZE_CONTRACT";
    }
}

async function vote(electionId, candidateIndex) {
    try {
        showMessage("Broadcasting vote...", "info");
        const tx = await contract.vote(electionId, candidateIndex);
        await tx.wait();

        showMessage("Block confirmed. Vote tallied.", "success");
        await loadElections();
    } catch (error) {
        console.error(error);
        const errMsg = error.reason || (error.data && error.data.message) || error.message || "Execution failed";
        if (errMsg.includes("already voted")) {
            showMessage("Access denied: Vote already cast.", "error");
        } else {
            showMessage(errMsg, "error");
        }
    }
}

async function loadElections() {
    if (!contract) return;

    try {
        electionsList.innerHTML = `<p style="color: var(--text-muted); font-family: 'Fira Code', monospace;">Synchronizing ledger...</p>`;
        const count = await contract.electionCount();

        if (count === 0n) {
            electionsList.innerHTML = `<p style="color: var(--text-muted); font-family: 'Fira Code', monospace;">Ledger empty. No active elections.</p>`;
            return;
        }

        electionsList.innerHTML = '';

        for (let i = 0; i < Number(count); i++) {
            const title = await contract.getElectionTitle(i);
            const candidates = await contract.getCandidates(i);

            const card = document.createElement('div');
            card.className = 'election-card';

            const header = document.createElement('h3');
            header.textContent = `[E-${i}] ${title}`;
            card.appendChild(header);

            // Safe iteration over Ethers v6 Result array
            for (let j = 0; j < candidates.length; j++) {
                const cand = candidates[j];
                const row = document.createElement('div');
                row.className = 'candidate-row';

                const infoDiv = document.createElement('div');
                infoDiv.innerHTML = `
                    <div class="candidate-name">${cand.name}</div>
                    <div class="candidate-votes">VOTES: ${cand.voteCount}</div>
                `;

                const btn = document.createElement('button');
                btn.className = 'vote-btn';
                btn.textContent = 'VOTE';
                // Capture exact indices in closure safely
                const currentElectionId = i;
                const currentCandidateIndex = j;
                btn.onclick = () => vote(currentElectionId, currentCandidateIndex);

                row.appendChild(infoDiv);
                row.appendChild(btn);
                card.appendChild(row);
            }

            electionsList.appendChild(card);
        }
    } catch (error) {
        console.error("Ledger sync error:", error);
        electionsList.innerHTML = `<p style="color: var(--secondary); font-family: 'Fira Code', monospace;">System error: Ledger sync failed.</p>`;
    }
}

// Event Listeners
connectBtn.addEventListener('click', connectWallet);
loadContractBtn.addEventListener('click', initContract);
createElectionBtn.addEventListener('click', createElection);
refreshElectionsBtn.addEventListener('click', loadElections);

// Setup auto-connect listener
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => {
        window.location.reload();
    });
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}
