


document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE MANAGEMENT ---
    const defaultState = {
        theme: 'dark',
        tasks: [],
        noteTitle: '',
        noteContent: '',
        studyTime: 0, // in minutes
        streak: 1,
        habits: [
            { id: 1, name: 'Drink Water', done: false },
            { id: 2, name: 'Read 10 pages', done: false },
            { id: 3, name: 'Review Notes', done: false },
            { id: 4, name: 'Study for MidTerm Exam', done: false },
            { id: 5, name: 'Study for Final Exam', done: false }
        ],
        settings: { workDuration: 25, breakDuration: 5 }
    };

    let appState = JSON.parse(localStorage.getItem('auraState')) || defaultState;

    function saveState() {
        localStorage.setItem('auraState', JSON.stringify(appState));
        updateDashboardStats();
    }

    // --- 2. INITIALIZATION & LOADER ---
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
        initApp();
    }, 600); // Fake load for professional feel

    function initApp() {
        applyTheme(appState.theme);
        renderTasks('all');
        renderHabits();
        updateDashboardStats();
        
        // Load Notes
        document.getElementById('note-title').value = appState.noteTitle || '';
        document.getElementById('note-content').value = appState.noteContent || '';

        // Load Settings
        document.getElementById('work-duration').value = appState.settings.workDuration;
        document.getElementById('break-duration').value = appState.settings.breakDuration;
        
        setupProgressRing();
    }

    // --- 3. NAVIGATION (SPA) ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            // Update active nav class
            navItems.forEach(n => n.classList.remove('active'));
            // Activate both desktop and mobile nav items matched
            document.querySelectorAll(`.nav-item[data-target="${target}"]`).forEach(n => n.classList.add('active'));

            // Switch Page
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            // Update Title
            pageTitle.innerText = item.querySelector('span') ? item.querySelector('span').innerText : target.charAt(0).toUpperCase() + target.slice(1);
        });
    });

    // --- 4. TOAST NOTIFICATIONS ---
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="ph ph-info"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- 5. TASKS LOGIC ---
    const taskInput = document.getElementById('new-task-input');
    const taskCategory = document.getElementById('new-task-category');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');

    function renderTasks(filter = 'all') {
        taskList.innerHTML = '';
        let filteredTasks = appState.tasks;
        if (filter === 'pending') filteredTasks = appState.tasks.filter(t => !t.completed);
        if (filter === 'completed') filteredTasks = appState.tasks.filter(t => t.completed);

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<div class="empty-state">No tasks found.</div>`;
            return;
        }

        filteredTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="task-left" onclick="toggleTask(${task.id})">
                    <i class="ph ${task.completed ? 'ph-check-circle' : 'ph-circle'}"></i>
                    <span class="task-title">${task.text}</span>
                    <span class="task-tag">${task.category}</span>
                </div>
                <button class="del-btn" onclick="deleteTask(${task.id})"><i class="ph ph-trash"></i></button>
            `;
            taskList.appendChild(div);
        });
    }

    addTaskBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (!text) return;
        const newTask = {
            id: Date.now(),
            text,
            category: taskCategory.value,
            completed: false
        };
        appState.tasks.push(newTask);
        taskInput.value = '';
        saveState();
        renderTasks(document.querySelector('.filter-btn.active').dataset.filter);
        showToast('Task added successfully');
    });

    window.toggleTask = (id) => {
        const task = appState.tasks.find(t => t.id === id);
        if (task) task.completed = !task.completed;
        saveState();
        renderTasks(document.querySelector('.filter-btn.active').dataset.filter);
    };

    window.deleteTask = (id) => {
        appState.tasks = appState.tasks.filter(t => t.id !== id);
        saveState();
        renderTasks(document.querySelector('.filter-btn.active').dataset.filter);
        showToast('Task deleted');
    };

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTasks(e.target.dataset.filter);
        });
    });

    // --- 6. NOTES & SMART SUMMARY ---
   /* const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    
    // Auto-save notes
    const saveNotes = () => {
        appState.noteTitle = noteTitleInput.value;
        appState.noteContent = noteContentInput.value;
        saveState();
    };
    noteTitleInput.addEventListener('input', saveNotes);
    noteContentInput.addEventListener('input', saveNotes);

    document.getElementById('summarize-btn').addEventListener('click', () => {
        const text = noteContentInput.value.trim();
        const summaryBox = document.getElementById('summary-box');
        const summaryContent = document.getElementById('summary-content');

        if (!text) {
            showToast("Write some notes first to summarize!");
            return;
        }

        // Basic JS Extraction Logic: Take first and last sentence, highlight keywords
        let sentences = text.split('.').map(s => s.trim()).filter(s => s.length > 0);
        let summaryText = "";
        
        if (sentences.length <= 2) {
            summaryText = text;
        } else {
            summaryText = sentences[0] + ". ... " + sentences[sentences.length - 1] + ".";
        }

        // Highlight Important Study Keywords
        const keywords = ['important', 'key', 'remember', 'exam', 'concept', 'formula', 'definition', 'must'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            summaryText = summaryText.replace(regex, `<mark>$&</mark>`);
        });

        summaryContent.innerHTML = summaryText;
        summaryBox.classList.remove('hidden');
        showToast("Summary generated");
    }); */


    // --- NOTES & SMART SUMMARY ---
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');

// Auto-save notes
const saveNotes = () => {
    appState.noteTitle = noteTitleInput.value;
    appState.noteContent = noteContentInput.value;
    saveState();
};

noteTitleInput.addEventListener('input', saveNotes);
noteContentInput.addEventListener('input', saveNotes);

// --- 5. SUMMARIZER LOGIC (Professional Refinement) ---
const summarizeBtn = document.getElementById("summarize-btn");
const summaryBox = document.getElementById("summary-box");
const summaryContent = document.getElementById("summary-content");
const noteContent = document.getElementById("note-content");

summarizeBtn.addEventListener("click", () => {
    const text = noteContent.value.trim();

    if (text.length < 20) {
        showToast("Please enter more text to summarize.");
        return;
    }

    // Show loading state on button
    const originalBtnContent = summarizeBtn.innerHTML;
    summarizeBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> <span>Processing...</span>`;
    summarizeBtn.disabled = true;

    // Simulate AI processing
    setTimeout(() => {
        // Logic: Get sentences, pick top ones
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const summaryCount = Math.max(1, Math.floor(sentences.length * 0.4));
        let finalSummary = sentences.slice(0, summaryCount).join(" ");

        // Professional Blue Highlighting Logic
        // Highlight key academic terms to make it look "Smart"
        const keywords = ['important', 'result', 'key', 'method', 'process', 'conclusion', 'system', 'data', 'significant'];
        
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            finalSummary = finalSummary.replace(regex, `<mark>$&</mark>`);
        });

        // Update UI
        summaryContent.innerHTML = finalSummary;
        summaryBox.classList.remove("hidden");
        
        // Restore Button
        summarizeBtn.innerHTML = originalBtnContent;
        summarizeBtn.disabled = false;

        // Smoothly scroll to the result so the user sees it immediately
        summaryBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        showToast("Summary generated!");
    }, 1200);
});


    // --- 7. FOCUS MODE (POMODORO) ---
    // --- 7. FOCUS MODE (POMODORO) ---
    let timerInterval;
    let timeLeft = appState.settings.workDuration * 60;
    let isTimerRunning = false;
    let isWorkMode = true;
    let breakMode = "auto"; // auto or manual
    let pendingBreak = false;

    const timeDisplay = document.getElementById('time-display');
    const timerModeLabel = document.getElementById('timer-mode-label');
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    function setupProgressRing() {
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;
        updateTimerDisplay();
    }

    function setProgress(percent) {
        const offset = circumference - percent / 100 * circumference;
        circle.style.strokeDashoffset = offset;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const totalTime = (isWorkMode ? appState.settings.workDuration : appState.settings.breakDuration) * 60;
        const percentage = ((totalTime - timeLeft) / totalTime) * 100;
        setProgress(percentage);
    }

    document.getElementById('timer-start').addEventListener('click', () => {
        if (isTimerRunning) return;
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;

                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.start();
                setTimeout(() => osc.stop(), 500);

                if (isWorkMode) {
                    appState.studyTime += Number(appState.settings.workDuration);
                    saveState();

                    if (breakMode === "auto") {
                        isWorkMode = false;
                        timeLeft = Number(appState.settings.breakDuration) * 60;
                        timerModeLabel.innerText = "Break Session";
                        showToast("Work done → Auto break started");
                        document.getElementById('timer-start').click(); // Auto-continue
                    } else {
                        pendingBreak = true;
                        showToast("Work done → Start break manually");
                        document.getElementById('timer-start').style.display = 'none';
                        document.getElementById('start-break-btn').style.display = 'block';
                    }
                } else {
                    isWorkMode = true;
                    timeLeft = Number(appState.settings.workDuration) * 60;
                    timerModeLabel.innerText = "Work Session";
                    showToast("Break finished → Back to focus");
                    if (breakMode === "auto") {
                         document.getElementById('timer-start').click();
                    }
                }
                updateTimerDisplay();
            }
        }, 1000);
    });

    document.getElementById('timer-pause').addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
    });

    document.getElementById('timer-reset').addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timeLeft = (isWorkMode ? appState.settings.workDuration : appState.settings.breakDuration) * 60;
        setProgress(0);
        updateTimerDisplay();
    });

    document.querySelectorAll(".break-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".break-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            breakMode = btn.dataset.break;
            showToast(`Break mode: ${breakMode === 'auto' ? 'Auto' : 'Manual'}`);
        });
    });

    document.getElementById("start-break-btn").addEventListener("click", () => {
        if (!pendingBreak) return;

        isWorkMode = false;
        timeLeft = Number(appState.settings.breakDuration) * 60;
        timerModeLabel.innerText = "Break Session";
        pendingBreak = false;
        
        document.getElementById('start-break-btn').style.display = 'none';
        document.getElementById('timer-start').style.display = 'block';
        updateTimerDisplay();
        document.getElementById('timer-start').click(); // Trigger it instantly
        showToast("Break started");
    });

    // --- 8. DASHBOARD & HABITS ---
    function renderHabits() {
        const list = document.getElementById('habit-list');
        list.innerHTML = '';
        appState.habits.forEach(habit => {
            const div = document.createElement('div');
            div.className = `habit-item ${habit.done ? 'done' : ''}`;
            div.innerHTML = `
                <div class="habit-checkbox"></div>
                <span>${habit.name}</span>
            `;
            div.addEventListener('click', () => {
                habit.done = !habit.done;
                saveState();
                renderHabits();
            });
            list.appendChild(div);
        });
    }

    function updateDashboardStats() {
        const completedTasks = appState.tasks.filter(t => t.completed).length;
        const totalTasks = appState.tasks.length;
        
        document.getElementById('dash-time').innerText = `${appState.studyTime} min`;
        document.getElementById('dash-tasks').innerText = `${completedTasks}`;
        document.getElementById('dash-streak').innerText = `${appState.streak} days`;

        // Progress Bar
        const fill = document.getElementById('task-progress-fill');
        const percentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
        fill.style.width = `${percentage}%`;
    }

    // --- 9. SETTINGS ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
        applyTheme(appState.theme);
        saveState();
    });

    document.getElementById('work-duration').addEventListener('change', (e) => {
        appState.settings.workDuration = e.target.value;
        if(isWorkMode && !isTimerRunning) {
            Number(e.target.value)
            updateTimerDisplay();
        }
        saveState();
    });

    document.getElementById('break-duration').addEventListener('change', (e) => {
        appState.settings.breakDuration = e.target.value;
        if(!isWorkMode && !isTimerRunning) {
            Number(e.target.value)
            updateTimerDisplay();
        }
        saveState();
    });

    document.getElementById('reset-data-btn').addEventListener('click', () => {
        if(confirm("Are you sure you want to delete all your data? This cannot be undone.")) {
            localStorage.removeItem('auraState');
            location.reload(); // Reload to reset cleanly
        }
    });
});


//Normal music
/*
const musicUpload = document.getElementById('music-upload');
const audioPlayer = document.getElementById('audio-player');
const playlist = document.getElementById('playlist');



let musicList = [];

// upload music
musicUpload.addEventListener('change', (e) => {
    const files = e.target.files;

    for (let file of files) {
        const url = URL.createObjectURL(file);

        musicList.push({
            name: file.name,
            url: url
        });
    }

    renderPlaylist();
    showToast("Music added");
});

// render list
function renderPlaylist() {
    playlist.innerHTML = "";

    musicList.forEach((track, i) => {
        const div = document.createElement("div");
        div.classList.add("playlist-item");

        div.innerHTML = `
            <span>${track.name}</span>
            <button class="play-btn">Play</button>
        `;

        div.querySelector(".play-btn").addEventListener("click", () => {
            audioPlayer.src = track.url;
            audioPlayer.play();
        });

        playlist.appendChild(div);
    });
}

// your existing music code above...

function playMusic(index) {
    audioPlayer.src = musicList[index].url;
    audioPlayer.play();
    showToast("Now playing: " + musicList[index].name);
}

// ✅ PUT THIS RIGHT AFTER playMusic()
audioPlayer.addEventListener("ended", () => {
    let currentIndex = musicList.findIndex(song =>
        audioPlayer.src.includes(song.url)
    );

    let nextIndex = currentIndex + 1;

    if (nextIndex < musicList.length) {
        playMusic(nextIndex);
    }
}); */

const musicUpload = document.getElementById('music-upload');
const audioPlayer = document.getElementById('audio-player');
const playlist = document.getElementById('playlist');
const playBtn = document.getElementById("play-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const progressBar = document.getElementById("progress-bar");
const nowPlaying = document.getElementById("now-playing");

let db;
let currentSongs = [];
let currentIndex = 0;
let isShuffle = false;

// ---------------- DB ----------------
const request = indexedDB.open("AuraMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
};

// ---------------- UPLOAD ----------------
musicUpload.addEventListener("change", (e) => {
    const files = e.target.files;
    const tx = db.transaction("songs", "readwrite");
    const store = tx.objectStore("songs");

    for (let file of files) {
       store.add({
            name: file.name,
            file: file.slice(0, file.size, file.type)
        });
    }

    tx.oncomplete = () => {
        showToast("Music saved");
        loadSongs();
    };
});

// ---------------- LOAD SONGS ----------------
// ---------------- LOAD SONGS ----------------
function loadSongs() {
    playlist.innerHTML = "";
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");
    const req = store.getAll();

    req.onsuccess = () => {
        currentSongs = req.result;

        currentSongs.forEach((song, index) => {
            const item = document.createElement("div");
            item.classList.add("playlist-item");
            item.setAttribute("data-index", index);

            item.innerHTML = `
                <span class="song-title">${song.name}</span>
                <div class="song-actions">
                    <button class="play-btn">Play</button>
                    <button class="del-song-btn" onclick="deleteSong(${song.id})"><i class="ph ph-trash"></i></button>
                </div>
            `;

            const playBtn = item.querySelector(".play-btn");

            playBtn.addEventListener("click", () => {
                playSong(index);
                setActiveSongUI(index);
            });

            playlist.appendChild(item);
        });
    };
}

// ---------------- DELETE SONG ----------------
window.deleteSong = function(id) {
    const tx = db.transaction("songs", "readwrite");
    const store = tx.objectStore("songs");
    store.delete(id);
    
    tx.oncomplete = () => {
        showToast("Song deleted");
        loadSongs(); // Refresh list immediately
    };
};

function setActiveSongUI(index) {
    document.querySelectorAll(".playlist-item").forEach(item => {
        item.classList.remove("active");
    });

    const activeItem = document.querySelector(`[data-index="${index}"]`);
    if (activeItem) {
        activeItem.classList.add("active");
    }
}

// ---------------- PLAY SONG ----------------
function playSong(index) {
    if (!currentSongs.length) return;

    currentIndex = index;

    const song = currentSongs[index];
    const url = URL.createObjectURL(song.file);

    audioPlayer.src = url;
    audioPlayer.play();

    setActiveSongUI(index); // 👈 ADD THIS

    showToast("Now playing: " + song.name);
}

// ---------------- CONTROLS ----------------
playBtn.addEventListener("click", () => {
    // if nothing selected yet, start first song
    if (!audioPlayer.src && currentSongs.length > 0) {
        playSong(0);
        return;
    }

    // normal play/pause toggle
    if (audioPlayer.paused) {
        audioPlayer.play();
        playBtn.textContent = "⏸";
    } else {
        audioPlayer.pause();
        playBtn.textContent = "▶";
    }
});
nextBtn.addEventListener("click", () => {
    if (isShuffle) {
        playSong(getRandomIndex());
    } else if (currentIndex < currentSongs.length - 1) {
        playSong(currentIndex + 1);
    }
});

prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        playSong(currentIndex - 1);
    }
});

// ---------------- SHUFFLE ----------------
shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    showToast(isShuffle ? "Shuffle ON" : "Shuffle OFF");
});

function getRandomIndex() {
    return Math.floor(Math.random() * currentSongs.length);
}

// ---------------- AUTO NEXT ----------------
audioPlayer.addEventListener("ended", () => {
    if (!currentSongs.length) return;

    if (isShuffle) {
        playSong(getRandomIndex());
    } else {
        if (currentIndex < currentSongs.length - 1) {
            playSong(currentIndex + 1);
        }
    }
});

// ---------------- PROGRESS ----------------
audioPlayer.addEventListener("timeupdate", () => {
    progressBar.value =
        (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
});

progressBar.addEventListener("input", () => {
    audioPlayer.currentTime =
        (progressBar.value / 100) * audioPlayer.duration;
});

function syncTimerToSettings() {
    if (isTimerRunning) return;

    if (isWorkMode) {
        timeLeft = Number(appState.settings.workDuration) * 60;
    } else {
        timeLeft = Number(appState.settings.breakDuration) * 60;
    }

    updateTimerDisplay();
}

function contactme() {
    window.open("https://forms.gle/GMX5npeeqc2Qdu6SA", "_blank", "noopener,noreferrer");
}

.contact {
    padding: 10px;
    border-radius: 10px;
    background-color: var(--primary-hover);
    color: #fff;
    font-size: 20px;
}
