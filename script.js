const API_URL = 'https://script.google.com/macros/s/AKfycbwMMlDtThv9Uo06NIbaxwi5AtA394HSOtf6wr3bjotj4Ociqh4rpGind8TYISRvU3pD/exec';

// --- PENGATURAN LOGIN ---
const AUTH_CONFIG = {
    username: 'admin',
    password: 'kenshiro2026'
};

// State Management
let state = {
    masterData: [],
    attendanceData: [],
    currentView: 'dashboard',
    loading: false,
    selectedDudis: []
};

// DOM Elements
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const loadingOverlay = document.getElementById('loading-overlay');
const dashboardAttendanceList = document.getElementById('dashboard-attendance-list');
const harianList = document.getElementById('harian-list');
const masterList = document.getElementById('master-list');
const globalSearch = document.getElementById('global-search');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupModals();
    checkAuth();
});

function initApplication() {
    setupDatePickers();
    fetchInitialData();
    setupSearch();
    
    // Refresh buttons
    const refreshAll = () => {
        state.attendanceData = [];
        fetchInitialData();
    };
    
    if (document.getElementById('refresh-dashboard')) document.getElementById('refresh-dashboard').addEventListener('click', refreshAll);
    if (document.getElementById('btn-refresh-dashboard')) document.getElementById('btn-refresh-dashboard').addEventListener('click', refreshAll);
    if (document.getElementById('btn-share-absent')) document.getElementById('btn-share-absent').addEventListener('click', shareAbsentToWA);
    if (document.getElementById('btn-fetch-harian')) document.getElementById('btn-fetch-harian').addEventListener('click', fetchHarianData);
    if (document.getElementById('btn-export-pdf')) document.getElementById('btn-export-pdf').addEventListener('click', exportRekapToPDF);

    // Dashboard Filters
    document.getElementById('dashboard-date-filter').addEventListener('change', fetchInitialData);

    // DUDI Persistence Buttons
    document.getElementById('btn-save-dudi').addEventListener('click', () => {
        console.log('Saving DUDIs:', state.selectedDudis);
        localStorage.setItem('savedDudis', JSON.stringify(state.selectedDudis));
        
        const btn = document.getElementById('btn-save-dudi');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Tersimpan!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = 'var(--primary-color)';
        }, 2000);
    });

    document.getElementById('btn-clear-dudi').addEventListener('click', () => {
        if (confirm('Hapus semua lokasi terpilih?')) {
            state.selectedDudis = [];
            localStorage.removeItem('savedDudis');
            renderDudiTags();
            handleDudiChange();
        }
    });
    
    // Initial UI Setup
    loadSavedDudis();
    renderDudiTags();
}

function loadSavedDudis() {
    const saved = localStorage.getItem('savedDudis');
    if (saved) {
        try {
            state.selectedDudis = JSON.parse(saved);
            console.log('Restored saved DUDIs:', state.selectedDudis);
        } catch (e) {
            console.error('Error loading saved DUDIs', e);
        }
    }
}

window.handleDudiLiveSearch = function(query) {
    const resultsList = document.getElementById('dudi-search-results');
    if (!resultsList) return;

    try {
        const rawTerm = query.trim();
        const term = rawTerm.toLowerCase().replace(/[\s\.]/g, ''); 
        
        if (!term) {
            resultsList.style.display = 'none';
            return;
        }

        console.log('Searching for:', term);

        // Check if master data is ready
        if (!state.masterData || state.masterData.length === 0) {
            resultsList.innerHTML = '<div class="search-result-item">Data belum siap...</div>';
            resultsList.style.display = 'block';
            return;
        }

        // Extract unique DUDIs safely
        const uniqueDudis = [...new Set(state.masterData.map(s => {
            const d = s.dudi || s.DUDI || s.Lokasi || '';
            return d.toString().trim();
        }))].filter(Boolean).sort();

        // Search in DUDI names
        let dudis = uniqueDudis
            .filter(d => {
                const normDudi = d.toLowerCase().replace(/[\s\.]/g, '');
                return normDudi.includes(term) && !state.selectedDudis.includes(d);
            });

        // FALLBACK: Search in Student names
        if (dudis.length === 0) {
            const matchedDudisFromSiswa = state.masterData
                .filter(s => {
                    const nama = s.nama || s.Nama || s.NAMA || '';
                    const normNama = nama.toString().toLowerCase().replace(/[\s\.]/g, '');
                    return normNama.includes(term);
                })
                .map(s => (s.dudi || s.DUDI || s.Lokasi || '').toString().trim())
                .filter(d => d && !state.selectedDudis.includes(d));
            
            dudis = [...new Set(matchedDudisFromSiswa)].sort();
        }

        if (dudis.length > 0) {
            resultsList.innerHTML = '';
            dudis.forEach(dudi => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = dudi;
                item.onclick = (ev) => {
                    ev.stopPropagation();
                    addDudiTag(dudi);
                };
                resultsList.appendChild(item);
            });
            resultsList.style.display = 'block';
        } else {
            resultsList.innerHTML = '<div class="search-result-item" style="color: #64748b;">❌ Tidak ditemukan "' + rawTerm + '"</div>';
            resultsList.style.display = 'block';
        }
    } catch (err) {
        console.error('Search error:', err);
    }
};

window.addDudiTag = function(dudi) {
    if (state.selectedDudis.includes(dudi)) return;
    
    state.selectedDudis.push(dudi);
    renderDudiTags();
    
    // Clear search
    const searchInput = document.getElementById('dudi-live-search');
    const resultsList = document.getElementById('dudi-search-results');
    if (searchInput) searchInput.value = '';
    if (resultsList) resultsList.style.display = 'none';
    
    handleDudiChange();
};

window.removeDudiTag = function(dudi) {
    state.selectedDudis = state.selectedDudis.filter(d => d !== dudi);
    renderDudiTags();
    handleDudiChange();
};

function renderDudiTags() {
    const tagsArea = document.getElementById('selected-tags');
    tagsArea.innerHTML = '';
    
    state.selectedDudis.forEach(dudi => {
        const tag = document.createElement('div');
        tag.className = 'dudi-tag';
        tag.innerHTML = `
            ${dudi}
            <i class="fas fa-times" onclick="removeDudiTag('${dudi}')"></i>
        `;
        tagsArea.appendChild(tag);
    });
}

function handleDudiChange() {
    // If we have selected items but no data yet, fetch it
    if (state.selectedDudis.length > 0 && state.attendanceData.length === 0) {
        fetchInitialData();
    } else {
        // Otherwise just update the view locally
        updateDashboardStats();
        renderDashboardTable();
    }
}

// Navigation Logic
function setupNavigation() {
    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Sidebar View Switching
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            switchView(targetView);
            
            // Close sidebar on mobile after clicking
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewId) {
    state.currentView = viewId;
    views.forEach(view => {
        if (view.id === `${viewId}-view`) {
            view.classList.remove('hidden');
        } else {
            view.classList.add('hidden');
        }
    });

    if (viewId === 'datasiswa' && state.masterData.length === 0) fetchMasterData();
}

// Data Fetching
async function fetchWithStats(url) {
    const start = performance.now();
    try {
        const response = await fetch(url);
        const end = performance.now();
        const latency = Math.round(end - start);
        
        // Try to get size
        let size = 0;
        const reader = response.clone().body.getReader();
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            size += value.length;
        }
        
        console.log('API Request completed in', latency, 'ms');
        updateNetworkUI(latency, size);
        updateStatusUI(true);
        return response;
    } catch (error) {
        updateStatusUI(false);
        throw error;
    }
}

function updateNetworkUI(latency, sizeInBytes) {
    const sizeKB = (sizeInBytes / 1024).toFixed(1);
    const latencySec = latency / 1000;
    const speedKbs = latencySec > 0 ? (sizeKB / latencySec).toFixed(1) : 0;

    document.getElementById('net-latency').innerHTML = `<i class="fas fa-bolt"></i> ${latency} ms`;
    document.getElementById('net-size').innerHTML = `<i class="fas fa-download"></i> ${sizeKB} KB`;
    
    const speedEl = document.getElementById('connection-speed');
    if (speedEl) {
        speedEl.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${speedKbs} KB/s`;
        
        // Change color based on speed
        speedEl.className = 'status-indicator';
        if (speedKbs > 100) speedEl.classList.add('online');
        else if (speedKbs > 20) speedEl.classList.add('warning');
        else speedEl.classList.add('danger');
    }
}

function updateStatusUI(isOnline) {
    const el = document.getElementById('connection-speed');
    if (el && !isOnline) {
        el.className = 'status-indicator danger';
        el.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Terputus';
    }
}

async function fetchInitialData() {
    showLoading(true);
    try {
        // Step 1: Always fetch master data first to get DUDI list
        if (state.masterData.length === 0) {
            const masterRes = await fetchWithStats(`${API_URL}?action=master`);
            const masterData = await masterRes.json();
            state.masterData = masterData.master || [];
            console.log('Master Data Loaded:', state.masterData.length, 'records');
            renderMasterTable();
        }
        
        // Step 2: Check if DUDI is selected
        if (state.selectedDudis.length === 0) {
            // Don't fetch attendance yet
            state.attendanceData = [];
            updateDashboardStats();
            renderDashboardTable();
            showLoading(false);
            return;
        }

        // Step 3: Fetch attendance only after DUDI is selected
        const apiDate = document.getElementById('dashboard-date-filter').value || getTodayDate();
        
        const attendanceRes = await fetchWithStats(`${API_URL}?action=harian&tanggal=${apiDate}`);
        const attendanceData = await attendanceRes.json();
        state.attendanceData = attendanceData.attendance || [];
        console.log('Attendance Data Loaded:', state.attendanceData.length, 'records for', apiDate);
        
        updateDashboardStats();
        renderDashboardTable();
        renderMasterTable();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Gagal mengambil data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function fetchHarianData() {
    const rawDate = document.getElementById('harian-date-picker').value;
    if (!rawDate) return;
    
    showLoading(true);
    try {
        const res = await fetchWithStats(`${API_URL}?action=harian&tanggal=${rawDate}`);
        const data = await res.json();
        const attendance = data.attendance || [];
        renderHarianTable(attendance);
        showLoading(false);
    } catch (error) {
        console.error('Harian Fetch Error:', error);
        showLoading(false);
    }
}

// Master list render
async function fetchMasterData() {
    showLoading(true);
    try {
        const res = await fetchWithStats(`${API_URL}?action=master`);
        const data = await res.json();
        state.masterData = data.master || [];
        renderMasterTable();
    } catch (error) {
        console.error('Error fetching master data:', error);
    } finally {
        showLoading(false);
    }
}

function renderMasterTable() {
    const list = document.getElementById('master-list');
    if (list) {
        list.innerHTML = '';
        state.masterData.forEach(siswa => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${siswa.nama}</td>
                <td>${siswa.kelas}</td>
                <td>${siswa.dudi}</td>
            `;
            list.appendChild(tr);
        });
    }
}

async function fetchHarianData() {
    const tanggal = document.getElementById('harian-date-picker').value;
    if (!tanggal) return alert('Pilih tanggal terlebih dahulu.');
    
    showLoading(true);
    try {
        const res = await fetchWithStats(`${API_URL}?action=harian&tanggal=${tanggal}`);
        const data = await res.json();
        renderHarianTable(data.attendance || []);
    } catch (error) {
        alert('Gagal memuat data harian.');
    } finally {
        showLoading(false);
    }
}

// Rendering Logic
function updateDashboardStats() {
    if (state.selectedDudis.length === 0) {
        document.getElementById('stat-hadir').textContent = '-';
        document.getElementById('stat-izin').textContent = '-';
        document.getElementById('stat-alfa').textContent = '-';
        document.getElementById('stat-total-siswa').textContent = '-';
        return;
    }

    // Filter master data by selected DUDIs
    const filteredMaster = state.masterData.filter(s => state.selectedDudis.includes(s.dudi));
    
    // Filter attendance data by looking up DUDI from master data for each student
    const filteredAttendance = state.attendanceData.filter(record => {
        const studentName = (record.nama || '').toString().trim().toLowerCase();
        // Find this student in master to get their DUDI
        const studentMaster = state.masterData.find(m => (m.nama || '').toString().trim().toLowerCase() === studentName);
        if (!studentMaster) return false;

        const studentDudi = (studentMaster.dudi || '').toString().trim().toLowerCase();
        return state.selectedDudis.some(s => s.toLowerCase().trim() === studentDudi);
    });

    const presentCount = filteredAttendance.filter(r => {
        const s = (r.status || r['status kehadiran'] || '').toLowerCase();
        return s.includes('hadir');
    }).length;

    const excuseCount = filteredAttendance.filter(r => {
        const s = (r.status || r['status kehadiran'] || '').toLowerCase();
        return s.includes('izin') || s.includes('sakit');
    }).length;
    
    const totalSiswa = filteredMaster.length;
    const absentCount = totalSiswa - filteredAttendance.length;

    document.getElementById('stat-hadir').textContent = presentCount;
    document.getElementById('stat-izin').textContent = excuseCount;
    document.getElementById('stat-alfa').textContent = Math.max(0, absentCount);
    document.getElementById('stat-total-siswa').textContent = totalSiswa;

    // Also update the detailed absent students table
    renderAbsentStudentsTable(filteredMaster, filteredAttendance);
}

function renderAbsentStudentsTable(filteredMaster, filteredAttendance) {
    const list = document.getElementById('absent-students-list');
    const badge = document.getElementById('absent-count-badge');
    if (!list) return;

    list.innerHTML = '';
    const presentNames = new Set(filteredAttendance.map(a => (a.nama || '').toLowerCase().trim()));
    const absentStudents = filteredMaster.filter(m => !presentNames.has((m.nama || '').toLowerCase().trim()));
    
    if (badge) badge.textContent = absentStudents.length;

    if (absentStudents.length === 0) {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem; color: #10b981;">✅ Semua siswa di lokasi ini sudah presensi.</td></tr>';
        return;
    }

    absentStudents.forEach(siswa => {
        const tr = document.createElement('tr');
        
        // Create WA Message
        const waText = encodeURIComponent(`Halo, menginfokan bahwa siswa kami atas nama *${siswa.nama}* di lokasi *${siswa.dudi}* belum melakukan presensi harian. jangan lupa untuk presensi pada jam kerja. terimakasih`);
        const waUrl = `https://wa.me/?text=${waText}`;

        tr.innerHTML = `
            <td><strong>${siswa.nama}</strong></td>
            <td><span style="font-size: 0.85rem; color: var(--text-muted)">${siswa.dudi}</span></td>
            <td style="text-align:center">
                <a href="${waUrl}" target="_blank" class="btn-refresh" style="background: #25d366; color: white; padding: 4px 10px; font-size: 0.75rem; text-decoration: none; border-radius: 4px; display: inline-block;">
                    <i class="fab fa-whatsapp"></i> Hubungi
                </a>
            </td>
        `;
        list.appendChild(tr);
    });
}

function renderDashboardTable() {
    const list = document.getElementById('dashboard-attendance-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (state.selectedDudis.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted)">Silakan pilih lokasi DUDI untuk melihat data presensi.</td></tr>';
        return;
    }

    // Filter records by looking up student's DUDI in master data
    const filteredData = state.attendanceData.filter(record => {
        const studentName = (record.nama || '').toString().trim().toLowerCase();
        const studentMaster = state.masterData.find(m => (m.nama || '').toString().trim().toLowerCase() === studentName);
        if (!studentMaster) return false;

        const studentDudi = (studentMaster.dudi || '').toString().trim().toLowerCase();
        return state.selectedDudis.some(s => s.toLowerCase().trim() === studentDudi);
    });
    
    if (filteredData.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Tidak ada data presensi untuk lokasi terpilih pada tanggal ini.</td></tr>';
        return;
    }

    // Show latest 50, reversed
    const latest = [...filteredData].reverse().slice(0, 50);

    latest.forEach(r => {
        const tr = document.createElement('tr');
        const nama = r.nama || r.Nama || r.NAMA || '-';
        const waktu = r.waktu || r.Waktu || r.Jam || extractTime(r.timestamp) || '-';
        const status = r.status || r['status kehadiran'] || 'Hadir';
        
        // Photo rendering logic
        const photoData = r['kode foto'] || r.foto;
        const photoHtml = photoData ? 
            `<img src="data:image/jpeg;base64,${photoData}" class="img-thumbnail" onclick="openPhoto('data:image/jpeg;base64,${photoData}', '${nama}')" style="cursor:pointer; width:40px; height:40px; object-fit:cover; border-radius:50%; border: 2px solid var(--border-color);">` : 
            `<div style="width:40px; height:40px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#94a3b8; margin:auto;"><i class="fas fa-user"></i></div>`;

        // Find DUDI for display from master
        const studentMaster = state.masterData.find(m => (m.nama || '').toString().trim().toLowerCase() === nama.toLowerCase().trim());
        const dudi = studentMaster ? studentMaster.dudi : '-';
        
        const keterangan = r.keterangan || r.alasan || '-';

        tr.innerHTML = `
            <td style="text-align:center">${photoHtml}</td>
            <td><strong>${nama}</strong></td>
            <td>${waktu}</td>
            <td><span style="font-size: 0.85rem; color: var(--text-muted)">${dudi}</span></td>
            <td><span class="status-badge ${status.toLowerCase().includes('hadir') ? 'online' : 'warning'}">${status}</span></td>
            <td><div style="max-width:150px; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${keterangan}">${keterangan}</div></td>
        `;
        list.appendChild(tr);
    });
}

function renderHarianTable(data) {
    const list = document.getElementById('harian-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (state.selectedDudis.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted)">Silakan pilih dan "Set" lokasi DUDI di Dashboard terlebih dahulu.</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Tidak ada data untuk tanggal ini.</td></tr>';
        return;
    }

    // Filter data to only include students from SELECTED DUDIs
    const filteredData = data.filter(record => {
        const studentName = (record.nama || record.Nama || '').toString().trim().toLowerCase();
        const studentMaster = state.masterData.find(m => (m.nama || '').toString().trim().toLowerCase() === studentName);
        if (!studentMaster) return false;

        const studentDudi = (studentMaster.dudi || '').toString().trim().toLowerCase();
        return state.selectedDudis.some(s => s.toLowerCase().trim() === studentDudi);
    });

    if (filteredData.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Tidak ada presensi dari lokasi terpilih untuk tanggal ini.</td></tr>';
        return;
    }

    filteredData.forEach(record => {
        const tr = document.createElement('tr');
        
        // Map fields from actual JSON
        const nama = record.nama || record.Nama || 'Tanpa Nama';
        const kelas = record.kelas || '-';
        const rawStatus = record['status kehadiran'] || record.status || '-';
        const keterangan = record.keterangan || record.alasan || '-';
        const photoData = record['kode foto'] || record.foto;
        
        const photoHtml = photoData ? 
            `<img src="data:image/jpeg;base64,${photoData}" class="img-thumbnail" onclick="openPhoto('data:image/jpeg;base64,${photoData}', '${nama}')" style="cursor:pointer; width:50px; height:50px; object-fit:cover;">` : 
            '<i class="fas fa-image" style="color:#cbd5e1; font-size: 1.5rem;"></i>';
        
        // Resolve DUDI from master
        const studentMaster = state.masterData.find(m => (m.nama || '').toString().trim().toLowerCase() === nama.toLowerCase().trim());
        const dudi = studentMaster ? studentMaster.dudi : '-';

        tr.innerHTML = `
            <td style="text-align:center">${photoHtml}</td>
            <td><div style="font-weight:600">${nama}</div><div style="font-size:0.7rem; color:var(--text-muted)">${kelas}</div></td>
            <td>${dudi}</td>
            <td>${extractTime(record.timestamp)}</td>
            <td><span class="status-badge ${rawStatus.toLowerCase().includes('hadir') ? 'online' : 'warning'}">${rawStatus}</span></td>
            <td><div style="max-width:150px; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${keterangan}">${keterangan}</div></td>
        `;
        list.appendChild(tr);
    });
}

function renderMasterTable() {
    masterList.innerHTML = '';
    state.masterData.forEach(siswa => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:500">${siswa.nama}</td>
            <td>${siswa.dudi || '-'}</td>
        `;
        masterList.appendChild(tr);
    });
}

// Helpers
function showLoading(show) {
    state.loading = show;
    const overlay = document.getElementById('loading-overlay');
    const pctEl = document.getElementById('loading-pct');
    
    if (show) {
        overlay.classList.remove('hidden');
        pctEl.textContent = '0%';
        simulateProgress();
    } else {
        pctEl.textContent = '100%';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function simulateProgress() {
    let progress = 0;
    const pctEl = document.getElementById('loading-pct');
    
    const interval = setInterval(() => {
        if (!state.loading) {
            clearInterval(interval);
            return;
        }
        
        // Slow down as it approaches 99%
        if (progress < 90) progress += Math.random() * 15;
        else if (progress < 99) progress += Math.random() * 1;
        
        pctEl.textContent = Math.floor(progress) + '%';
    }, 150);
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function extractTime(timestamp) {
    if (!timestamp) return '-';
    // Handle spreadsheet date strings
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return timestamp.split(' ')[1] || timestamp;
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return timestamp;
    }
}

function getBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('hadir')) return 'badge-hadir';
    if (s.includes('izin')) return 'badge-izin';
    if (s.includes('sakit')) return 'badge-sakit';
    return 'badge-alfa';
}

function setupDatePickers() {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7);
    
    document.getElementById('dashboard-date-filter').value = today;
    document.getElementById('harian-date-picker').value = today;
    if (document.getElementById('rekap-month-picker')) {
        document.getElementById('rekap-month-picker').value = currentMonth;
    }
    document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    // Add listener for harian date picker
    document.getElementById('harian-date-picker').addEventListener('change', fetchHarianData);
}

function setupSearch() {
    globalSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.view:not(.hidden) tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

function setupModals() {
    const modal = document.getElementById('photo-modal');
    const closeBtn = document.querySelector('.close-modal');
    
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };

    // Footer Buttons
    document.getElementById('btn-refresh-page').addEventListener('click', () => location.reload());
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Authentication Logic
function checkAuth() {
    const isLoggedIn = localStorage.getItem('kenshiro_logged_in');
    if (isLoggedIn === 'true') {
        document.getElementById('login-view').style.display = 'none';
        initApplication();
    } else {
        document.getElementById('login-view').style.display = 'flex';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    // Validasi menggunakan CONFIG di atas
    if (user === AUTH_CONFIG.username && pass === AUTH_CONFIG.password) {
        localStorage.setItem('kenshiro_logged_in', 'true');
        errorEl.style.display = 'none';
        checkAuth();
    } else {
        errorEl.style.display = 'block';
    }
}

function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        localStorage.removeItem('kenshiro_logged_in');
        location.reload(); // Refresh to reset state
    }
}

function openPhoto(src, name) {
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const caption = document.getElementById('modal-caption');
    
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    modalImg.src = src;
    caption.textContent = `Bukti Presensi: ${name}`;
}

function shareAbsentToWA() {
    if (state.selectedDudis.length === 0) {
        alert('Silakan pilih DUDI terlebih dahulu.');
        return;
    }

    const presentNames = new Set(state.attendanceData.map(a => (a.nama || '').toLowerCase().trim()));
    const filteredMaster = state.masterData.filter(s => state.selectedDudis.includes(s.dudi));
    const absentStudents = filteredMaster.filter(m => !presentNames.has((m.nama || '').toLowerCase().trim()));

    if (absentStudents.length === 0) {
        alert('Semua siswa di lokasi terpilih sudah presensi.');
        return;
    }

    // Group by DUDI for nice message
    const grouped = {};
    absentStudents.forEach(s => {
        if (!grouped[s.dudi]) grouped[s.dudi] = [];
        grouped[s.dudi].push(s.nama);
    });

    let message = `*REKAP SISWA BELUM PRESENSI*\nTanggal: ${document.getElementById('dashboard-date-filter').value}\n\n`;
    
    for (const dudi in grouped) {
        message += `📍 *${dudi}*:\n`;
        grouped[dudi].forEach((nama, idx) => {
            message += `${idx + 1}. ${nama}\n`;
        });
        message += `\n`;
    }

    message += `jangan lupa untuk presensi pada jam kerja. terimakasih`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}


