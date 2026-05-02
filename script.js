function showAlert(html) {
    const alertBox = document.getElementById("customAlert");
    document.getElementById("alertText").innerHTML = html;
    alertBox.style.display = "block";
}


showAlert(
    '<mark><b>Notice:</b></mark> AI is currently under maintenance. Please check back later.'
);


function closeAlert() {
    document.getElementById("customAlert").style.display = "none";

    document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        login();
    }
});

}


document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE MANAGEMENT ---
    const defaultState = {
        theme: 'dark',
        tasks: [],
        studyTime: 0,
        streak: 1,
        habits: [
            { id: 1, name: 'Drink Water', done: false },
            { id: 2, name: 'Read 10 pages', done: false },
            { id: 3, name: 'Review Notes', done: false }
        ],
        settings: { 
            workDuration: 25, 
            breakDuration: 5,
            apiKey: '' // For the Gemini AI
        }
    };

    let appState = JSON.parse(localStorage.getItem('auraState')) || defaultState;

    // Backward compatibility for old saves
    if(!appState.settings.apiKey) appState.settings.apiKey = '';

    function saveState() {
        localStorage.setItem('auraState', JSON.stringify(appState));
        updateDashboardStats();
    }

    // --- 2. INITIALIZATION & LOADER ---
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
        initApp();
    }, 600);

    function initApp() {
        applyTheme(appState.theme);
        renderTasks('all');
        renderHabits();
        updateDashboardStats();
        
        // Load Settings
        document.getElementById('work-duration').value = appState.settings.workDuration;
        document.getElementById('break-duration').value = appState.settings.breakDuration;
        document.getElementById('api-key-input').value = appState.settings.apiKey;
        document.getElementById("ai-dev-notice").style.display = "block"; //remove if tutor is available
        
        setupProgressRing();

        checkAITutorStatus(); // ADD THIS

    }

    //remove if ai tutor is available

    function checkAITutorStatus() {
    const notice = document.getElementById("ai-dev-notice");
    const input = document.getElementById("chat-input");
    const button = document.getElementById("chat-send-btn");

    if (!appState.settings.apiKey) {
        notice.style.display = "block";
        input.disabled = true;
        button.disabled = true;
        input.placeholder = "AI Tutor unavailable...";
    } else {
        notice.style.display = "none";
        input.disabled = false;
        button.disabled = false;
        input.placeholder = "Ask a question...";
    }
}

    // --- 3. NAVIGATION (SPA) ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');

            navItems.forEach(n => n.classList.remove('active'));
            document.querySelectorAll(`.nav-item[data-target="${target}"]`).forEach(n => n.classList.add('active'));

            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            const titleSpan = item.querySelector('span');
            pageTitle.innerText = titleSpan ? titleSpan.innerText : target.charAt(0).toUpperCase() + target.slice(1);
            
            if (target === "chatbot") {
                checkAITutorStatus();
            }
       
        });
    });

    // --- 4. TOAST NOTIFICATIONS ---
    window.showToast = function(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="ph ph-info"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

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
            taskList.innerHTML = `<div class="empty-state">No tasks here yet.</div>`;
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
        appState.tasks.push({ id: Date.now(), text, category: taskCategory.value, completed: false });
        taskInput.value = '';
        saveState();
        renderTasks(document.querySelector('.filter-btn.active').dataset.filter);
        showToast('Task added');
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

    // --- 6. AI TUTOR LOGIC (GEMINI API) ---
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-msg`;
        
        // Basic Markdown-to-HTML parser for bold text returned by Gemini
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        msgDiv.innerHTML = formattedText;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    /* the current api key handler 
    async function handleChat() {
        const message = chatInput.value.trim();
        const apiKey = appState.settings.apiKey;

        if (!message) return;
        
        appendMessage(message, 'user');
        chatInput.value = '';


        if (!apiKey) {
            
            setTimeout(() => appendMessage('The AI Tutor is still being developed. It’s not available yet—check back soon.', 'bot'), 500);
            return;
        }

        appendMessage('<i class="ph ph-circle-notch ph-spin"></i> Thinking...', 'bot');
        const loadingMsg = chatMessages.lastElementChild;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "You are a helpful and concise study tutor for a student. Answer this: " + message }] }]
                })
            });
            
            const data = await response.json();
            loadingMsg.remove();

            if(data.error) throw new Error(data.error.message);
            
            const reply = data.candidates[0].content.parts[0].text;
            appendMessage(reply, 'bot');
        } catch (error) {
            loadingMsg.remove();
            appendMessage(`Error: ${error.message || "Failed to connect to API. Is your key correct?"}`, 'bot');
        }
    }

    */

    async function handleChat() {
    const message = chatInput.value.trim();
    // We no longer need the API key on the frontend because the backend handles it!
    
    if (!message) return;
    
    appendMessage(message, 'user');
    chatInput.value = '';
    
    appendMessage('<i class="ph ph-circle-notch ph-spin"></i> Thinking...', 'bot');
    const loadingMsg = chatMessages.lastElementChild;

    try {
        // CHANGE: Fetch from your local backend instead of Google
        const response = await fetch('https://study-back-end.onrender.com/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message }) // Send the message to your Node.js server
        });
        
        const data = await response.json();
        loadingMsg.remove();

        if (data.error) throw new Error(data.error);
        
        // Use data.reply because that is what your backend sends back
        const reply = data.reply; 
        appendMessage(reply, 'bot');
    } catch (error) {
        loadingMsg.remove();
        appendMessage(`Error: ${error.message || "Failed to connect to backend."}`, 'bot');
    }
}

    chatSendBtn.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

    // --- 7. FOCUS MODE (POMODORO) ---
    let timerInterval;
    let timeLeft = appState.settings.workDuration * 60;
    let isTimerRunning = false;
    let isWorkMode = true;
    let breakMode = "auto";
    let pendingBreak = false;

    const timeDisplay = document.getElementById('time-display');
    const timerModeLabel = document.getElementById('timer-mode-label');
    const circle = document.querySelector('.progress-ring__circle');
    
    // Ensure svg rendering matches css bounds
    let radius = 110; 
    let circumference = radius * 2 * Math.PI;

    function setupProgressRing() {
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;
        updateTimerDisplay();
    }

    function setProgress(percent) {
        const offset = circumference - (percent / 100) * circumference;
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

                // Beep sound
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    osc.connect(ctx.destination);
                    osc.start(); setTimeout(() => osc.stop(), 500);
                } catch(e) {}

                if (isWorkMode) {
                    appState.studyTime += Number(appState.settings.workDuration);
                    saveState();

                    if (breakMode === "auto") {
                        isWorkMode = false;
                        timeLeft = Number(appState.settings.breakDuration) * 60;
                        timerModeLabel.innerText = "Break Session";
                        showToast("Work done! Auto break started");
                        document.getElementById('timer-start').click(); 
                    } else {
                        pendingBreak = true;
                        showToast("Work done! Start your break manually.");
                        document.getElementById('timer-start').style.display = 'none';
                        document.getElementById('start-break-btn').style.display = 'block';
                    }
                } else {
                    isWorkMode = true;
                    timeLeft = Number(appState.settings.workDuration) * 60;
                    timerModeLabel.innerText = "Work Session";
                    showToast("Break over! Time to focus.");
                    if (breakMode === "auto") document.getElementById('timer-start').click();
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
        document.getElementById('timer-start').click();
    });

    // --- 8. DASHBOARD STATS ---
    function renderHabits() {
        const list = document.getElementById('habit-list');
        list.innerHTML = '';
        appState.habits.forEach(habit => {
            const div = document.createElement('div');
            div.className = `habit-item ${habit.done ? 'done' : ''}`;
            div.innerHTML = `<div class="habit-checkbox"></div><span>${habit.name}</span>`;
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

        const fill = document.getElementById('task-progress-fill');
        const percentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
        fill.style.width = `${percentage}%`;
    }

    // --- 9. MUSIC PLAYER (INDEXED DB) ---
    const musicUpload = document.getElementById('music-upload');
    const audioPlayer = document.getElementById('audio-player');
    const playlist = document.getElementById('playlist');
    const playBtn = document.getElementById("play-btn");
    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");
    const shuffleBtn = document.getElementById("shuffle-btn");
    const progressBar = document.getElementById("progress-bar");
    const nowPlaying = document.getElementById("now-playing");

    let db, currentSongs = [], currentIndex = 0, isShuffle = false;

    const request = indexedDB.open("StudyMusicDB", 1);
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = (e) => {
        db = e.target.result;
        loadSongs();
    };

    musicUpload.addEventListener("change", (e) => {
        const files = e.target.files;
        const tx = db.transaction("songs", "readwrite");
        const store = tx.objectStore("songs");

        for (let file of files) {
           store.add({ name: file.name, file: file.slice(0, file.size, file.type) });
        }
        tx.oncomplete = () => { showToast("Music imported!"); loadSongs(); };
    });

    function loadSongs() {
        playlist.innerHTML = "";
        const tx = db.transaction("songs", "readonly");
        const req = tx.objectStore("songs").getAll();

        req.onsuccess = () => {
            currentSongs = req.result;
            currentSongs.forEach((song, index) => {
                const item = document.createElement("div");
                item.className = "playlist-item";
                item.setAttribute("data-index", index);
                item.innerHTML = `
                    <span>${song.name}</span>
                    <div class="song-actions">
                        <button class="play-btn">Play</button>
                        <button class="del-btn" onclick="deleteSong(${song.id})"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                item.querySelector(".play-btn").addEventListener("click", () => playSong(index));
                playlist.appendChild(item);
            });
        };
    }

    window.deleteSong = function(id) {
        const tx = db.transaction("songs", "readwrite");
        tx.objectStore("songs").delete(id);
        tx.oncomplete = () => { showToast("Song deleted"); loadSongs(); };
    };

    function playSong(index) {
        if (!currentSongs.length) return;
        currentIndex = index;
        const song = currentSongs[index];
        audioPlayer.src = URL.createObjectURL(song.file);
        audioPlayer.play();
        playBtn.innerHTML = '<i class="ph ph-pause"></i>';
        nowPlaying.innerText = "Now Playing: " + song.name;

        document.querySelectorAll(".playlist-item").forEach(item => item.classList.remove("active"));
        document.querySelector(`[data-index="${index}"]`)?.classList.add("active");
    }

    playBtn.addEventListener("click", () => {
        if (!audioPlayer.src && currentSongs.length > 0) return playSong(0);
        if (audioPlayer.paused) {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="ph ph-pause"></i>';
        } else {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="ph ph-play"></i>';
        }
    });

    nextBtn.addEventListener("click", () => playSong(isShuffle ? Math.floor(Math.random() * currentSongs.length) : (currentIndex + 1) % currentSongs.length));
    prevBtn.addEventListener("click", () => playSong(currentIndex > 0 ? currentIndex - 1 : currentSongs.length - 1));
    shuffleBtn.addEventListener("click", () => {
        isShuffle = !isShuffle;
        shuffleBtn.style.color = isShuffle ? 'var(--primary-color)' : 'var(--text-primary)';
        showToast(isShuffle ? "Shuffle ON" : "Shuffle OFF");
    });

    audioPlayer.addEventListener("ended", () => nextBtn.click());
    audioPlayer.addEventListener("timeupdate", () => { progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0; });
    progressBar.addEventListener("input", () => { audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration; });

    // --- 10. SETTINGS ---
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

    document.getElementById('api-key-input').addEventListener('change', (e) => {
        appState.settings.apiKey = e.target.value.trim();
        saveState();
        checkAITutorStatus();
        showToast("API Key Saved!");
    });

    document.getElementById('work-duration').addEventListener('change', (e) => {
        appState.settings.workDuration = e.target.value;
        if(isWorkMode && !isTimerRunning) { timeLeft = e.target.value * 60; updateTimerDisplay(); }
        saveState();
    });

    document.getElementById('break-duration').addEventListener('change', (e) => {
        appState.settings.breakDuration = e.target.value;
        if(!isWorkMode && !isTimerRunning) { timeLeft = e.target.value * 60; updateTimerDisplay(); }
        saveState();
    });

    document.getElementById('reset-data-btn').addEventListener('click', () => {
        if(confirm("Delete all data? This cannot be undone.")) {
            localStorage.removeItem('auraState');
            indexedDB.deleteDatabase('StudyMusicDB');
            location.reload();
        }
    });
});
