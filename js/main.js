import { initNavigation } from './navigation.js';
import { initChat } from './chat.js';
import { initSocial } from './social.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initChat();
    initSocial();
});