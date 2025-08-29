let playlist = [
    {
        id: 1,
        title: "Sunrise Melody",
        artist: "Digital Dreams",
        album: "Morning Vibes",
        duration: "3:45",
        src: "https://www.w3schools.com/html/mov_bbb.mp4", 
        cover: "https://via.placeholder.com/300x300/333333/FFFFFF?text=SM",
        type: "default",
        fileSize: "",
        format: "MP3"
    },
    {
        id: 2,
        title: "Electric Nights",
        artist: "Neon Pulse",
        album: "City Lights",
        duration: "4:12",
        src: "https://file-examples.com/storage/fe68c8c451f6dfe966b82b4/2017/11/file_example_MP3_700KB.mp3",
        cover: "https://via.placeholder.com/300x300/444444/FFFFFF?text=EN",
        type: "default",
        fileSize: "",
        format: "MP3"
    },
    {
        id: 3,
        title: "Peaceful Waters",
        artist: "Calm Waves",
        album: "Nature Sounds",
        duration: "5:30",
        src: "https://file-examples.com/storage/fe68c8c451f6dfe966b82b4/2017/11/file_example_MP3_1MG.mp3",
        cover: "https://via.placeholder.com/300x300/555555/FFFFFF?text=PW",
        type: "default",
        fileSize: "",
        format: "MP3"
    },
    {
        id: 4,
        title: "Urban Rhythm",
        artist: "Street Beat",
        album: "Metro Mix",
        duration: "3:28",
        src: "https://file-examples.com/storage/fe68c8c451f6dfe966b82b4/2017/11/file_example_MP3_2MG.mp3",
        cover: "https://via.placeholder.com/300x300/666666/FFFFFF?text=UR",
        type: "default",
        fileSize: "",
        format: "MP3"
    },
    {
        id: 5,
        title: "Cosmic Journey",
        artist: "Space Travelers",
        album: "Galaxy Sounds",
        duration: "6:15",
        src: "https://file-examples.com/storage/fe68c8c451f6dfe966b82b4/2017/11/file_example_MP3_5MG.mp3",
        cover: "https://via.placeholder.com/300x300/777777/FFFFFF?text=CJ",
        type: "default",
        fileSize: "",
        format: "MP3"
    }
];


const uploadSettings = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
    maxFiles: 50
};


let currentTrackIndex = 0;
let isPlaying = false;
let currentVolume = 1;
let isMuted = false;
let isShuffling = false;
let isRepeating = false;
let progressUpdateInterval = null;
let selectedItems = new Set();
let audioLoadAttempts = 0;
const maxAudioLoadAttempts = 3;

// DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeBar = document.getElementById('volumeBar');
const volumeFill = document.getElementById('volumeFill');
const volumeHandle = document.getElementById('volumeHandle');
const volumeDisplay = document.getElementById('volumeDisplay');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressHandle = document.getElementById('progressHandle');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const albumCover = document.getElementById('albumCover');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const currentAlbum = document.getElementById('currentAlbum');
const trackCounter = document.getElementById('trackCounter');
const playlistContainer = document.getElementById('playlist');
const playOverlay = document.getElementById('playOverlay');

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const dragDropZone = document.getElementById('dragDropZone');
const clearUploadsBtn = document.getElementById('clearUploadsBtn');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');


const fileInfoDisplay = document.getElementById('fileInfoDisplay');
const fileSize = document.getElementById('fileSize');
const fileFormat = document.getElementById('fileFormat');


const selectAllBtn = document.getElementById('selectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

const notification = document.getElementById('notification');

function init() {
    loadPlaylistFromStorage();
    loadTrack(currentTrackIndex);
    renderPlaylist();
    setupEventListeners();
    updateVolumeDisplay();
    updatePlayButton();
    startProgressUpdates();
    updateUploadButtonState();
    
    setTimeout(() => {
        showNotification('Music player loaded! Upload your own tracks or try the demo songs.', 'info', 4000);
    }, 1000);
}

function createDemoAudio() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / audioContext.sampleRate) * 0.3;
        }
        
        const offlineContext = new OfflineAudioContext(1, data.length, audioContext.sampleRate);
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineContext.destination);
        source.start();
        
        return offlineContext.startRendering().then(renderedBuffer => {
            return null;
        });
    } catch (e) {
        console.log('Cannot create demo audio, will rely on uploaded files');
        return null;
    }
}

function savePlaylistToStorage() {
    const uploadedTracks = playlist.filter(track => track.type === 'uploaded');
    const playlistMetadata = uploadedTracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        cover: track.cover,
        type: track.type,
        fileSize: track.fileSize,
        format: track.format,
        fileName: track.fileName || track.title
    }));
    
    try {
        localStorage.setItem('musicPlayerPlaylist', JSON.stringify(playlistMetadata));
        localStorage.setItem('musicPlayerSettings', JSON.stringify({
            volume: currentVolume,
            muted: isMuted,
            shuffle: isShuffling,
            repeat: isRepeating
        }));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

function loadPlaylistFromStorage() {
    try {
        const savedSettings = localStorage.getItem('musicPlayerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            currentVolume = settings.volume || 1;
            isMuted = settings.muted || false;
            isShuffling = settings.shuffle || false;
            isRepeating = settings.repeat || false;
        }
    } catch (e) {
        console.warn('Could not load settings from localStorage:', e);
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationMessage = notification.querySelector('.notification-message');
    
    notification.classList.remove('success', 'error', 'info', 'show');
    
    notificationMessage.textContent = message;
    
    switch (type) {
        case 'success':
            notification.classList.add('success');
            notificationIcon.className = 'fas fa-check-circle notification-icon';
            break;
        case 'error':
            notification.classList.add('error');
            notificationIcon.className = 'fas fa-exclamation-circle notification-icon';
            break;
        default:
            notification.classList.add('info');
            notificationIcon.className = 'fas fa-info-circle notification-icon';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

function handleFileUpload(files) {
    const validFiles = [];
    const errors = [];
    
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('audio/')) {
            errors.push(`${file.name}: Not an audio file`);
            return;
        }
        
        if (file.size > uploadSettings.maxFileSize) {
            errors.push(`${file.name}: File too large (max 50MB)`);
            return;
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        if (!uploadSettings.supportedFormats.includes(extension)) {
            errors.push(`${file.name}: Unsupported format`);
            return;
        }
        
        validFiles.push(file);
    });
    
    const totalTracks = playlist.length + validFiles.length;
    if (totalTracks > uploadSettings.maxFiles) {
        errors.push(`Too many files. Maximum ${uploadSettings.maxFiles} tracks allowed.`);
        return;
    }
    
    if (errors.length > 0) {
        showNotification(errors[0], 'error');
        if (errors.length > 1) {
            console.warn('Additional upload errors:', errors.slice(1));
        }
    }
    
    if (validFiles.length > 0) {
        processFiles(validFiles);
    }
}

function processFiles(files) {
    let processed = 0;
    const total = files.length;
    
    uploadProgress.classList.remove('hidden');
    updateUploadProgress(0, `Processing ${total} file${total === 1 ? '' : 's'}...`);
    
    files.forEach((file, index) => {
        const tempAudio = document.createElement('audio');
        const audioURL = URL.createObjectURL(file);
        tempAudio.src = audioURL;
        
        tempAudio.addEventListener('loadedmetadata', () => {
            const track = {
                id: Date.now() + index,
                title: file.name.replace(/\.[^/.]+$/, ''),
                artist: 'Unknown Artist',
                album: 'Uploaded Music',
                duration: formatTime(tempAudio.duration),
                src: audioURL,
                cover: `https://via.placeholder.com/300x300/00ffff/000000?text=${encodeURIComponent(file.name.substring(0, 2).toUpperCase())}`,
                type: 'uploaded',
                fileSize: formatFileSize(file.size),
                format: file.name.split('.').pop().toUpperCase(),
                fileName: file.name,
                originalFile: file
            };
            
            playlist.push(track);
            processed++;
            
            const progress = (processed / total) * 100;
            updateUploadProgress(progress, `Processed ${processed}/${total} files`);
            
            if (processed === total) {
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                    renderPlaylist();
                    savePlaylistToStorage();
                    showNotification(`${total} file${total === 1 ? '' : 's'} uploaded successfully!`, 'success');
                    updateUploadButtonState();
                    
                    if (playlist.length === total) {
                        loadTrack(0);
                    }
                }, 500);
            }
        });
        
        tempAudio.addEventListener('error', () => {
            processed++;
            URL.revokeObjectURL(audioURL);
            showNotification(`Error processing ${file.name}`, 'error');
            
            if (processed === total) {
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                    renderPlaylist();
                }, 500);
            }
        });
        
        setTimeout(() => {
            if (!tempAudio.duration) {
                const track = {
                    id: Date.now() + index,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    artist: 'Unknown Artist',
                    album: 'Uploaded Music',
                    duration: '0:00',
                    src: audioURL,
                    cover: `https://via.placeholder.com/300x300/00ffff/000000?text=${encodeURIComponent(file.name.substring(0, 2).toUpperCase())}`,
                    type: 'uploaded',
                    fileSize: formatFileSize(file.size),
                    format: file.name.split('.').pop().toUpperCase(),
                    fileName: file.name,
                    originalFile: file
                };
                
                playlist.push(track);
                processed++;
                
                const progress = (processed / total) * 100;
                updateUploadProgress(progress, `Processed ${processed}/${total} files`);
                
                if (processed === total) {
                    setTimeout(() => {
                        uploadProgress.classList.add('hidden');
                        renderPlaylist();
                        savePlaylistToStorage();
                        showNotification(`${total} file${total === 1 ? '' : 's'} uploaded!`, 'success');
                        updateUploadButtonState();
                    }, 500);
                }
            }
        }, 2000);
    });
}

function updateUploadProgress(percentage, text) {
    uploadProgressFill.style.width = `${percentage}%`;
    uploadProgressText.textContent = text;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function clearUploadedFiles() {
    const uploadedTracks = playlist.filter(track => track.type === 'uploaded');
    
    if (uploadedTracks.length === 0) {
        showNotification('No uploaded files to clear', 'info');
        return;
    }
    
    if (confirm(`Are you sure you want to remove all ${uploadedTracks.length} uploaded files?`)) {
        uploadedTracks.forEach(track => {
            if (track.src && track.src.startsWith('blob:')) {
                URL.revokeObjectURL(track.src);
            }
        });
        
        playlist = playlist.filter(track => track.type !== 'uploaded');
        
        const currentTrack = playlist[currentTrackIndex];
        if (!currentTrack || currentTrack.type === 'uploaded') {
            currentTrackIndex = 0;
            if (playlist.length > 0) {
                loadTrack(currentTrackIndex);
            }
        }
        
        selectedItems.clear();
        
        renderPlaylist();
        savePlaylistToStorage();
        updateUploadButtonState();
        
        showNotification('All uploaded files removed', 'success');
    }
}

function updateUploadButtonState() {
    const uploadedCount = playlist.filter(track => track.type === 'uploaded').length;
    clearUploadsBtn.style.display = uploadedCount > 0 ? 'flex' : 'none';
}

function startProgressUpdates() {
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
    }
    
    progressUpdateInterval = setInterval(() => {
        if (audioPlayer && !audioPlayer.paused && !isNaN(audioPlayer.currentTime)) {
            updateProgress();
        }
    }, 100);
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) {
        currentTitle.textContent = 'No tracks available';
        currentArtist.textContent = 'Upload music files to get started';
        currentAlbum.textContent = '';
        albumCover.src = 'https://via.placeholder.com/300x300/333333/FFFFFF?text=ðŸŽµ';
        fileInfoDisplay.style.display = 'none';
        trackCounter.textContent = 'No tracks';
        return;
    }
    
    const track = playlist[index];
    currentTrackIndex = index;
    audioLoadAttempts = 0;
    
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    
    isPlaying = false;
    updatePlayButton();
    
    albumCover.src = track.cover;
    albumCover.alt = `${track.title} - ${track.artist}`;
    currentTitle.textContent = track.title;
    currentArtist.textContent = track.artist;
    currentAlbum.textContent = track.album;
    
    fileSize.textContent = track.fileSize || '';
    fileFormat.textContent = track.format || '';
    fileInfoDisplay.style.display = (track.fileSize || track.format) ? 'flex' : 'none';
    
    updateTrackCounter();
    updatePlaylistHighlight();
    
    audioPlayer.src = track.src;
    audioPlayer.load();
    
    currentTimeDisplay.textContent = '0:00';
    durationDisplay.textContent = track.duration;
    progressFill.style.width = '0%';
    progressHandle.style.left = '0%';
    
    playOverlay.classList.remove('visible');
    
    console.log(`Loaded track: ${track.title} by ${track.artist}`);
}

function togglePlay() {
    if (playlist.length === 0) {
        showNotification('No tracks available. Please upload music files.', 'info');
        return;
    }
    
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    if (playlist.length === 0) {
        showNotification('No tracks to play', 'info');
        return;
    }
    
    const playPromise = audioPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            updatePlayButton();
            updatePlaylistHighlight();
            playOverlay.classList.add('visible');
            console.log('Audio started playing');
        }).catch(error => {
            console.error('Error playing audio:', error);
            isPlaying = false;
            updatePlayButton();
            
            const currentTrack = playlist[currentTrackIndex];
            if (currentTrack && currentTrack.type === 'default') {
                showNotification('Demo tracks may not work due to CORS restrictions. Please upload your own music files.', 'error', 5000);
            } else {
                showNotification('Unable to play audio. Please check the file format.', 'error');
            }
        });
    }
}

function pause() {
    audioPlayer.pause();
    isPlaying = false;
    updatePlayButton();
    updatePlaylistHighlight();
    playOverlay.classList.remove('visible');
    console.log('Audio paused');
}

function updatePlayButton() {
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
        playPauseBtn.title = 'Pause';
    } else {
        icon.className = 'fas fa-play';
        playPauseBtn.title = 'Play';
    }
}

function previousTrack() {
    if (playlist.length === 0) return;
    
    console.log('Previous track clicked');
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1;
    }
    
    const wasPlaying = isPlaying;
    loadTrack(newIndex);
    
    if (wasPlaying) {
        setTimeout(() => {
            play();
        }, 200);
    }
}

function nextTrack() {
    if (playlist.length === 0) return;
    
    console.log('Next track clicked');
    let newIndex;
    
    if (isShuffling) {
        newIndex = Math.floor(Math.random() * playlist.length);
        while (newIndex === currentTrackIndex && playlist.length > 1) {
            newIndex = Math.floor(Math.random() * playlist.length);
        }
    } else {
        newIndex = currentTrackIndex + 1;
        if (newIndex >= playlist.length) {
            if (isRepeating) {
                newIndex = 0;
            } else {
                pause();
                return;
            }
        }
    }
    
    const wasPlaying = isPlaying;
    loadTrack(newIndex);
    
    if (wasPlaying) {
        setTimeout(() => {
            play();
        }, 200);
    }
}

function toggleShuffle() {
    isShuffling = !isShuffling;
    shuffleBtn.classList.toggle('active', isShuffling);
    savePlaylistToStorage();
    showNotification(`Shuffle ${isShuffling ? 'enabled' : 'disabled'}`, 'info', 1500);
}

function toggleRepeat() {
    isRepeating = !isRepeating;
    repeatBtn.classList.toggle('active', isRepeating);
    savePlaylistToStorage();
    showNotification(`Repeat ${isRepeating ? 'enabled' : 'disabled'}`, 'info', 1500);
}

function setVolume(volume) {
    currentVolume = Math.max(0, Math.min(1, volume));
    audioPlayer.volume = isMuted ? 0 : currentVolume;
    updateVolumeDisplay();
    savePlaylistToStorage();
}

function toggleMute() {
    isMuted = !isMuted;
    audioPlayer.volume = isMuted ? 0 : currentVolume;
    updateMuteButton();
    updateVolumeDisplay();
    savePlaylistToStorage();
}

function updateMuteButton() {
    const icon = muteBtn.querySelector('i');
    if (isMuted || currentVolume === 0) {
        icon.className = 'fas fa-volume-mute';
        muteBtn.title = 'Unmute';
    } else if (currentVolume < 0.5) {
        icon.className = 'fas fa-volume-down';
        muteBtn.title = 'Mute';
    } else {
        icon.className = 'fas fa-volume-up';
        muteBtn.title = 'Mute';
    }
}

function updateVolumeDisplay() {
    const displayVolume = isMuted ? 0 : currentVolume;
    const percentage = Math.round(displayVolume * 100);
    volumeDisplay.textContent = `${percentage}%`;
    volumeFill.style.width = `${percentage}%`;
    volumeHandle.style.right = `${100 - percentage}%`;
    updateMuteButton();
}

function updateProgress() {
    if (!audioPlayer || !audioPlayer.duration || isNaN(audioPlayer.duration)) {
        return;
    }
    
    const currentTime = audioPlayer.currentTime || 0;
    const duration = audioPlayer.duration;
    
    const progress = (currentTime / duration) * 100;
    progressFill.style.width = `${progress}%`;
    progressHandle.style.left = `${progress}%`;
    
    currentTimeDisplay.textContent = formatTime(currentTime);
    
    const currentTrack = playlist[currentTrackIndex];
    if (currentTrack && !isNaN(duration)) {
        const actualDuration = formatTime(duration);
        if (currentTrack.duration === '0:00' || actualDuration !== currentTrack.duration) {
            currentTrack.duration = actualDuration;
            durationDisplay.textContent = actualDuration;
        }
    }
}

function seekTo(percentage) {
    if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
        const newTime = (percentage / 100) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
        updateProgress();
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTrackCounter() {
    if (playlist.length === 0) {
        trackCounter.textContent = 'No tracks';
    } else {
        trackCounter.textContent = `Track ${currentTrackIndex + 1} of ${playlist.length}`;
    }
}

function toggleSelectAll() {
    if (selectedItems.size === playlist.length) {
        selectedItems.clear();
        selectAllBtn.innerHTML = '<i class="fas fa-square"></i> Select All';
    } else {
        selectedItems.clear();
        playlist.forEach((_, index) => selectedItems.add(index));
        selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Deselect All';
    }
    renderPlaylist();
}

function deleteSelectedItems() {
    if (selectedItems.size === 0) {
        showNotification('No items selected', 'info');
        return;
    }
    
    const selectedCount = selectedItems.size;
    const selectedIndices = Array.from(selectedItems);
    const hasDefaultTracks = selectedIndices.some(index => 
        playlist[index] && playlist[index].type === 'default'
    );
    
    if (hasDefaultTracks) {
        showNotification('Cannot delete default tracks. Only uploaded tracks can be removed.', 'error', 4000);
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedCount} selected track${selectedCount === 1 ? '' : 's'}?`)) {
        const selectedTracks = selectedIndices
            .sort((a, b) => b - a) 
            .map(index => playlist[index]);
        
        selectedTracks.forEach(track => {
            if (track && track.src && track.src.startsWith('blob:')) {
                URL.revokeObjectURL(track.src);
            }
        });
        
        selectedIndices
            .sort((a, b) => b - a)
            .forEach(index => {
                playlist.splice(index, 1);
            });
        
        const removedBeforeCurrent = selectedIndices.filter(index => index < currentTrackIndex).length;
        currentTrackIndex = Math.max(0, currentTrackIndex - removedBeforeCurrent);
        
        selectedItems.clear();
        selectAllBtn.innerHTML = '<i class="fas fa-square"></i> Select All';
        
        if (playlist.length === 0) {
            currentTrackIndex = -1;
            loadTrack(-1); 
        } else {
            if (currentTrackIndex >= playlist.length) {
                currentTrackIndex = 0;
            }
            loadTrack(currentTrackIndex);
        }
        
        renderPlaylist();
        savePlaylistToStorage();
        updateUploadButtonState();
        
        showNotification(`${selectedCount} track${selectedCount === 1 ? '' : 's'} deleted`, 'success');
    }
}

function deleteTrack(index) {
    const track = playlist[index];
    
    if (track.type === 'default') {
        showNotification('Cannot delete default tracks. Only uploaded tracks can be removed.', 'error', 3000);
        return;
    }
    
    if (confirm(`Delete "${track.title}"?`)) {
        if (track.src && track.src.startsWith('blob:')) {
            URL.revokeObjectURL(track.src);
        }
        
        playlist.splice(index, 1);
        
        if (index < currentTrackIndex) {
            currentTrackIndex--;
        } else if (index === currentTrackIndex) {
            if (currentTrackIndex >= playlist.length) {
                currentTrackIndex = Math.max(0, playlist.length - 1);
            }
            if (playlist.length > 0) {
                loadTrack(currentTrackIndex);
            } else {
                loadTrack(-1);
            }
        }
        
        renderPlaylist();
        savePlaylistToStorage();
        updateUploadButtonState();
        showNotification('Track deleted', 'success');
    }
}

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistContainer.innerHTML = `
            <div class="playlist-empty" style="padding: var(--space-32); text-align: center;">
                <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--color-primary); margin-bottom: var(--space-16); opacity: 0.7;"></i>
                <h3 style="color: var(--color-text); margin-bottom: var(--space-8);">No tracks available</h3>
                <p style="color: var(--color-text-muted); margin-bottom: var(--space-16);">Upload your music files to get started!</p>
                <button class="btn btn--primary" onclick="document.getElementById('fileInput').click()">
                    <i class="fas fa-plus"></i> Upload Music
                </button>
            </div>
        `;
        return;
    }
    
    playlist.forEach((track, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        if (selectedItems.has(index)) {
            playlistItem.classList.add('selected');
        }
        playlistItem.dataset.index = index;
        
        const isUploadedTrack = track.type === 'uploaded';
        
        playlistItem.innerHTML = `
            <input type="checkbox" class="playlist-item-checkbox" ${selectedItems.has(index) ? 'checked' : ''} ${!isUploadedTrack ? 'style="opacity: 0.3;" disabled' : ''}>
            <img src="${track.cover}" alt="${track.title}" class="playlist-item-cover">
            <div class="playlist-item-info">
                <div class="playlist-item-title">${track.title}</div>
                <div class="playlist-item-artist">${track.artist}</div>
                <div class="playlist-item-album">${track.album}</div>
            </div>
            <div class="playlist-item-duration">${track.duration}</div>
            <div class="playlist-item-actions">
                ${isUploadedTrack ? '<button class="playlist-item-btn delete" title="Delete Track"><i class="fas fa-trash"></i></button>' : ''}
            </div>
            <i class="fas fa-play playlist-item-playing-icon hidden"></i>
            <span class="playlist-item-type">${track.type === 'uploaded' ? 'Uploaded' : 'Demo'}</span>
        `;
        
        // Checkbox event listener (only for uploaded tracks)
        const checkbox = playlistItem.querySelector('.playlist-item-checkbox');
        if (isUploadedTrack) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (checkbox.checked) {
                    selectedItems.add(index);
                } else {
                    selectedItems.delete(index);
                }
                playlistItem.classList.toggle('selected', checkbox.checked);
                
                const uploadedIndices = playlist.map((t, i) => t.type === 'uploaded' ? i : null).filter(i => i !== null);
                const selectedUploadedCount = uploadedIndices.filter(i => selectedItems.has(i)).length;
                
                if (selectedUploadedCount === uploadedIndices.length && uploadedIndices.length > 0) {
                    selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Deselect All';
                } else {
                    selectAllBtn.innerHTML = '<i class="fas fa-square"></i> Select All';
                }
            });
        }
        
        const deleteBtn = playlistItem.querySelector('.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTrack(index);
            });
        }
        
        playlistItem.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && !e.target.closest('.playlist-item-btn')) {
                console.log(`Playlist item clicked: ${track.title}`);
                loadTrack(index);
                setTimeout(() => {
                    play();
                }, 200);
            }
        });
        
        playlistContainer.appendChild(playlistItem);
    });
    
    updatePlaylistHighlight();
}

function updatePlaylistHighlight() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    const playingIcons = document.querySelectorAll('.playlist-item-playing-icon');
    
    playlistItems.forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    playingIcons.forEach((icon, index) => {
        if (index === currentTrackIndex && isPlaying) {
            icon.classList.remove('hidden');
        } else {
            icon.classList.add('hidden');
        }
    });
}

function setupEventListeners() {
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files);
        }
        e.target.value = ''; 
    });
    
    clearUploadsBtn.addEventListener('click', clearUploadedFiles);
    
    dragDropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    dragDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropZone.classList.add('drag-over');
    });
    
    dragDropZone.addEventListener('dragleave', (e) => {
        if (!dragDropZone.contains(e.relatedTarget)) {
            dragDropZone.classList.remove('drag-over');
        }
    });
    
    dragDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('audio/')
        );
        
        if (files.length > 0) {
            handleFileUpload(files);
        } else {
            showNotification('Please drop audio files only', 'error');
        }
    });
    
    selectAllBtn.addEventListener('click', toggleSelectAll);
    deleteSelectedBtn.addEventListener('click', deleteSelectedItems);
    
    playPauseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        togglePlay();
    });
    
    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        previousTrack();
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextTrack();
    });
    
    shuffleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleShuffle();
    });
    
    repeatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRepeat();
    });
    
    muteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMute();
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateProgress();
        console.log('Audio metadata loaded');
    });
    
    audioPlayer.addEventListener('canplay', () => {
        updateProgress();
        console.log('Audio can play');
    });
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    audioPlayer.addEventListener('ended', () => {
        console.log('Audio ended');
        if (isRepeating && !isShuffling) {
            audioPlayer.currentTime = 0;
            play();
        } else {
            nextTrack();
        }
    });
    
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
        updatePlaylistHighlight();
        playOverlay.classList.add('visible');
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
        updatePlaylistHighlight();
        playOverlay.classList.remove('visible');
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        isPlaying = false;
        updatePlayButton();
        
        const currentTrack = playlist[currentTrackIndex];
        if (currentTrack && currentTrack.type === 'default') {
            console.log('Demo track failed to load - this is expected');
        } else {
            showNotification('Error playing audio file', 'error');
        }
    });
    
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        seekTo(Math.max(0, Math.min(100, percentage)));
    });
    
    volumeBar.addEventListener('click', (e) => {
        const rect = volumeBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        setVolume(Math.max(0, Math.min(1, percentage)));
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName.toLowerCase() === 'input' && e.target.type !== 'checkbox') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousTrack();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextTrack();
                break;
            case 'ArrowUp':
                e.preventDefault();
                setVolume(currentVolume + 0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setVolume(currentVolume - 0.1);
                break;
            case 'KeyM':
                e.preventDefault();
                toggleMute();
                break;
            case 'KeyS':
                e.preventDefault();
                toggleShuffle();
                break;
            case 'KeyR':
                e.preventDefault();
                toggleRepeat();
                break;
        }
    });
    
    setupDragHandlers();
}

function setupDragHandlers() {
    let isDraggingProgress = false;
    let isDraggingVolume = false;
    
    progressHandle.addEventListener('mousedown', (e) => {
        isDraggingProgress = true;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingProgress) {
            const rect = progressBar.getBoundingClientRect();
            let percentage = ((e.clientX - rect.left) / rect.width) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            seekTo(percentage);
        }
        if (isDraggingVolume) {
            const rect = volumeBar.getBoundingClientRect();
            let percentage = (e.clientX - rect.left) / rect.width;
            percentage = Math.max(0, Math.min(1, percentage));
            setVolume(percentage);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingProgress = false;
        isDraggingVolume = false;
    });
    
    volumeHandle.addEventListener('mousedown', (e) => {
        isDraggingVolume = true;
        e.preventDefault();
    });
    
    progressBar.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = progressBar.getBoundingClientRect();
        const touch = e.touches[0];
        const percentage = ((touch.clientX - rect.left) / rect.width) * 100;
        seekTo(Math.max(0, Math.min(100, percentage)));
    });
    
    volumeBar.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = volumeBar.getBoundingClientRect();
        const touch = e.touches[0];
        const percentage = (touch.clientX - rect.left) / rect.width;
        setVolume(Math.max(0, Math.min(1, percentage)));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    setTimeout(() => {
        shuffleBtn.classList.toggle('active', isShuffling);
        repeatBtn.classList.toggle('active', isRepeating);
        setVolume(currentVolume);
        if (isMuted) {
            toggleMute();
        }
    }, 100);
});
