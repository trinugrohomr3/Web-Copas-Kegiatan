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
const CLOUDINARY_CLOUD_NAME = "dlqvrnjgn";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

let currentView = 'dashboard';
let logs = [];

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
                        <h2 class="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">Halo, Selamat Bekerja!</h2>
                        <p class="text-sm text-outline font-medium max-w-[240px] leading-relaxed">Hari ini ada <span class="text-primary-dim font-bold">${todayLogs.length} kegiatan</span> yang sudah Anda catat.</p>
                    </div>
                    <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                </div>

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
                <div class="grid grid-cols-2 gap-5">
                    <div class="premium-card p-6 rounded-3xl">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400">
                                <span class="material-symbols-outlined text-xl">schedule</span>
                            </div>
                        </div>
                        <p class="font-headline font-black text-3xl text-on-surface tracking-tight">${calculateFocusTime()}</p>
                        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">Estimasi Kerja</p>
                    </div>
                    <div class="premium-card p-6 rounded-3xl">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400">
                                <span class="material-symbols-outlined text-xl">verified</span>
                            </div>
                        </div>
                        <p class="font-headline font-black text-3xl text-on-surface tracking-tight">${calculateTargetProgress()}%</p>
                        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">Pencapaian Hari Ini</p>
                    </div>
                </div>

                <!-- Recent Activities -->
                <section>
                    <div class="flex items-center justify-between mb-6 px-1">
                        <h3 class="font-headline font-extrabold text-lg text-on-surface tracking-tight">Log Terakhir</h3>
                        <button onclick="navigate('riwayat')" class="text-xs font-bold text-primary-dim uppercase tracking-widest border-b-2 border-primary/20 pb-0.5">Semua</button>
                    </div>
                    <div class="space-y-4">
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
                                    <p class="font-body text-[11px] text-outline truncate">${log.location || 'Sudah di kantor'}</p>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-outline py-8 text-sm italic">Belum ada data...</p>'}
                    </div>
                </section>
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
                    <h2 class="text-2xl font-black text-on-surface tracking-tight">Catat Kegiatan</h2>
                    <p class="text-xs font-bold text-outline uppercase tracking-widest">Detail Baru</p>
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
                        <input class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Misal: Kantor Lt 4, Client Side" type="text" id="input-location"/>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Apa yang dikerjakan?</label>
                        <textarea class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none" placeholder="Tuliskan detail pekerjaan Anda..." rows="4" id="input-description" required></textarea>
                    </div>

                    <!-- Photo Upload Section -->
                    <div class="space-y-1.5 pt-2">
                        <label class="text-[10px] font-bold text-outline uppercase tracking-widest px-1">Lampiran Foto (Opsional)</label>
                        <div class="relative bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-primary transition-all cursor-pointer group" onclick="document.getElementById('input-photo').click()">
                            <input type="file" id="input-photo" accept="image/*" class="hidden" onchange="window.handlePhotoPreview(event)"/>
                            
                            <div id="photo-preview-container" class="hidden w-full aspect-video rounded-xl overflow-hidden border border-slate-100 mb-2 relative">
                                <img id="photo-preview" class="w-full h-full object-cover" src=""/>
                                <button type="button" onclick="event.stopPropagation(); window.clearPhoto(event)" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-lg">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div id="upload-placeholder" class="flex flex-col items-center justify-center py-6 text-slate-400 group-hover:text-primary transition-colors">
                                <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary/10">
                                    <span class="material-symbols-outlined text-3xl">add_a_photo</span>
                                </div>
                                <span class="text-[10px] font-black uppercase tracking-widest">Pilih atau Ambil Foto</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-6 pb-12">
                    <button type="submit" class="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:bg-primary-dim active:scale-95 transition-all">
                        Simpan Log
                    </button>
                    <button type="button" onclick="navigate('dashboard')" class="w-full py-4 mt-2 text-outline font-bold text-xs uppercase tracking-widest hover:text-on-surface transition-colors">
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
    if (cat === 'Pekerjaan Kantor') return 'work';
    if (cat === 'Kesehatan') return 'favorite';
    if (cat === 'Pribadi') return 'person';
    return 'list_alt';
}

let viewOrder = ['dashboard', 'riwayat', 'laporan', 'input'];

function navigate(view) {
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

        submitBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan Jurnal...</span>';

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
