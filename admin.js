// ==========================================
// EXAM MASTER ADMIN PANEL - පරිපාලක ජාවාස්ක්‍රිප්ට් ගොනුව
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
// ඇතුල්වීම සහ පිටවීම (Auth)
// ==========================================
async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        showDashboard();
        loadData();
        showToast('සාර්ථකව ඇතුල් විය! ✅');
        
    } catch (e) {
        showToast('ඇතුල් වීම අසාර්ථකයි: ' + e.message);
    }
}

async function logout() {
    await supabase.auth.signOut();
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

// Session පරීක්ෂා කිරීම
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        showDashboard();
        loadData();
    }
});

// ==========================================
// දත්ත පූරණය (Load Data)
// ==========================================
function loadData() {
    loadSettings();
    loadNotifications();
    loadQuotes();
}

// ==========================================
// සෘතුමය බලපෑම් (Seasonal Effects Logic)
// ==========================================
async function loadSettings() {
    const { data } = await supabase.from('site_settings').select('*');
    if (data) {
        const snow = data.find(s => s.setting_key === 'snow_effect');
        const confetti = data.find(s => s.setting_key === 'confetti_effect');
        
        if (snow) document.getElementById('snowToggle').checked = snow.is_enabled;
        if (confetti) document.getElementById('confettiToggle').checked = confetti.is_enabled;
    }
}

async function toggleEffect(key, isEnabled) {
    try {
        // පළමුව setting එක තිබේදැයි බලන්න
        const { data } = await supabase.from('site_settings').select('*').eq('setting_key', key);
        
        if (data.length === 0) {
            // නැත්නම් අලුතින් හදන්න
            await supabase.from('site_settings').insert([{ setting_key: key, is_enabled: isEnabled }]);
        } else {
            // යාවත්කාලීන කරන්න
            await supabase.from('site_settings').update({ is_enabled: isEnabled }).eq('setting_key', key);
        }
        
        showToast(`${key} යාවත්කාලීන කරන ලදි!`);
    } catch (e) {
        console.error(e);
        showToast('දෝෂයකි!');
    }
}

// ==========================================
// නිවේදන කළමනාකරණය (Notifications Logic)
// ==========================================
async function sendNotification() {
    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;
    const image = document.getElementById('notifImage').value;
    const pdf = document.getElementById('notifPDF').value;
    const persistent = document.getElementById('notifPersistent').checked; // Checkbox

    if (!title || !message) {
        showToast('මාතෘකාව සහ පණිවිඩය අවශ්‍යයි!');
        return;
    }

    try {
        const { error } = await supabase
            .from('notifications')
            .insert([{
                title: title,
                message: message,
                image_url: image || null,
                pdf_url: pdf || null,
                is_active: true,
                show_until_dismissed: persistent
            }]);

        if (error) throw error;

        showToast('නිවේදනය යවන ලදි! 📢');
        // Clear inputs
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
        document.getElementById('notifImage').value = '';
        document.getElementById('notifPDF').value = '';
        
        loadNotifications();
    } catch (e) {
        showToast('නිවේදනය යැවීමේ දෝෂයක්: ' + e.message);
    }
}

async function loadNotifications() {
    const list = document.getElementById('activeNotifsList');
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (data) {
        list.innerHTML = data.map(n => `
            <div class="list-item">
                <div>
                    <strong>${n.title}</strong><br>
                    <small>${n.created_at.split('T')[0]}</small>
                </div>
                <button class="delete-btn" onclick="window.disableNotification(${n.id})">
                    <i class="fas fa-trash"></i> Disable
                </button>
            </div>
        `).join('');
    }
}

async function disableNotification(id) {
    if (!confirm('මෙම නිවේදනය ඉවත් කිරීමට අවශ්‍යද?')) return;
    
    await supabase.from('notifications').update({ is_active: false }).eq('id', id);
    loadNotifications();
    showToast('නිවේදනය ඉවත් කරන ලදි.');
}

// ==========================================
// වැකි කළමනාකරණය (Quotes Logic)
// ==========================================
async function addQuote() {
    const text = document.getElementById('quoteText').value;
    if (!text) return;
    
    await supabase.from('quotes').insert([{ text: text, is_active: true }]);
    document.getElementById('quoteText').value = '';
    loadQuotes();
    showToast('වැකිය ඇතුලත් කරන ලදි!');
}

async function loadQuotes() {
    const list = document.getElementById('quotesList');
    const { data } = await supabase
        .from('quotes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

    if (data) {
        list.innerHTML = data.map(q => `
            <div class="list-item">
                <div>"${q.text.substring(0, 50)}..."</div>
                <button class="delete-btn" onclick="window.deleteQuote(${q.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

async function deleteQuote(id) {
    if (!confirm('මෙම වැකිය මැකීමට අවශ්‍යද?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    loadQuotes();
}

// ==========================================
// උපයෝගිතා (Utilities)
// ==========================================
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// ==========================================
// Window Object වෙත Function පැවරීම
// ==========================================
window.adminLogin = adminLogin;
window.logout = logout;
window.toggleEffect = toggleEffect;
window.sendNotification = sendNotification;
window.disableNotification = disableNotification;
window.addQuote = addQuote;
window.deleteQuote = deleteQuote;