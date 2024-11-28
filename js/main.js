import { initWeb3 } from './blockchain.js';
import { initChat } from './chat.js';
import { initNavigation } from './navigation.js';

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  await initWeb3();
  initChat();
});