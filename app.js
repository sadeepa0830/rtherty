// ==========================================
// EXAM MASTER SL - ප්‍රධාන යෙදුම් ගොනුව (Main Application File)
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// වින්‍යාස කිරීම් (Configuration)
// ==========================================
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ==========================================
// ගෝලීය විචල්‍යයන් (Global Variables)
// ==========================================
let activeNotifications = [];
let effectCanvas = null;
let effectCtx = null;
let effectAnimationId = null;

// ==========================================
// ආරම්භක සැකසුම් (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. තේමාව පූරණය කිරීම (Load Theme)
    loadTheme();
    
    // 2. විභාග දත්ත ලබා ගැනීම (Fetch Exams)
    loadExams();
    
    // 3. නිවේදන පරීක්ෂා කිරීම (Check Notifications)
    checkNotifications();
    
    // 4. අදහස් දැක්වීම් පූරණය (Load Comments)
    loadComments();
    
    // 5. සෘතුමය බලපෑම් (Seasonal Effects)
    initEffects();
    
    // 6. දෛනික වැකිය (Daily Quote)
    loadDailyQuote();
});

// ==========================================
// 1. UI සහ තේමා (UI & Theming)
// ==========================================
function loadTheme() {
    // localStorage වෙතින් සුරැකූ තේමාව ලබා ගැනීම, නැතිනම් 'midnight'
    const savedTheme = localStorage.getItem('exam-master-theme') || 'midnight';
    document.body.setAttribute('data-theme', savedTheme);
}

function setTheme(themeName) {
    // නව තේමාව යෙදීම
    document.body.setAttribute('data-theme', themeName);
    // localStorage හි සුරැකීම
    localStorage.setItem('exam-master-theme', themeName);
    // Modal එක වැසීම
    toggleThemeModal();
}

function toggleThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
    }
}

// ==========================================
// 2. නිවේදන (Notifications Logic)
// ==========================================
async function checkNotifications() {
    try {
        // සක්‍රිය නිවේදන ලබා ගැනීම
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        activeNotifications = data || [];
        updateNotificationBadge();
    } catch (err) {
        console.error('Notification Error:', err);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    
    if (activeNotifications.length > 0) {
        // අන්තිමට බැලූ notification ID එක
        const lastSeenId = localStorage.getItem('last_seen_notif');
        const latestId = activeNotifications[0].id;
        
        // අලුත් එකක් තිබේ නම් Red Dot පෙන්වන්න
        if (latestId != lastSeenId) {
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } else {
        badge.style.display = 'none';
    }
}

function openNotifModal() {
    const modal = document.getElementById('notifModal');
    const contentDiv = document.getElementById('modalNotifContent');
    
    // Red Dot ඉවත් කිරීම (අපි දැන් බලන නිසා)
    if (activeNotifications.length > 0) {
        localStorage.setItem('last_seen_notif', activeNotifications[0].id);
        document.getElementById('notifBadge').style.display = 'none';
    }
    
    // Modal එක පිරවීම
    if (activeNotifications.length === 0) {
        contentDiv.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">දැනට විශේෂ නිවේදන නොමැත.</p>';
    } else {
        contentDiv.innerHTML = activeNotifications.map(notif => `
            <div style="margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">
                ${notif.image_url ? `<img src="${notif.image_url}" class="notif-img" alt="Notification Image">` : ''}
                <h3 style="color: var(--accent-color); margin-bottom: 0.5rem;">${notif.title}</h3>
                <p style="white-space: pre-wrap; margin-bottom: 1rem;">${notif.message}</p>
                ${notif.pdf_url ? `<a href="${notif.pdf_url}" target="_blank" class="chat-btn" style="display:inline-block; text-decoration:none; text-align:center;">PDF බාගත කරන්න <i class="fas fa-download"></i></a>` : ''}
            </div>
        `).join('');
    }
    
    modal.style.display = 'flex';
}

function closeNotifModal() {
    document.getElementById('notifModal').style.display = 'none';
}

// ==========================================
// 3. අදහස් දැක්වීම් (Comments Logic)
// ==========================================
async function loadComments() {
    // නම load කිරීම
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) document.getElementById('chatName').value = savedName;

    fetchComments();

    // Real-time subscription (සරල polling හෝ subscription)
    // Supabase Realtime භාවිතා කිරීම වඩා හොඳයි
    supabase
        .channel('public:comments')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            appendComment(payload.new);
        })
        .subscribe();
}

async function fetchComments() {
    const box = document.getElementById('chatBox');
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true }) // පැරණි ඒවා උඩට
            .limit(50);

        if (error) throw error;

        box.innerHTML = '';
        data.forEach(comment => appendComment(comment));
        scrollToBottom();
    } catch (err) {
        console.error('Comments Load Error:', err);
        box.innerHTML = '<p>කතාබහ පූරණය කළ නොහැක.</p>';
    }
}

function appendComment(comment) {
    const box = document.getElementById('chatBox');
    const myName = localStorage.getItem('chat_user_name');
    const isMe = comment.user_name === myName;
    
    const div = document.createElement('div');
    div.className = `chat-msg ${isMe ? 'user' : 'other'}`;
    
    const time = new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
        <span class="chat-meta">${comment.user_name} • ${time}</span>
        ${comment.message}
    `;
    
    box.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const box = document.getElementById('chatBox');
    box.scrollTop = box.scrollHeight;
}

async function sendComment() {
    const nameInput = document.getElementById('chatName');
    const msgInput = document.getElementById('chatMessage');
    
    const name = nameInput.value.trim();
    const message = msgInput.value.trim();
    
    if (!name || !message) {
        alert('කරුණාකර නම සහ පණිවිඩය ඇතුලත් කරන්න.');
        return;
    }
    
    // නම සුරැකීම
    localStorage.setItem('chat_user_name', name);
    
    try {
        const { error } = await supabase
            .from('comments')
            .insert([{ user_name: name, message: message }]);
            
        if (error) throw error;
        
        msgInput.value = ''; // Input clear
    } catch (err) {
        alert('පණිවිඩය යැවීමට නොහැකි විය.');
        console.error(err);
    }
}

// ==========================================
// 4. අභිප්‍රේරණය (Motivation Logic)
// ==========================================
async function loadDailyQuote() {
    try {
        const { data } = await supabase
            .from('quotes')
            .select('*')
            .eq('is_active', true);
            
        if (data && data.length > 0) {
            const index = new Date().getDate() % data.length;
            const quote = data[index];
            const quoteEl = document.getElementById('dailyQuote');
            quoteEl.textContent = `"${quote.text}"`;
            
            // දිග වැඩි නම් "Read More" පෙන්වීම
            if (quote.text.length > 100) {
                document.getElementById('readMoreBtn').style.display = 'inline-block';
            } else {
                document.getElementById('readMoreBtn').style.display = 'none';
            }
        }
    } catch (e) {
        console.log('Quote Error', e);
    }
}

function toggleQuote() {
    const el = document.getElementById('dailyQuote');
    const btn = document.getElementById('readMoreBtn');
    
    el.classList.toggle('expanded');
    
    if (el.classList.contains('expanded')) {
        btn.textContent = 'Show Less';
    } else {
        btn.textContent = 'Read More';
    }
}

// ==========================================
// 5. සෘතුමය බලපෑම් (Seasonal Effects Logic)
// ==========================================
async function initEffects() {
    effectCanvas = document.getElementById('effectCanvas');
    effectCtx = effectCanvas.getContext('2d');
    
    // Canvas ප්‍රමාණය සැකසීම
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    try {
        // Admin සැකසුම් ලබා ගැනීම
        const { data } = await supabase
            .from('site_settings')
            .select('*');
            
        if (data) {
            const snow = data.find(s => s.setting_key === 'snow_effect');
            const confetti = data.find(s => s.setting_key === 'confetti_effect');
            
            if (snow && snow.is_enabled) {
                startSnowEffect();
            } else if (confetti && confetti.is_enabled) {
                startConfettiEffect();
            }
        }
    } catch (e) {
        console.log('Effects Error', e);
    }
}

function resizeCanvas() {
    effectCanvas.width = window.innerWidth;
    effectCanvas.height = window.innerHeight;
}

// සරල හිම ආචරණය (Snow Effect)
function startSnowEffect() {
    const particles = [];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height,
            r: Math.random() * 3 + 1,
            d: Math.random() * particleCount
        });
    }
    
    function draw() {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
        effectCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
        effectCtx.beginPath();
        
        for (let i = 0; i < particleCount; i++) {
            const p = particles[i];
            effectCtx.moveTo(p.x, p.y);
            effectCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
        }
        effectCtx.fill();
        update();
        effectAnimationId = requestAnimationFrame(draw);
    }
    
    function update() {
        for (let i = 0; i < particleCount; i++) {
            const p = particles[i];
            p.y += Math.cos(p.d) + 1 + p.r / 2;
            p.x += Math.sin(0);
            
            if (p.y > effectCanvas.height) {
                particles[i] = { x: Math.random() * effectCanvas.width, y: -10, r: p.r, d: p.d };
            }
        }
    }
    
    draw();
}

// සරල කොන්ෆෙටි ආචරණය (Confetti Effect)
function startConfettiEffect() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
    const particles = [];
    
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height - effectCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 5 + 2,
            angle: Math.random() * 360
        });
    }
    
    function draw() {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        particles.forEach(p => {
            effectCtx.save();
            effectCtx.translate(p.x, p.y);
            effectCtx.rotate(p.angle * Math.PI / 180);
            effectCtx.fillStyle = p.color;
            effectCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            effectCtx.restore();
        });
        
        update();
        effectAnimationId = requestAnimationFrame(draw);
    }
    
    function update() {
        particles.forEach(p => {
            p.y += p.speed;
            p.angle += 2;
            
            if (p.y > effectCanvas.height) {
                p.y = -20;
                p.x = Math.random() * effectCanvas.width;
            }
        });
    }
    
    draw();
}

// ==========================================
// 6. විභාග Countdown (පෙර තිබූ කේතය අනුව)
// ==========================================
async function loadExams() {
    try {
        const { data } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (data && data.length > 0) {
            const list = document.getElementById('examGrid');
            list.innerHTML = '';
            
            data.forEach(exam => {
                const btn = document.createElement('button');
                btn.className = 'glass-card'; // Reuse style
                btn.style.padding = '10px';
                btn.style.minWidth = '120px';
                btn.style.border = '1px solid var(--accent-color)';
                btn.style.cursor = 'pointer';
                btn.style.textAlign = 'center';
                
                btn.innerHTML = `
                    <div style="font-size: 1.5rem;">${exam.icon || '📚'}</div>
                    <div style="font-weight: bold; margin-top: 5px;">${exam.batch_name}</div>
                `;
                
                btn.onclick = () => selectExam(exam);
                list.appendChild(btn);
            });
            
            // Default selection
            selectExam(data[0]);
        }
    } catch (e) {
        console.error('Exams Error', e);
    }
}

let countdownInterval = null;

function selectExam(exam) {
    document.getElementById('examBadgeText').textContent = `${exam.batch_name} - තව කොපමණ කල්ද?`;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    const target = new Date(exam.exam_date).getTime();
    
    function update() {
        const now = new Date().getTime();
        const diff = target - now;
        
        if (diff < 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('days').textContent = d.toString().padStart(2, '0');
        document.getElementById('hours').textContent = h.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = m.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = s.toString().padStart(2, '0');
    }
    
    update();
    countdownInterval = setInterval(update, 1000);
}

// ==========================================
// Window Object වෙත Function පැවරීම (Crucial)
// ==========================================
window.setTheme = setTheme;
window.toggleThemeModal = toggleThemeModal;
window.openNotifModal = openNotifModal;
window.closeNotifModal = closeNotifModal;
window.sendComment = sendComment;
window.toggleQuote = toggleQuote;
