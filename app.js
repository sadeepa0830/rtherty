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
    // 1. විභාග Countdown පූරණය (Load Countdowns)
    loadExams();
    
    // 2. නිවේදන පරීක්ෂා කිරීම (Check Notifications)
    checkNotifications();
    
    // 3. චැට් පූරණය (Load Chat)
    loadChat();
    
    // 4. සෘතුමය බලපෑම් (Seasonal Effects)
    initEffects();
});

// ==========================================
// 1. විභාග Countdown (Dashboard Logic)
// ==========================================
async function loadExams() {
    try {
        // Supabase වෙතින් සක්‍රිය විභාග ලබා ගැනීම
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (error) throw error;

        const grid = document.getElementById('examGrid');
        
        if (data && data.length > 0) {
            grid.innerHTML = ''; // පවතින දත්ත ඉවත් කිරීම
            
            data.forEach(exam => {
                const card = createCountdownCard(exam);
                grid.appendChild(card);
                startTimerForCard(exam, card);
            });
        } else {
            grid.innerHTML = '<div class="glass-panel" style="grid-column: 1/-1; padding: 20px; text-align: center;">දැනට සක්‍රිය විභාග නොමැත.</div>';
        }
    } catch (e) {
        console.error('Exams Error:', e);
    }
}

function createCountdownCard(exam) {
    const div = document.createElement('div');
    div.className = 'glass-panel countdown-card';
    div.id = `card-${exam.id}`;
    
    div.innerHTML = `
        <h2 style="color: var(--secondary-neon);">${exam.batch_name}</h2>
        <p style="color: var(--text-muted); margin-bottom: 15px;">${new Date(exam.exam_date).toLocaleDateString()}</p>
        
        <div class="timer-display">
            <div class="time-unit">
                <span class="time-val" id="d-${exam.id}">00</span>
                <span class="time-label">දින</span>
            </div>
            <div class="time-unit">
                <span class="time-val" id="h-${exam.id}">00</span>
                <span class="time-label">පැය</span>
            </div>
            <div class="time-unit">
                <span class="time-val" id="m-${exam.id}">00</span>
                <span class="time-label">මිනි</span>
            </div>
            <div class="time-unit">
                <span class="time-val" id="s-${exam.id}">00</span>
                <span class="time-label">තත්</span>
            </div>
        </div>
    `;
    return div;
}

function startTimerForCard(exam, cardElement) {
    const target = new Date(exam.exam_date).getTime();
    
    function update() {
        const now = new Date().getTime();
        const diff = target - now;
        
        if (diff < 0) {
            cardElement.querySelector('.timer-display').innerHTML = '<span style="color: var(--success); font-weight:bold; font-size: 1.5rem;">විභාගය ආරම්භ වී ඇත! 🎉</span>';
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById(`d-${exam.id}`).textContent = d.toString().padStart(2, '0');
        document.getElementById(`h-${exam.id}`).textContent = h.toString().padStart(2, '0');
        document.getElementById(`m-${exam.id}`).textContent = m.toString().padStart(2, '0');
        document.getElementById(`s-${exam.id}`).textContent = s.toString().padStart(2, '0');
    }
    
    update();
    setInterval(update, 1000);
}

// ==========================================
// 2. උසස් නිවේදන පද්ධතිය (Advanced Notifications)
// ==========================================
async function checkNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        activeNotifications = data || [];
        
        // අලුත් නිවේදනයක් තිබේ නම් Badge පෙන්වන්න
        if (activeNotifications.length > 0) {
            const lastSeenId = localStorage.getItem('last_seen_notif');
            const latestId = activeNotifications[0].id;
            
            // Auto Popup for first time or new notification
            if (latestId != lastSeenId && activeNotifications[0].show_until_dismissed) {
                openNotifModal();
            }
            
            document.getElementById('notifBadge').style.display = 'block';
        }
        
    } catch (err) {
        console.error('Notification Error:', err);
    }
}

function openNotifModal() {
    const modal = document.getElementById('notifModal');
    const contentDiv = document.getElementById('modalNotifContent');
    
    // Save as seen
    if (activeNotifications.length > 0) {
        localStorage.setItem('last_seen_notif', activeNotifications[0].id);
    }
    
    if (activeNotifications.length === 0) {
        contentDiv.innerHTML = '<p>දැනට විශේෂ නිවේදන නොමැත.</p>';
    } else {
        // සියලුම නිවේදන පෙන්වන්න
        contentDiv.innerHTML = activeNotifications.map(notif => {
            let mediaContent = '';
            
            // රූපයක් ද? (Image)
            if (notif.image_url) {
                mediaContent += `<img src="${notif.image_url}" class="modal-img" alt="Notification Image">`;
            }
            
            // PDF ගොනුවක් ද? (PDF)
            if (notif.pdf_url) {
                mediaContent += `
                    <div style="margin: 20px 0;">
                        <a href="${notif.pdf_url}" target="_blank" class="pdf-download-btn">
                            <i class="fas fa-file-pdf"></i> PDF බාගත කරන්න
                        </a>
                    </div>
                `;
            }

            return `
                <div style="margin-bottom: 30px; border-bottom: 1px solid var(--glass-border); padding-bottom: 20px;">
                    ${mediaContent}
                    <h2 style="color: var(--secondary-neon); margin-bottom: 10px;">${notif.title}</h2>
                    <p style="line-height: 1.6; white-space: pre-wrap;">${notif.message}</p>
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
}

function closeNotifModal() {
    document.getElementById('notifModal').style.display = 'none';
}

// ==========================================
// 3. චැට් පද්ධතිය (Chat Logic)
// ==========================================
async function loadChat() {
    // නම load කිරීම
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) document.getElementById('chatName').value = savedName;

    fetchComments();

    // Real-time subscription
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
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        box.innerHTML = '';
        data.forEach(comment => appendComment(comment));
        scrollToBottom();
    } catch (err) {
        console.error('Chat Error:', err);
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
    
    localStorage.setItem('chat_user_name', name);
    
    try {
        await supabase.from('comments').insert([{ user_name: name, message: message }]);
        msgInput.value = '';
    } catch (err) {
        alert('දෝෂයකි. නැවත උත්සාහ කරන්න.');
    }
}

// ==========================================
// 4. සෘතුමය බලපෑම් (Effects Logic - Snow/Confetti)
// ==========================================
async function initEffects() {
    effectCanvas = document.getElementById('effectCanvas');
    effectCtx = effectCanvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    try {
        const { data } = await supabase.from('site_settings').select('*');
        
        if (data) {
            const snow = data.find(s => s.setting_key === 'snow_effect');
            const confetti = data.find(s => s.setting_key === 'confetti_effect');
            
            if (snow && snow.is_enabled) startSnowEffect();
            else if (confetti && confetti.is_enabled) startConfettiEffect();
        }
    } catch (e) {
        console.log('Effects Error:', e);
    }
}

function resizeCanvas() {
    effectCanvas.width = window.innerWidth;
    effectCanvas.height = window.innerHeight;
}

// Snow Effect Implementation
function startSnowEffect() {
    const particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * effectCanvas.width,
        y: Math.random() * effectCanvas.height,
        r: Math.random() * 3 + 1,
        d: Math.random() * 50
    }));
    
    function draw() {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
        effectCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
        effectCtx.beginPath();
        
        particles.forEach(p => {
            effectCtx.moveTo(p.x, p.y);
            effectCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
        });
        
        effectCtx.fill();
        update();
        requestAnimationFrame(draw);
    }
    
    function update() {
        particles.forEach(p => {
            p.y += Math.cos(p.d) + 1 + p.r / 2;
            if (p.y > effectCanvas.height) {
                p.y = -5;
                p.x = Math.random() * effectCanvas.width;
            }
        });
    }
    draw();
}

// Confetti Effect Implementation
function startConfettiEffect() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
    const particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * effectCanvas.width,
        y: Math.random() * effectCanvas.height - effectCanvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        speed: Math.random() * 5 + 2,
        angle: Math.random() * 360
    }));
    
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
        requestAnimationFrame(draw);
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
// Window Object වෙත Function පැවරීම (Crucial)
// ==========================================
window.openNotifModal = openNotifModal;
window.closeNotifModal = closeNotifModal;
window.sendComment = sendComment;