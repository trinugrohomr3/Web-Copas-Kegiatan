import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
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
const CLOUDINARY_CLOUD_NAME = "dlqvrnjgn";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

let currentView = 'dashboard';
let currentFilter = 'all';
let customDateRange = { start: '', end: '' };
let logs = [];
let isEditMode = false;
let editingLogId = null;
let currentModalImageUrl = '';

// --- Utilities ---
async function fetchLogs() {
    try {
        // Disederhanakan menjadi satu orderBy saja untuk menghindari error "Composite Index Required"
        const q = query(logsCollection, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Data berhasil diambil:", logs.length, "records");
        render();
    } catch (error) {
        console.error("Error fetching logs: ", error);
        // Tunjukkan link error index jika ada di console
        showToast("Gagal memuat data. Cek console browser untuk link pembuatan index.");
        logs = JSON.parse(localStorage.getItem('jurnal_kegiatan_logs')) || [];
        render();
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
            <section class="space-y-10">
                <!-- Welcome/Hero -->
                <div class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-container via-white to-primary/5 p-8 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                    <div class="relative z-10">
                        <div class="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1 rounded-full border border-white mb-4">
                            <span class="w-1.5 h-1.5 rounded-full bg-primary-dim animate-pulse"></span>
                            <span class="text-[10px] font-bold text-primary-dim uppercase tracking-widest">Sistem Aktif</span>
                        </div>
                        <h2 class="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">Halo Putri, Selamat Bekerja!</h2>
                        <p class="text-sm text-outline font-medium max-w-[240px] leading-relaxed">Hari ini ada <span class="text-primary-dim font-bold">${todayLogs.length} kegiatan</span> yang sudah Anda catat.</p>
                    </div>
                    <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                </div>

                <!-- Dashboard Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <!-- Column 1: Small Stats & Action -->
                    <div class="lg:col-span-4 space-y-6">
                        <!-- Main Action Card -->
                        <div class="premium-card p-2 rounded-[1.8rem] bg-slate-50">
                            <button onclick="navigate('input')" class="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white border border-slate-100 hover:border-primary transition-all duration-300 shadow-sm group">
                                <div class="flex items-center gap-5">
                                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-dim group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">add_circle</span>
                                    </div>
                                    <div class="text-left">
                                        <span class="block font-headline font-extrabold text-xl text-on-surface tracking-tight">Catat Baru</span>
                                        <span class="block font-body text-xs text-outline font-medium mt-0.5">Input progres kegiatan Anda</span>
                                    </div>
                                </div>
                                <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-all">
                                    <span class="material-symbols-outlined">arrow_forward</span>
                                </div>
                            </button>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="premium-card p-5 rounded-3xl">
                                <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
                                    <span class="material-symbols-outlined text-lg">schedule</span>
                                </div>
                                <p class="font-headline font-black text-2xl text-on-surface tracking-tight">${calculateFocusTime()}</p>
                                <p class="text-[9px] font-bold text-outline uppercase tracking-widest mt-1">Estimasi Kerja</p>
                            </div>
                            <div class="premium-card p-5 rounded-3xl">
                                <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-400 mb-3">
                                    <span class="material-symbols-outlined text-lg">verified</span>
                                </div>
                                <p class="font-headline font-black text-2xl text-on-surface tracking-tight">${calculateTargetProgress()}%</p>
                                <p class="text-[9px] font-bold text-outline uppercase tracking-widest mt-1">Pencapaian</p>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Recent Activities -->
                    <div class="lg:col-span-8">
                        <div class="flex items-center justify-between mb-6 px-1">
                            <h3 class="font-headline font-extrabold text-lg text-on-surface tracking-tight">Log Terakhir</h3>
                            <button onclick="navigate('laporan')" class="text-xs font-bold text-primary-dim uppercase tracking-widest border-b-2 border-primary/20 pb-0.5">Semua</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${recentLogs.length ? recentLogs.map(log => `
                                <div class="premium-card flex items-center gap-4 p-4 rounded-2xl hover:border-primary/30 transition-all cursor-pointer">
                                    <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-on-surface-variant/50 shrink-0">
                                        <span class="material-symbols-outlined text-2xl">${getIconForCategory(log.category)}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex justify-between items-center mb-0.5">
                                            <h4 class="font-headline font-bold text-on-surface text-sm truncate pr-2">${log.description}</h4>
                                            <span class="text-[10px] font-bold text-outline whitespace-nowrap">${log.time}</span>
                                        </div>
                                        <p class="font-body text-[11px] text-outline truncate">${log.location || 'N/A'}</p>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-center text-outline py-8 text-sm italic col-span-full">Belum ada data...</p>'}
                        </div>
                    </div>
                </div>
            </section>
        `;
    },
    input: () => `
        <section class="space-y-10">
            <div class="flex items-center gap-4">
                <button onclick="navigate('dashboard')" class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-outline hover:text-primary transition-all">
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h2 class="text-2xl font-black text-on-surface tracking-tight">${isEditMode ? 'Edit Kegiatan' : 'Catat Kegiatan'}</h2>
                    <p class="text-xs font-bold text-outline uppercase tracking-widest">${isEditMode ? 'Update Data' : 'Detail Baru'}</p>
                </div>
            </div>

            <form id="log-form" class="space-y-8">
                <!-- Group 1: Time & Identity -->
                <div class="premium-card p-6 rounded-3xl space-y-6">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-primary text-lg">event_available</span>
                        <h3 class="text-xs font-bold text-on-surface uppercase tracking-widest">Waktu & Kategori</h3>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Tanggal</label>
                            <input class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all" type="date" id="input-date" required value="${new Date().toISOString().split('T')[0]}"/>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Waktu</label>
                            <input class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all" type="time" id="input-time" required value="${new Date().toTimeString().split(' ')[0].substring(0, 5)}"/>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Kategori Kegiatan</label>
                        <select id="input-category" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                            <option value="Kerja">💼 Pekerjaan Kantor</option>
                            <option value="Kesehatan">🏥 Kesehatan / Istirahat</option>
                            <option value="Pribadi">🏠 Urusan Pribadi</option>
                            <option value="Lainnya">📝 Lain-lain</option>
                        </select>
                    </div>
                </div>

                <!-- Group 2: Context Detail -->
                <div class="premium-card p-6 rounded-3xl space-y-6">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-primary text-lg">description</span>
                        <h3 class="text-xs font-bold text-on-surface uppercase tracking-widest">Detail Progres</h3>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Lokasi</label>
                        <input class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Misal: Kantor Lt 4, Client Side" type="text" id="input-location" list="location-list"/>
                        <datalist id="location-list">
                            <option value="Sudin PPAPP">
                            <option value="Kantor Kecamatan Tj. Priok">
                        </datalist>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Apa yang dikerjakan?</label>
                        <textarea class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none" placeholder="Tuliskan detail pekerjaan Anda..." rows="4" id="input-description" required></textarea>
                    </div>

                    <!-- Photo Upload Section -->
                    <div class="space-y-1.5 pt-2">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Lampiran Foto (Opsional)</label>
                        <div class="block relative bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-primary transition-all cursor-pointer group min-h-[120px] flex items-center justify-center overflow-hidden">
                            
                            <div id="photo-preview-container" class="hidden w-full aspect-video rounded-xl overflow-hidden border border-slate-100 mb-2 relative">
                                <img id="photo-preview" class="w-full h-full object-cover" src=""/>
                                <button type="button" onclick="event.stopPropagation(); window.clearPhoto(event)" class="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-all shadow-xl z-[40]">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div id="upload-placeholder" class="flex flex-col items-center justify-center py-6 text-slate-400 group-hover:text-primary transition-colors">
                                <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary/10">
                                    <span class="material-symbols-outlined text-3xl">add_a_photo</span>
                                </div>
                                <span class="text-[10px] font-black uppercase tracking-widest">Pilih atau Ambil Foto</span>
                            </div>
                            <input type="file" id="input-photo" accept="image/jpeg,image/png,image/gif" class="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer" style="display: block !important;" onchange="window.handlePhotoPreview(event)"/>
                        </div>
                    </div>
                </div>

                <div class="pt-6 pb-12">
                    <button type="submit" class="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:bg-primary-dim active:scale-95 transition-all">
                        ${isEditMode ? 'Simpan Perubahan' : 'Simpan Log'}
                    </button>
                    <button type="button" onclick="navigate('dashboard')" class="w-full py-4 mt-2 text-outline font-bold text-xs uppercase tracking-widest hover:text-on-surface transition-colors">
                        Batal
                    </button>
                </div>
            </form>
        </section>
    `,
    laporan: () => {
        const filteredLogs = getFilteredLogs();
        let currentDate = null;
        
        return `
            <section class="space-y-8 pb-20">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-black text-on-surface tracking-tight">Laporan Kerja</h2>
                        <p class="text-xs font-bold text-outline uppercase tracking-widest mt-1">Export & Analisa Data</p>
                    </div>
                    <button onclick="exportToExcel()" class="bg-primary text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-primary/20 hover:bg-primary-dim active:scale-95 transition-all text-sm">
                        <span class="material-symbols-outlined text-lg">download</span>
                        <span>Export ke Excel</span>
                    </button>
                </div>

                <!-- Filter Bar -->
                <div class="premium-card p-4 rounded-3xl overflow-x-auto">
                    <div class="flex items-center gap-2 min-w-max">
                        <button onclick="applyFilter('all')" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${currentFilter === 'all' ? 'active' : 'bg-slate-50 text-outline'}">Semua</button>
                        <button onclick="applyFilter('today')" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${currentFilter === 'today' ? 'active' : 'bg-slate-50 text-outline'}">Hari Ini</button>
                        <button onclick="applyFilter('week')" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${currentFilter === 'week' ? 'active' : 'bg-slate-50 text-outline'}">Minggu Ini</button>
                        <button onclick="applyFilter('month')" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${currentFilter === 'month' ? 'active' : 'bg-slate-50 text-outline'}">Bulan Ini</button>
                        <button onclick="openCustomRange()" class="filter-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${currentFilter === 'range' ? 'active' : 'bg-slate-50 text-outline'}">Custom Range</button>
                    </div>

                    ${currentFilter === 'range' ? `
                        <div class="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                            <input type="date" id="range-start" value="${customDateRange.start}" onchange="updateCustomRange()" class="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-outline">
                            <span class="text-outline text-xs font-bold">s/d</span>
                            <input type="date" id="range-end" value="${customDateRange.end}" onchange="updateCustomRange()" class="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-outline">
                        </div>
                    ` : ''}
                </div>

                <!-- Report Table -->
                <div class="report-container premium-card p-2">
                    <div class="overflow-x-auto">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th class="w-12">No</th>
                                    <th class="w-32">Waktu</th>
                                    <th class="w-32">Kategori</th>
                                    <th>Detail Kegiatan</th>
                                    <th class="w-32">Lokasi</th>
                                    <th class="w-20">Foto</th>
                                    <th class="w-16 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredLogs.length ? filteredLogs.map((log, idx) => {
                                    let divider = '';
                                    if (log.date !== currentDate) {
                                        currentDate = log.date;
                                        divider = `
                                            <tr class="date-sep">
                                                <td colspan="7" class="bg-slate-50/50 py-3 px-6 text-[10px] font-black text-primary-dim uppercase tracking-[0.2em] border-y border-slate-100/50">
                                                    <div class="flex items-center gap-2">
                                                        <span class="material-symbols-outlined text-sm">calendar_today</span>
                                                        ${formatDate(log.date)}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }
                                    return divider + `
                                        <tr>
                                            <td class="text-center font-mono opacity-40 text-[10px]">${idx + 1}</td>
                                            <td>
                                                <div class="font-bold text-xs">${log.time}</div>
                                            </td>
                                            <td>
                                                <span class="px-2 py-1 rounded-md bg-slate-50 text-[10px] border border-slate-100 font-bold">${log.category}</span>
                                            </td>
                                            <td class="leading-relaxed whitespace-pre-wrap py-4">${log.description}</td>
                                            <td class="text-outline text-[10px] font-medium">${log.location || '-'}</td>
                                            <td>
                                                ${log.photoUrl ? `
                                                    <div onclick="openImageModal('${log.photoUrl}')" class="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm transition-transform hover:scale-150 hover:z-50 relative cursor-pointer">
                                                        <img src="${log.photoUrl}" class="w-full h-full object-cover" />
                                                    </div>
                                                ` : '<span class="text-outline text-[10px] opacity-30 italic">No Photo</span>'}
                                            </td>
                                            <td class="text-center">
                                                <div class="flex items-center justify-center gap-2">
                                                    <button onclick="handleEditLog('${log.id}')" class="text-outline hover:text-primary transition-all active:scale-90" title="Edit">
                                                        <span class="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onclick="handleDeleteLog('${log.id}')" class="text-outline hover:text-red-500 transition-all active:scale-90" title="Hapus">
                                                        <span class="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') : '<tr><td colspan="7" class="text-center py-20 text-outline italic">Tidak ada data yang sesuai filter...</td></tr>'}
                            </tbody>
                        </table>
                    </div>
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
    if (cat === 'Pekerjaan Kantor') return 'work';
    if (cat === 'Kesehatan') return 'favorite';
    if (cat === 'Pribadi') return 'person';
    return 'list_alt';
}

let viewOrder = ['dashboard', 'laporan', 'input'];

function navigate(view) {
    // Reset Edit Mode when navigating
    if (view !== 'input') {
        isEditMode = false;
        editingLogId = null;
    }
    const oldIndex = viewOrder.indexOf(currentView);
    const newIndex = viewOrder.indexOf(view);
    const direction = newIndex > oldIndex ? 'slide-in-right' : 'slide-in-left';
    
    currentView = view;
    
    const appContent = document.getElementById('app-content');
    
    // Add transition class
    appContent.classList.remove('slide-in-right', 'slide-in-left');
    void appContent.offsetWidth; // Trigger reflow
    appContent.classList.add(direction);
    
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
        if (form) form.addEventListener('submit', handleAddLog);
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
        
        let photoUrl = "";
        
        // Upload to Cloudinary if photo exists
        const photoFile = document.getElementById('input-photo').files[0];
        if (photoFile) {
            submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Mengunggah Foto...</span>';
            
            const formData = new FormData();
            formData.append('file', photoFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Gagal mengunggah foto ke Cloudinary');
            const data = await response.json();
            photoUrl = data.secure_url;
        }

        const newLog = {
            date,
            time,
            location,
            description,
            category,
            photoUrl,
            createdAt: new Date().toISOString()
        };

        if (isEditMode) {
            submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Memperbarui...</span>';
            const logRef = doc(db, "logs", editingLogId);
            await updateDoc(logRef, newLog);
            
            // Update local state
            const index = logs.findIndex(l => l.id === editingLogId);
            if (index !== -1) logs[index] = { id: editingLogId, ...newLog };
            
            showToast('Kegiatan diperbarui!');
        } else {
            submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</span>';
            const docRef = await addDoc(logsCollection, newLog);
            logs.unshift({ id: docRef.id, ...newLog });
            showToast('Kegiatan berhasil dicatat!');
        }
        
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

// --- Helper & Filter Functions ---

function getFilteredLogs() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return logs.filter(log => {
        const logDate = new Date(log.date);
        logDate.setHours(0,0,0,0);
        
        if (currentFilter === 'today') {
            return logDate.getTime() === today.getTime();
        }
        if (currentFilter === 'week') {
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay());
            return logDate >= firstDayOfWeek && logDate <= today;
        }
        if (currentFilter === 'month') {
            return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
        }
        if (currentFilter === 'range') {
            const start = customDateRange.start ? new Date(customDateRange.start) : null;
            const end = customDateRange.end ? new Date(customDateRange.end) : null;
            if (start) start.setHours(0,0,0,0);
            if (end) end.setHours(23,59,59,999);
            
            if (start && end) return logDate >= start && logDate <= end;
            if (start) return logDate >= start;
            if (end) return logDate <= end;
        }
        return true; // "all"
    }).sort((a,b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
}

function applyFilter(type) {
    currentFilter = type;
    render();
}

function openCustomRange() {
    currentFilter = 'range';
    render();
}

function updateCustomRange() {
    customDateRange.start = document.getElementById('range-start').value;
    customDateRange.end = document.getElementById('range-end').value;
    render();
}

async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function exportToExcel() {
    const filteredLogs = getFilteredLogs();
    if (!filteredLogs.length) {
        showToast("Tidak ada data untuk diexport!");
        return;
    }

    showToast("Menyiapkan Excel... (Mohon tunggu)");
    
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Kegiatan');

        // Setup Columns
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal', key: 'date', width: 15 },
            { header: 'Waktu', key: 'time', width: 10 },
            { header: 'Kategori', key: 'category', width: 15 },
            { header: 'Kegiatan', key: 'description', width: 50 },
            { header: 'Lokasi', key: 'location', width: 20 },
            { header: 'Foto', key: 'photo', width: 20 }
        ];

        // Header Styling
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Data
        for (let i = 0; i < filteredLogs.length; i++) {
            const log = filteredLogs[i];
            const rowIndex = i + 2;
            const row = worksheet.addRow({
                no: i + 1,
                date: log.date,
                time: log.time,
                category: log.category,
                description: log.description,
                location: log.location || '-'
            });

            row.height = 60; // Fixed height for thumbnail
            row.alignment = { vertical: 'middle', wrapText: true };

            // Embed Image if exists
            if (log.photoUrl) {
                try {
                    const base64 = await fetchImageAsBase64(log.photoUrl);
                    const imageId = workbook.addImage({
                        base64: base64,
                        extension: 'jpeg',
                    });
                    worksheet.addImage(imageId, {
                        tl: { col: 6, row: rowIndex - 1 },
                        ext: { width: 60, height: 60 },
                        editAs: 'oneCell'
                    });
                } catch (e) {
                    console.error("Gagal memuat gambar untuk Excel:", e);
                }
            }
        }

        // Save File
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Laporan_Kegiatan_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Excel berhasil diunduh!");
        
    } catch (error) {
        console.error("Export Error:", error);
        showToast("Gagal export excel. Silakan coba lagi.");
    }
}

async function handleDeleteLog(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini secara permanen?")) return;

    try {
        showToast("Menghapus...");
        const docRef = doc(db, "logs", id);
        await deleteDoc(docRef);
        
        // Update local state
        logs = logs.filter(log => log.id !== id);
        render();
        showToast("Catatan berhasil dihapus.");
    } catch (error) {
        console.error("Error deleting document: ", error);
        showToast("Gagal menghapus catatan. Cek koneksi Anda.");
    }
}

async function handleEditLog(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;

    isEditMode = true;
    editingLogId = id;
    
    navigate('input');
    
    // Fill the form after navigation (template rendering)
    setTimeout(() => {
        document.getElementById('input-date').value = log.date;
        document.getElementById('input-time').value = log.time;
        document.getElementById('input-category').value = log.category;
        document.getElementById('input-location').value = log.location || "";
        document.getElementById('input-description').value = log.description;
        
        if (log.photoUrl) {
            const preview = document.getElementById('photo-preview');
            const container = document.getElementById('photo-preview-container');
            const placeholder = document.getElementById('upload-placeholder');
            if (preview) preview.src = log.photoUrl;
            if (container) container.classList.remove('hidden');
            if (placeholder) placeholder.classList.add('hidden');
        }
    }, 100);
}

// Expose functions to window
window.applyFilter = applyFilter;
window.openCustomRange = openCustomRange;
window.updateCustomRange = updateCustomRange;
window.exportToExcel = exportToExcel;
window.handleDeleteLog = handleDeleteLog;
window.handleEditLog = handleEditLog;

// --- Image Modal Logic ---

function openImageModal(url) {
    currentModalImageUrl = url;
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    modalImg.src = url;
    modal.classList.add('show');
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('show');
    currentModalImageUrl = '';
}

async function downloadImage() {
    if (!currentModalImageUrl) return;
    try {
        showToast("Mengunduh...");
        const response = await fetch(currentModalImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jurnal_kegiatan_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast("Unduhan dimulai.");
    } catch (e) {
        window.open(currentModalImageUrl, '_blank');
        showToast("Membuka gambar di tab baru.");
    }
}

async function copyImageToClipboard() {
    if (!currentModalImageUrl) return;
    try {
        showToast("Menyalin foto...");
        const response = await fetch(currentModalImageUrl);
        const blob = await response.blob();
        
        // Browser compatibility check
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            showToast("Foto berhasil disalin!");
        } else {
            throw new Error('Clipboard API not available');
        }
    } catch (e) {
        // Fallback: Copy URL
        navigator.clipboard.writeText(currentModalImageUrl).then(() => {
            showToast("Link foto disalin (Clipboard API tidak support foto).");
        });
    }
}

// Expose to window
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.downloadImage = downloadImage;
window.copyImageToClipboard = copyImageToClipboard;

// Initialize first view & fetch data
navigate('dashboard');
fetchLogs();
