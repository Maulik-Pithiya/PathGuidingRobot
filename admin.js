// =====================================================================
// admin.js — RoboNav Admin Analytics Dashboard
//
// Read-only — fetches all documents from Firestore 'visitors' collection
// and renders stats, charts, and a recent visitors table.
// =====================================================================


// --- DOM References ---
var valTotalNav = document.getElementById('valTotalNav');
var valUniqueVisitors = document.getElementById('valUniqueVisitors');
var valTopDest = document.getElementById('valTopDest');
var valTopDestCount = document.getElementById('valTopDestCount');
var valTopRoute = document.getElementById('valTopRoute');
var valTopRouteCount = document.getElementById('valTopRouteCount');
var visitorsTableBody = document.getElementById('visitorsTableBody');
var tableCount = document.getElementById('tableCount');
var lastRefreshed = document.getElementById('lastRefreshed');

var filterDestination = document.getElementById('filterDestination');
var filterSource = document.getElementById('filterSource');
var resetFiltersBtn = document.getElementById('resetFiltersBtn');

// --- Chart instances (so we can destroy and recreate on filter) ---
var buildingsChart = null;
var routesChart = null;

// --- All visitor data (fetched once) ---
var allVisitors = [];


// =====================================================================
// SECTION 1: FETCH DATA FROM FIRESTORE
// =====================================================================

function fetchVisitors() {
    if (!window.firebaseReady) {
        window.onFirebaseReady = fetchVisitors;
        return;
    }

    var firestore = window.firestoreDB;
    var collection = window.firestoreCollection;
    var getDocs = window.firestoreGetDocs;
    var query = window.firestoreQuery;
    var orderBy = window.firestoreOrderBy;

    // Fetch all documents from 'visitors' collection, ordered by timestamp desc
    var visitorsRef = collection(firestore, 'visitors');
    var q = query(visitorsRef, orderBy('timestamp', 'desc'));

    getDocs(q)
        .then(function (snapshot) {
            allVisitors = [];
            snapshot.forEach(function (doc) {
                var data = doc.data();
                data._id = doc.id;
                allVisitors.push(data);
            });

            console.log('✅ Fetched ' + allVisitors.length + ' visitor records');

            // Populate filter dropdowns
            populateFilters(allVisitors);

            // Render everything
            renderDashboard(allVisitors);

            // Update last refreshed
            var now = new Date();
            lastRefreshed.textContent = 'Refreshed: ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        })
        .catch(function (error) {
            console.error('❌ Failed to fetch visitors:', error);
            valTotalNav.textContent = 'Error';
            visitorsTableBody.innerHTML =
                '<tr><td colspan="6" class="text-center py-12 text-red-400/70 text-sm font-medium">' +
                'Failed to load data. Check Firestore rules and connection.</td></tr>';
        });
}


// =====================================================================
// SECTION 2: POPULATE FILTER DROPDOWNS
// =====================================================================

function populateFilters(visitors) {
    var destinations = {};
    var sources = {};

    visitors.forEach(function (v) {
        if (v.toName) destinations[v.toName] = true;
        if (v.fromName) sources[v.fromName] = true;
    });

    // Clear existing options (keep first "All" option)
    filterDestination.innerHTML = '<option value="">All Destinations</option>';
    filterSource.innerHTML = '<option value="">All Sources</option>';

    Object.keys(destinations).sort().forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterDestination.appendChild(opt);
    });

    Object.keys(sources).sort().forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterSource.appendChild(opt);
    });
}


// =====================================================================
// SECTION 3: FILTER LOGIC
// =====================================================================

function getFilteredVisitors() {
    var destFilter = filterDestination.value;
    var srcFilter = filterSource.value;

    return allVisitors.filter(function (v) {
        if (destFilter && v.toName !== destFilter) return false;
        if (srcFilter && v.fromName !== srcFilter) return false;
        return true;
    });
}

filterDestination.addEventListener('change', function () {
    renderDashboard(getFilteredVisitors());
});

filterSource.addEventListener('change', function () {
    renderDashboard(getFilteredVisitors());
});

resetFiltersBtn.addEventListener('click', function () {
    filterDestination.value = '';
    filterSource.value = '';
    renderDashboard(allVisitors);
});


// =====================================================================
// SECTION 4: RENDER DASHBOARD
// =====================================================================

function renderDashboard(visitors) {
    renderStats(visitors);
    renderBuildingsChart(visitors);
    renderRoutesChart(visitors);
    renderTable(visitors);
}


// --- Stats Cards ---
function renderStats(visitors) {
    // Total navigations
    valTotalNav.textContent = visitors.length;

    // Unique visitors (by name, case-insensitive)
    var uniqueNames = {};
    visitors.forEach(function (v) {
        if (v.name) uniqueNames[v.name.trim().toLowerCase()] = true;
    });
    valUniqueVisitors.textContent = Object.keys(uniqueNames).length;

    // Most visited destination
    var destCounts = {};
    visitors.forEach(function (v) {
        if (v.toName) {
            destCounts[v.toName] = (destCounts[v.toName] || 0) + 1;
        }
    });

    var topDest = getTopKey(destCounts);
    if (topDest) {
        valTopDest.textContent = topDest.key;
        valTopDestCount.textContent = topDest.count + ' visits';
    } else {
        valTopDest.textContent = '—';
        valTopDestCount.textContent = '';
    }

    // Most popular route
    var routeCounts = {};
    visitors.forEach(function (v) {
        if (v.fromName && v.toName) {
            var routeKey = v.fromName + ' → ' + v.toName;
            routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
        }
    });

    var topRoute = getTopKey(routeCounts);
    if (topRoute) {
        valTopRoute.textContent = topRoute.key;
        valTopRouteCount.textContent = topRoute.count + ' times';
    } else {
        valTopRoute.textContent = '—';
        valTopRouteCount.textContent = '';
    }
}


// Helper: get key with highest count from an object
function getTopKey(obj) {
    var maxKey = null;
    var maxCount = 0;
    for (var key in obj) {
        if (obj[key] > maxCount) {
            maxCount = obj[key];
            maxKey = key;
        }
    }
    return maxKey ? { key: maxKey, count: maxCount } : null;
}


// =====================================================================
// SECTION 5: CHARTS
// =====================================================================

// Shared Chart.js theme defaults
var chartColors = [
    'rgba(99, 102, 241, 0.7)',    // indigo
    'rgba(59, 130, 246, 0.7)',    // blue
    'rgba(139, 92, 246, 0.7)',    // violet
    'rgba(6, 182, 212, 0.7)',     // cyan
    'rgba(16, 185, 129, 0.7)',    // emerald
    'rgba(245, 158, 11, 0.7)',    // amber
    'rgba(236, 72, 153, 0.7)',    // pink
];

var chartBorderColors = [
    'rgba(99, 102, 241, 1)',
    'rgba(59, 130, 246, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(6, 182, 212, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(236, 72, 153, 1)',
];

var chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(15, 15, 25, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            titleColor: 'rgba(255,255,255,0.9)',
            bodyColor: 'rgba(255,255,255,0.6)',
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: {
                color: 'rgba(255,255,255,0.4)',
                font: { family: 'Inter', size: 11, weight: '500' },
                maxRotation: 30,
            },
            border: { display: false },
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: {
                color: 'rgba(255,255,255,0.35)',
                font: { family: 'JetBrains Mono', size: 11 },
                precision: 0,
            },
            border: { display: false },
        }
    }
};


// --- Visits per building (toName) ---
function renderBuildingsChart(visitors) {
    var counts = {};
    visitors.forEach(function (v) {
        if (v.toName) {
            counts[v.toName] = (counts[v.toName] || 0) + 1;
        }
    });

    // Sort by count descending
    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
    var labels = sorted.map(function (e) { return e[0]; });
    var data = sorted.map(function (e) { return e[1]; });

    // Destroy old chart if exists
    if (buildingsChart) buildingsChart.destroy();

    var ctx = document.getElementById('chartBuildings').getContext('2d');
    buildingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Visits',
                data: data,
                backgroundColor: labels.map(function (_, i) { return chartColors[i % chartColors.length]; }),
                borderColor: labels.map(function (_, i) { return chartBorderColors[i % chartBorderColors.length]; }),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: JSON.parse(JSON.stringify(chartDefaults))
    });
}


// --- Top 5 routes (fromName → toName) ---
function renderRoutesChart(visitors) {
    var counts = {};
    visitors.forEach(function (v) {
        if (v.fromName && v.toName) {
            var key = v.fromName + ' → ' + v.toName;
            counts[key] = (counts[key] || 0) + 1;
        }
    });

    // Sort and take top 5
    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    var labels = sorted.map(function (e) { return e[0]; });
    var data = sorted.map(function (e) { return e[1]; });

    // Destroy old chart if exists
    if (routesChart) routesChart.destroy();

    var ctx = document.getElementById('chartRoutes').getContext('2d');
    routesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: labels.map(function (_, i) { return chartColors[(i + 2) % chartColors.length]; }),
                borderColor: labels.map(function (_, i) { return chartBorderColors[(i + 2) % chartBorderColors.length]; }),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: JSON.parse(JSON.stringify(chartDefaults))
    });
}


// =====================================================================
// SECTION 6: RECENT VISITORS TABLE
// =====================================================================

function renderTable(visitors) {
    // Show last 10 entries (data is already sorted desc by timestamp)
    var recent = visitors.slice(0, 10);

    tableCount.textContent = 'Last ' + recent.length + ' of ' + visitors.length;

    if (recent.length === 0) {
        visitorsTableBody.innerHTML =
            '<tr><td colspan="6" class="text-center py-12">' +
            '<div class="flex flex-col items-center gap-2">' +
            '<svg class="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />' +
            '</svg>' +
            '<p class="text-sm text-white/30 font-medium">No visitor records found</p>' +
            '</div></td></tr>';
        return;
    }

    var html = '';
    recent.forEach(function (v, i) {
        // Format path as badges
        var pathHTML = '—';
        if (v.path && Array.isArray(v.path)) {
            pathHTML = v.path.map(function (node, j) {
                var arrow = j < v.path.length - 1 ? ' <span class="text-white/15 text-[10px]">→</span> ' : '';
                return '<span class="path-badge">' + node + '</span>' + arrow;
            }).join('');
        }

        // Format timestamp
        var timeStr = '—';
        if (v.timestamp && v.timestamp.toDate) {
            var d = v.timestamp.toDate();
            timeStr = d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' +
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        html +=
            '<tr class="fade-in" style="animation-delay:' + (i * 0.04) + 's">' +
            '<td class="font-mono text-white/30 text-xs">' + (i + 1) + '</td>' +
            '<td>' +
            '<div class="flex items-center gap-2.5">' +
            '<div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-[11px] font-bold text-white/60">' +
            (v.name ? v.name.charAt(0).toUpperCase() : '?') +
            '</div>' +
            '<span class="font-medium text-white/85">' + (v.name || '—') + '</span>' +
            '</div>' +
            '</td>' +
            '<td>' +
            '<span class="text-white/70">' + (v.fromName || v.from || '—') + '</span>' +
            '<span class="block text-[11px] text-white/25 font-mono">' + (v.from || '') + '</span>' +
            '</td>' +
            '<td>' +
            '<span class="text-white/70">' + (v.toName || v.to || '—') + '</span>' +
            '<span class="block text-[11px] text-white/25 font-mono">' + (v.to || '') + '</span>' +
            '</td>' +
            '<td>' + pathHTML + '</td>' +
            '<td class="text-xs text-white/35 font-mono whitespace-nowrap">' + timeStr + '</td>' +
            '</tr>';
    });

    visitorsTableBody.innerHTML = html;
}


// =====================================================================
// SECTION 7: INITIALISATION
// =====================================================================

// Start fetching when Firebase is ready
if (window.firebaseReady) {
    fetchVisitors();
} else {
    window.onFirebaseReady = fetchVisitors;
}

console.log('📊 RoboNav Admin Dashboard loaded');
