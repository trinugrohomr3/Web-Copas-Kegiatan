import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBL8PyPEaZZL93Yh4dT_trFpwV6-vW50Mc",
  authDomain: "laporan-kerja-9af97.firebaseapp.com",
  projectId: "laporan-kerja-9af97",
  storageBucket: "laporan-kerja-9af97.firebasestorage.app",
  messagingSenderId: "755476891963",
  appId: "1:755476891963:web:ae992bb5d5323e21054f1e",
  measurementId: "G-NY6FZ9HN2D"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const logsCollection = collection(db, "logs");

// --- Constants & State ---
let currentView = 'dashboard';
let logs = [];

// --- Utilities ---
async function fetchLogs() {
    try {
        const q = query(logsCollection, orderBy("date", "desc"), orderBy("time", "desc"));
        const querySnapshot = await getDocs(q);
        logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    } catch (error) {
        console.error("Error fetching logs: ", error);
        // Fallback to local storage if needed or show error
        logs = JSON.parse(localStorage.getItem('jurnal_kegiatan_logs')) || [];
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function formatDate(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function getRelativeDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const itemDate = new Date(dateStr).toISOString().split('T')[0];
    
    if (today === itemDate) return 'Hari Ini';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    if (yesterdayDate === itemDate) return 'Kemarin';
    
    return formatDate(dateStr);
}

// --- Templates ---

const templates = {
    dashboard: () => {
        const todayLogs = logs.filter(log => log.date === new Date().toISOString().split('T')[0]);
        const recentLogs = [...logs].sort((a,b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)).slice(0, 3);
        
        return `
            <section class="space-y-8 view-active">
                <!-- Hero Section -->
                <div class="p-8 rounded-lg bg-primary-container text-on-primary-container shadow-sm border border-primary/10">
                    <p class="font-headline text-primary-dim font-semibold tracking-wide text-xs uppercase mb-2">Ringkasan Hari Ini</p>
                    <h2 class="font-headline text-3xl font-extrabold tracking-tight">${todayLogs.length} Aktivitas Tercatat</h2>
                    <p class="mt-4 text-on-surface-variant/80 font-body text-sm leading-relaxed max-w-xs">Konsistensi Anda membangun fondasi untuk kesuksesan hari esok.</p>
                </div>

                <!-- Primary Action -->
                <button onclick="navigate('input')" class="w-full flex items-center justify-between p-6 rounded-lg bg-white border border-surface-container hover:border-primary transition-all duration-200 shadow-sm group">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary-dim group-hover:scale-110 transition-transform">
                            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">add_notes</span>
                        </div>
                        <div class="text-left">
                            <span class="block font-headline font-bold text-lg text-on-surface">Log Kegiatan Baru</span>
                            <span class="block font-body text-xs text-outline">Catat progres Anda sekarang</span>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                </button>

                <!-- Stats -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-surface-container-low p-6 rounded-lg border border-surface-container/50">
                        <span class="material-symbols-outlined text-primary-dim mb-2 text-xl">timer</span>
                        <p class="font-headline font-bold text-2xl text-on-surface">${calculateFocusTime()}</p>
                        <p class="font-label text-xs text-outline font-medium">Waktu Fokus</p>
                    </div>
                    <div class="bg-surface-container-low p-6 rounded-lg border border-surface-container/50">
                        <span class="material-symbols-outlined text-primary-dim mb-2 text-xl">task_alt</span>
                        <p class="font-headline font-bold text-2xl text-on-surface">${calculateTargetProgress()}%</p>
                        <p class="font-label text-xs text-outline font-medium">Target Selesai</p>
                    </div>
                </div>

                <!-- Recent Entries -->
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-headline font-bold text-lg text-on-surface">Aktivitas Terakhir</h3>
                        <button onclick="navigate('riwayat')" class="text-primary font-semibold text-sm hover:underline">Lihat Semua</button>
                    </div>
                    <div class="space-y-4">
                        ${recentLogs.length ? recentLogs.map(log => `
                            <div class="flex items-start gap-4 p-5 rounded-lg border border-surface-container/50 bg-white shadow-sm">
                                <div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-on-surface-variant text-xl">${getIconForCategory(log.category)}</span>
                                </div>
                                <div class="flex-1">
                                    <div class="flex justify-between items-center mb-1">
                                        <h4 class="font-headline font-bold text-on-surface text-sm">${log.description.substring(0, 30)}${log.description.length > 30 ? '...' : ''}</h4>
                                        <span class="font-label text-[10px] text-outline">${log.time}</span>
                                    </div>
                                    <p class="font-body text-xs text-on-surface-variant leading-relaxed">${log.location || 'Tanpa Lokasi'}</p>
                                </div>
                                ${log.photoUrl ? `
                                    <div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                                        <img src="${log.photoUrl}" class="w-full h-full object-cover"/>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('') : '<p class="text-center text-outline py-8">Belum ada aktivitas tercatat.</p>'}
                    </div>
                </section>
            </section>
        `;
    },
    input: () => `
        <section class="view-active">
            <div class="mb-8">
                <h2 class="text-2xl font-bold text-on-surface mb-1">Catat Kegiatan</h2>
                <p class="text-outline text-sm">Lengkapi formulir di bawah untuk mencatat jurnal harian Anda.</p>
            </div>
            <form id="log-form" class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tanggal</label>
                        <div class="relative bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <input class="w-full bg-transparent border-none p-0 text-sm font-medium text-on-surface focus:ring-0" type="date" id="input-date" required value="${new Date().toISOString().split('T')[0]}"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Waktu</label>
                        <div class="relative bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <input class="w-full bg-transparent border-none p-0 text-sm font-medium text-on-surface focus:ring-0" type="time" id="input-time" required value="${new Date().toTimeString().split(' ')[0].substring(0, 5)}"/>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Kategori</label>
                    <select id="input-category" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium text-on-surface">
                        <option value="Kerja">Kerja</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Pribadi">Pribadi</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Lokasi</label>
                    <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                        <input class="w-full bg-transparent border-none p-0 text-sm font-medium text-on-surface placeholder:text-slate-400 focus:ring-0" placeholder="Contoh: Kantor, Lokasi Klien" type="text" id="input-location"/>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Deskripsi Kegiatan</label>
                    <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                <textarea class="w-full bg-transparent border-none p-0 text-sm font-medium text-on-surface placeholder:text-slate-400 focus:ring-0 resize-none" placeholder="Apa yang Anda kerjakan?" rows="4" id="input-description" required></textarea>
                            </div>
                        </div>
                        <!-- Photo Upload Hidden for now
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Unggah Foto (Opsional)</label>
                            <div class="relative bg-slate-50 border border-slate-200 rounded-lg px-3 py-4 focus-within:border-primary border-dashed transition-all cursor-pointer group" onclick="document.getElementById('input-photo').click()">
                                <input type="file" id="input-photo" accept="image/*" class="hidden" onchange="window.handlePhotoPreview(event)"/>
                                <div id="photo-preview-container" class="hidden w-full aspect-video rounded-lg overflow-hidden border border-slate-200 mb-2 relative">
                                    <img id="photo-preview" class="w-full h-full object-cover" src=""/>
                                    <button type="button" onclick="event.stopPropagation(); window.clearPhoto(event)" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                                        <span class="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <div id="upload-placeholder" class="flex flex-col items-center justify-center py-4 text-outline group-hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined text-3xl mb-1">add_a_photo</span>
                                    <span class="text-xs font-bold uppercase tracking-widest">Pilih Foto</span>
                                </div>
                            </div>
                        </div>
                        -->
                        <div class="pt-4">
                    <button type="submit" class="w-full py-4 bg-primary text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary-dim active:scale-95 transition-all">
                        Simpan
                    </button>
                    <button type="button" onclick="navigate('dashboard')" class="w-full py-4 mt-2 text-outline font-bold text-sm hover:text-on-surface-variant transition-colors">
                        Batal
                    </button>
                </div>
            </form>
        </section>
    `,
    riwayat: () => {
        const grouped = logs.reduce((acc, log) => {
            const relDate = getRelativeDate(log.date);
            if (!acc[relDate]) acc[relDate] = [];
            acc[relDate].push(log);
            return acc;
        }, {});

        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'Hari Ini') return -1;
            if (b === 'Hari Ini') return 1;
            if (a === 'Kemarin') return -1;
            if (b === 'Kemarin') return 1;
            return new Date(grouped[b][0].date) - new Date(grouped[a][0].date);
        });

        return `
            <section class="view-active space-y-8">
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-bold text-on-surface">Riwayat Kegiatan</h2>
                    <span class="bg-primary/10 text-primary-dim px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">${logs.length} Total</span>
                </div>
                <div class="space-y-8">
                    ${sortedKeys.length ? sortedKeys.map(key => `
                        <div class="space-y-4">
                            <h3 class="font-headline font-bold text-primary-dim text-xs uppercase tracking-widest pl-1">${key}</h3>
                            <div class="space-y-3">
                                ${grouped[key].sort((a,b) => b.time.localeCompare(a.time)).map(log => `
                                    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
                                        <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-slate-400">${getIconForCategory(log.category)}</span>
                                        </div>
                                        <div class="flex-1">
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="text-[10px] font-bold text-primary-dim uppercase tracking-wider">${log.category}</span>
                                                <span class="text-[10px] text-outline">${log.time}</span>
                                            </div>
                                            <h4 class="font-headline font-bold text-on-surface text-sm mb-1">${log.description}</h4>
                                            <div class="flex items-center gap-1 text-outline">
                                                <span class="material-symbols-outlined text-xs">location_on</span>
                                                <span class="text-[10px]">${log.location || 'N/A'}</span>
                                            </div>
                                            ${log.photoUrl ? `
                                                <div class="mt-3 rounded-xl overflow-hidden border border-slate-100 aspect-video w-full bg-slate-50">
                                                    <img src="${log.photoUrl}" class="w-full h-full object-cover" loading="lazy"/>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <button onclick="copyEntry('${log.description}')" class="text-outline hover:text-primary transition-colors">
                                            <span class="material-symbols-outlined text-lg">content_copy</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('') : '<p class="text-center text-outline py-20">Belum ada riwayat kegiatan.</p>'}
                </div>
            </section>
        `;
    },
    laporan: () => {
        const sortedLogs = [...logs].sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
        
        return `
            <section class="view-active space-y-8">
                <!-- Hero Report -->
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dim p-8 text-white shadow-lg">
                    <div class="relative z-10">
                        <span class="text-xs font-medium opacity-90 mb-2 block uppercase tracking-widest font-label">Ringkasan</span>
                        <h2 class="text-4xl font-headline font-extrabold tracking-tight mb-4">Laporan Bulanan</h2>
                        <p class="max-w-md text-sm opacity-90 font-body leading-relaxed">Ekspor atau salin detail kegiatan bulanan Anda untuk pelaporan rutin.</p>
                    </div>
                    <div class="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                <div class="space-y-6">
                    <div class="flex items-center justify-between px-1">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">list_alt</span>
                            <h3 class="text-lg font-headline font-bold text-on-surface">Detail Aktivitas</h3>
                        </div>
                        <button onclick="copyAllLogs()" class="flex items-center gap-1 text-primary-dim font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity">
                            <span class="material-symbols-outlined text-sm">content_copy</span>
                            Salin Semua
                        </button>
                    </div>

                    <div class="space-y-4">
                        ${sortedLogs.length ? sortedLogs.map((log, idx) => `
                            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="text-[10px] font-bold text-primary-dim uppercase tracking-wider font-label">${log.category}</span>
                                            ${log.photoUrl ? '<span class="material-symbols-outlined text-[12px] text-primary">image</span>' : ''}
                                        </div>
                                        <div class="flex items-center justify-between gap-4">
                                            <h4 class="text-base font-bold text-on-surface font-headline leading-tight">${log.description}</h4>
                                            <button onclick="copyEntry('${log.description}')" class="shrink-0 p-2 text-outline hover:text-primary transition-colors active:scale-90" title="Salin Deskripsi">
                                                <span class="material-symbols-outlined text-lg">content_copy</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                                    <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                                        <div class="overflow-hidden">
                                            <p class="text-[8px] text-outline font-bold uppercase tracking-widest">Tanggal</p>
                                            <p class="text-[11px] font-bold text-on-surface truncate">${log.date}</p>
                                        </div>
                                        <button onclick="copyEntry('${log.date}')" class="text-outline hover:text-primary active:scale-90 ml-2">
                                            <span class="material-symbols-outlined text-[14px]">content_copy</span>
                                        </button>
                                    </div>
                                    <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                                        <div class="overflow-hidden">
                                            <p class="text-[8px] text-outline font-bold uppercase tracking-widest">Waktu</p>
                                            <p class="text-[11px] font-bold text-on-surface truncate">${log.time}</p>
                                        </div>
                                        <button onclick="copyEntry('${log.time}')" class="text-outline hover:text-primary active:scale-90 ml-2">
                                            <span class="material-symbols-outlined text-[14px]">content_copy</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-outline py-12">Tidak ada data untuk laporan.</p>'}
                    </div>

                    ${sortedLogs.length ? `
                        <button onclick="copyAllLogs()" class="w-full bg-primary text-white px-6 py-4 rounded-full flex justify-center items-center gap-3 font-label font-bold hover:bg-primary-dim active:scale-95 transition-all shadow-lg shadow-primary/20 mt-8">
                            <span class="material-symbols-outlined">content_copy</span>
                            <span>Salin Seluruh Laporan</span>
                        </button>
                    ` : ''}
                </div>
            </section>
        `;
    }
};

// --- Logic Functions ---

function calculateFocusTime() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(log => log.date === todayStr);
    // Simple mock logic: each log is ~1.5 hours of focus for demo purposes
    return (todayLogs.length * 1.5).toFixed(1) + 'j';
}

function calculateTargetProgress() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(log => log.date === todayStr);
    const target = 4; // Mock daily target
    return Math.min(Math.round((todayLogs.length / target) * 100), 100);
}

function getIconForCategory(cat) {
    if (cat === 'Kerja') return 'edit_square';
    if (cat === 'Kesehatan') return 'favorite';
    if (cat === 'Pribadi') return 'person';
    return 'list_alt';
}

function navigate(view) {
    currentView = view;
    render();
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-view') === view) {
            item.classList.add('active');
            item.classList.remove('text-outline');
        } else {
            item.classList.remove('active');
            item.classList.add('text-outline');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // If input view, handle form submission
    if (view === 'input') {
        const form = document.getElementById('log-form');
        form.addEventListener('submit', handleAddLog);
    }
}

async function handleAddLog(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</span>';

        const date = document.getElementById('input-date').value;
        const time = document.getElementById('input-time').value;
        const location = document.getElementById('input-location').value;
        const description = document.getElementById('input-description').value;
        const category = document.getElementById('input-category').value;
        // Photo upload commented out
        let photoUrl = "";
        /*
        const photoFile = document.getElementById('input-photo').files[0];
        if (photoFile) {
            const storageRef = ref(storage, `photos/${Date.now()}_${photoFile.name}`);
            const snapshot = await uploadBytes(storageRef, photoFile);
            photoUrl = await getDownloadURL(snapshot.ref);
        }
        */

        const newLog = {
            date,
            time,
            location,
            description,
            category,
            photoUrl,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(logsCollection, newLog);
        logs.unshift({ id: docRef.id, ...newLog });
        
        showToast('Kegiatan berhasil dicatat!');
        navigate('dashboard');
    } catch (error) {
        console.error("Error adding document: ", error);
        showToast('Gagal menyimpan kegiatan. Periksa database rules Anda.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function copyEntry(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Teks disalin: ' + (text.length > 20 ? text.substring(0, 20) + '...' : text));
    });
}

function copyAllLogs() {
    if (!logs.length) return;
    
    const text = logs
        .sort((a,b) => new Date(a.date) - new Date(b.date))
        .map(log => `[${log.date} ${log.time}] (${log.category}) ${log.description} @ ${log.location || '?'}`)
        .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Seluruh laporan disalin ke clipboard');
    });
}

function render() {
    const appContent = document.getElementById('app-content');
    if (templates[currentView]) {
        appContent.innerHTML = templates[currentView]();
    } else {
        appContent.innerHTML = templates.dashboard();
    }
}

// --- Initialization ---

// Expose functions to window (since we're in a module now)
window.navigate = navigate;
window.copyEntry = copyEntry;
window.copyAllLogs = copyAllLogs;
window.handleAddLog = handleAddLog;

window.handlePhotoPreview = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('photo-preview').src = event.target.result;
            document.getElementById('photo-preview-container').classList.remove('hidden');
            document.getElementById('upload-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
};

window.clearPhoto = (e) => {
    e.preventDefault();
    document.getElementById('input-photo').value = "";
    document.getElementById('photo-preview-container').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        navigate(view);
    });
});

// Initialize first view & fetch data
navigate('dashboard');
fetchLogs();
