import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x123...'; // Replace with actual deployed contract address
const CONTRACT_ABI = [
  "function publishPost(string memory _message) public",
  "function getPost(uint index) public view returns (string memory, address)",
  "function getTotalPosts() public view returns (uint)"
];

let contract;
let signer;

export async function initWeb3() {
  try {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      signer = await provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setupPostForm();
      loadPosts();
    } else {
      console.error('Please install MetaMask!');
    }
  } catch (error) {
    console.error('Error initializing Web3:', error);
  }
}

function setupPostForm() {
  const publishButton = document.getElementById('publish-post');
  publishButton.addEventListener('click', async () => {
    const messageInput = document.getElementById('post-message');
    const message = messageInput.value.trim();
    
    if (message) {
      try {
        const tx = await contract.publishPost(message);
        await tx.wait();
        messageInput.value = '';
        await loadPosts();
      } catch (error) {
        console.error('Error publishing post:', error);
      }
    }
  });
}

async function loadPosts() {
  try {
    const postsContainer = document.getElementById('posts-container');
    const totalPosts = await contract.getTotalPosts();
    
    postsContainer.innerHTML = '';
    
    for (let i = totalPosts - 1; i >= 0; i--) {
      const [message, author] = await contract.getPost(i);
      const postElement = document.createElement('div');
      postElement.className = 'post';
      postElement.innerHTML = `
        <p>${message}</p>
        <small>By: ${author}</small>
      `;
      postsContainer.appendChild(postElement);
    }
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}