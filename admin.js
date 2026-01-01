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
// ඇතුල්වීම (Auth Logic)
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
}

// ==========================================
// නිවේදන සහ ගොනු Upload (Notifications & File Upload)
// ==========================================
async function sendNotification() {
    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;
    const fileInput = document.getElementById('uploadFile');
    const persistent = document.getElementById('notifPersistent').checked;
    const btn = document.getElementById('sendBtn');

    if (!title || !message) {
        showToast('මාතෘකාව සහ පණිවිඩය අවශ්‍යයි!');
        return;
    }

    btn.textContent = 'Uploading...';
    btn.disabled = true;

    try {
        let imageUrl = null;
        let pdfUrl = null;

        // ගොනුවක් තෝරා ඇත්නම් Upload කිරීම
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            // Supabase Storage වෙත Upload කිරීම
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Public URL ලබා ගැනීම
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath);

            // ගොනු වර්ගය අනුව URL සැකසීම
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt.toLowerCase())) {
                imageUrl = publicUrl;
            } else if (fileExt.toLowerCase() === 'pdf') {
                pdfUrl = publicUrl;
            }
        }

        // Database වෙත දත්ත ඇතුලත් කිරීම
        const { error } = await supabase
            .from('notifications')
            .insert([{
                title: title,
                message: message,
                image_url: imageUrl,
                pdf_url: pdfUrl,
                is_active: true,
                show_until_dismissed: persistent
            }]);

        if (error) throw error;

        showToast('නිවේදනය සාර්ථකව යවන ලදි! 📢');
        
        // ආකෘති පත්‍රය හිස් කිරීම
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
        document.getElementById('uploadFile').value = '';
        document.getElementById('notifPersistent').checked = false;
        
        loadNotifications();

    } catch (e) {
        console.error(e);
        showToast('දෝෂයක් සිදු විය: ' + e.message);
    } finally {
        btn.textContent = 'Send Notification';
        btn.disabled = false;
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
                    ${n.image_url ? '<br><small style="color:var(--secondary-neon);">[Image Attached]</small>' : ''}
                    ${n.pdf_url ? '<br><small style="color:var(--danger);">[PDF Attached]</small>' : ''}
                </div>
                <button class="delete-btn" onclick="window.disableNotification(${n.id})">
                    <i class="fas fa-trash"></i> ඉවත් කරන්න
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
        // Toggle Logic: එකක් ON කරන විට අනෙක OFF කිරීම (Optional but good UX)
        if (isEnabled) {
            if (key === 'snow_effect') {
                document.getElementById('confettiToggle').checked = false;
                await updateSetting('confetti_effect', false);
            } else {
                document.getElementById('snowToggle').checked = false;
                await updateSetting('snow_effect', false);
            }
        }

        await updateSetting(key, isEnabled);
        showToast(`${key} යාවත්කාලීන කරන ලදි!`);
    } catch (e) {
        console.error(e);
        showToast('දෝෂයකි!');
    }
}

async function updateSetting(key, val) {
    const { data } = await supabase.from('site_settings').select('*').eq('setting_key', key);
    if (data.length === 0) {
        await supabase.from('site_settings').insert([{ setting_key: key, is_enabled: val }]);
    } else {
        await supabase.from('site_settings').update({ is_enabled: val }).eq('setting_key', key);
    }
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
