
// --- GLOBAL APP STATE ---
export const appState = {
    username: '',
    groups: [], // Array of {id, name, position}
    tiles: [],  // Array of {id, name, url, icon, position, groupId}
    activeGroupId: null, // null = "ALL"
    currentToken: null
};

// --- CATEGORY COLORS ---
// Subtle background colors for tiles based on their group
export const categoryColors = [
    'bg-rose-50 dark:bg-rose-950/30',
    'bg-blue-50 dark:bg-blue-950/30',
    'bg-green-50 dark:bg-green-950/30',
    'bg-yellow-50 dark:bg-yellow-950/30',
    'bg-purple-50 dark:bg-purple-950/30',
    'bg-indigo-50 dark:bg-indigo-950/30',
    'bg-pink-50 dark:bg-pink-950/30',
    'bg-teal-50 dark:bg-teal-950/30',
];

// --- ICON LIST ---
export const faIconList = [
    'fa-solid fa-globe', 'fa-solid fa-server', 'fa-solid fa-database', 'fa-solid fa-code', 'fa-solid fa-code-branch',
    'fa-solid fa-terminal', 'fa-solid fa-laptop-code', 'fa-solid fa-cloud', 'fa-solid fa-upload', 'fa-solid fa-download',
    'fa-solid fa-folder', 'fa-solid fa-folder-open', 'fa-solid fa-file', 'fa-solid fa-file-code', 'fa-solid fa-file-csv',
    'fa-solid fa-file-image', 'fa-solid fa-file-pdf', 'fa-solid fa-file-video', 'fa-solid fa-file-audio', 'fa-solid fa-file-word',
    'fa-solid fa-file-excel', 'fa-solid fa-file-powerpoint', 'fa-solid fa-file-zipper', 'fa-solid fa-gamepad', 'fa-solid fa-film',
    'fa-solid fa-music', 'fa-solid fa-book', 'fa-solid fa-book-open', 'fa-solid fa-bookmark', 'fa-solid fa-camera',
    'fa-solid fa-video', 'fa-solid fa-microphone', 'fa-solid fa-headphones', 'fa-solid fa-image', 'fa-solid fa-images',
    'fa-solid fa-star', 'fa-solid fa-heart', 'fa-solid fa-thumbs-up', 'fa-solid fa-comment', 'fa-solid fa-comments',
    'fa-solid fa-user', 'fa-solid fa-users', 'fa-solid fa-house', 'fa-solid fa-building', 'fa-solid fa-store',
    'fa-solid fa-shopping-cart', 'fa-solid fa-credit-card', 'fa-solid fa-wallet', 'fa-solid fa-money-bill', 'fa-solid fa-chart-line',
    'fa-solid fa-chart-bar', 'fa-solid fa-chart-pie', 'fa-solid fa-cogs', 'fa-solid fa-cog', 'fa-solid fa-wrench',
    'fa-solid fa-tools', 'fa-solid fa-hammer', 'fa-solid fa-bolt', 'fa-solid fa-lightbulb', 'fa-solid fa-rocket',
    'fa-solid fa-plane', 'fa-solid fa-car', 'fa-solid fa-bus', 'fa-solid fa-train', 'fa-solid fa-motorcycle',
    'fa-solid fa-bicycle', 'fa-solid fa-ship', 'fa-solid fa-anchor', 'fa-solid fa-calendar', 'fa-solid fa-calendar-alt',
    'fa-solid fa-clock', 'fa-solid fa-hourglass', 'fa-solid fa-watch', 'fa-solid fa-map', 'fa-solid fa-map-marker-alt',
    'fa-solid fa-location-dot', 'fa-solid fa-flag', 'fa-solid fa-bell', 'fa-solid fa-envelope', 'fa-solid fa-phone',
    'fa-solid fa-rss', 'fa-solid fa-wifi', 'fa-solid fa-link', 'fa-solid fa-shield-halved', 'fa-solid fa-lock',
    'fa-solid fa-unlock', 'fa-solid fa-key', 'fa-solid fa-bug', 'fa-solid fa-fire', 'fa-solid fa-trophy',
    'fa-solid fa-graduation-cap', 'fa-solid fa-flask', 'fa-solid fa-brain', 'fa-solid fa-atom', 'fa-solid fa-robot',
    'fa-brands fa-docker', 'fa-brands fa-github', 'fa-brands fa-gitlab', 'fa-brands fa-youtube', 'fa-brands fa-reddit',
    'fa-brands fa-discord', 'fa-brands fa-facebook', 'fa-brands fa-twitter', 'fa-brands fa-instagram', 'fa-brands fa-linkedin',
    'fa-brands fa-plex', 'fa-brands fa-linux', 'fa-brands fa-windows', 'fa-brands fa-apple', 'fa-brands fa-android',
    'fa-brands fa-raspberry-pi', 'fa-brands fa-python', 'fa-brands fa-js', 'fa-brands fa-html5', 'fa-brands fa-css3-alt'
];
