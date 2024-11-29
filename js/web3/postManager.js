import Web3 from 'web3';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../web3/config.js';
import { showToast, showEditDialog } from '../utils/notifications.js';
import { formatDistanceToNow } from 'date-fns';

export class PostManager {
    constructor(container) {
        this.container = container;
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.isLoading = false;
    }

    async init() {
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum);
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = this.web3.utils.toChecksumAddress(accounts[0]);
                this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
                
                // Setup event listeners
                window.ethereum.on('accountsChanged', (accounts) => this.handleAccountChange(accounts));
                window.ethereum.on('chainChanged', () => window.location.reload());
                
                return true;
            } catch (error) {
                showToast('Failed to connect wallet: ' + error.message, 'error');
                return false;
            }
        } else {
            showToast('Please install MetaMask', 'warning');
            return false;
        }
    }

    async handleAccountChange(accounts) {
        if (accounts.length === 0) {
            this.account = null;
            showToast('Please connect to MetaMask', 'warning');
        } else {
            this.account = this.web3.utils.toChecksumAddress(accounts[0]);
            showToast('Account changed successfully', 'success');
            await this.loadPosts();
        }
    }

    async loadPosts() {
        if (!this.contract) return;
    
        try {
            this.isLoading = true;
            this.showLoadingState();
    
            // Convert totalPosts from BigInt to Number explicitly
            const totalPosts = Number(await this.contract.methods.getTotalPosts().call());
            const posts = [];
    
            for (let i = totalPosts - 1; i >= 0; i--) {
                const post = await this.contract.methods.getPost(i).call();
    
                posts.push({
                    index: i,
                    message: post[0],
                    author: post[1],
                    timestamp: Number(post[2]) * 1000, // Convert BigInt to Number
                    lastModified: Number(post[3]) * 1000, // Convert BigInt to Number
                    likes: Number(post[4]), // Convert BigInt to Number
                    dislikes: Number(post[5]) // Convert BigInt to Number
                });
            }
    
            this.renderPosts(posts);
        } catch (error) {
            showToast('Failed to load posts: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    

    async publishPost(content) {
        if (!content.trim()) {
            showToast('Post content cannot be empty', 'warning');
            return;
        }

        try {
            await this.contract.methods.publishPost(content)
                .send({ from: this.account });
            showToast('Post published successfully!', 'success');
            await this.loadPosts();
        } catch (error) {
            if (error.code === 4001) {
                showToast('Transaction cancelled by user', 'info');
            } else {
                showToast('Failed to publish post: ' + error.message, 'error');
            }
        }
    }

    async handlePostAction(action, index) {
        try {
            switch (action) {
                case 'like':
                    await this.contract.methods.likePost(index)
                        .send({ from: this.account });
                    showToast('Post liked!', 'success');
                    break;
                    
                case 'dislike':
                    await this.contract.methods.dislikePost(index)
                        .send({ from: this.account });
                    showToast('Post disliked!', 'success');
                    break;
                    
                case 'edit':
                    const post = await this.contract.methods.getPost(index).call();
                    const newContent = await showEditDialog(post[0]);
                    if (newContent) {
                        await this.contract.methods.editPost(index, newContent)
                            .send({ from: this.account });
                        showToast('Post updated successfully!', 'success');
                    }
                    break;
            }
            
            await this.loadPosts();
        } catch (error) {
            if (error.code === 4001) {
                showToast('Transaction cancelled by user', 'info');
            } else {
                showToast(`Failed to ${action} post: ` + error.message, 'error');
            }
        }
    }

    showLoadingState() {
        this.container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading posts...</p>
            </div>`;
    }

    renderPosts(posts) {
        this.container.innerHTML = posts.map(post => this.createPostElement(post)).join('');
        this.attachEventListeners();
    }

    createPostElement(post) {
        const isAuthor = post.author.toLowerCase() === this.account?.toLowerCase();
        
        return `
            <div class="post" data-index="${post.index}">
                <div class="post-header">
                    <span class="author">
                        <i class="fas fa-user-md"></i>
                        ${post.author.slice(0, 6)}...${post.author.slice(-4)}
                    </span>
                    <span class="timestamp">
                        <i class="fas fa-clock"></i>
                        ${formatDistanceToNow(post.timestamp)} ago
                    </span>
                </div>
                
                <div class="post-content">${post.message}</div>
                
                <div class="post-actions">
                    <button class="action-btn like-btn" data-action="like">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${post.likes}</span>
                    </button>
                    <button class="action-btn dislike-btn" data-action="dislike">
                        <i class="fas fa-thumbs-down"></i>
                        <span>${post.dislikes}</span>
                    </button>
                    ${isAuthor ? `
                        <button class="action-btn edit-btn" data-action="edit">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                    ` : ''}
                </div>
                
                ${post.lastModified > post.timestamp ? `
                    <div class="post-edited">
                        <i class="fas fa-pencil-alt"></i>
                        Edited ${formatDistanceToNow(post.lastModified)} ago
                    </div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        this.container.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = button.dataset.action;
                const postElement = button.closest('.post');
                const index = postElement.dataset.index;
                
                await this.handlePostAction(action, index);
            });
        });
    }

    // Method to clear posts
    clearPosts() {
        this.container.innerHTML = ''; // Remove all posts from the container
    }

    // Updated disconnect method
    disconnect() {
        this.account = null;
        this.contract = null; // Optionally nullify the contract instance if needed
        this.clearPosts(); // Clean up the displayed posts
    }
}