// =====================================================================
// admin.js — RoboNav Admin Analytics Dashboard
//
// Read-only — fetches all documents from Firestore 'visitors' collection
// and renders stats, charts, and a recent visitors table.
// =====================================================================


// --- DOM References ---
var valTotalNav = document.getElementById('valTotalNav');
var valUniqueVisitors = document.getElementById('valUniqueVisitors');

var valBusiestSrc = document.getElementById('valBusiestSrc');
var valTopDest = document.getElementById('valTopDest');
var valTopDestCount = document.getElementById('valTopDestCount');
var valTopRoute = document.getElementById('valTopRoute');
var valTopRouteCount = document.getElementById('valTopRouteCount');
var visitorsTableBody = document.getElementById('visitorsTableBody');
var tableCount = document.getElementById('tableCount');
var lastRefreshed = document.getElementById('lastRefreshed');
var pieLegend = document.getElementById('pieLegend');
var tableSearch = document.getElementById('tableSearch');

var filterDestination = document.getElementById('filterDestination');
var filterSource = document.getElementById('filterSource');
var resetFiltersBtn = document.getElementById('resetFiltersBtn');

// --- Chart instances (so we can destroy and recreate on filter) ---
var buildingsChart = null;
var routesChart = null;

// --- All visitor data (fetched once) ---
var allVisitors = [];

// --- Current filtered visitors (for table search) ---
var currentFilteredVisitors = [];


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
    currentFilteredVisitors = visitors;
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


    // Busiest source (most common fromName)
    var srcCounts = {};
    visitors.forEach(function (v) {
        if (v.fromName) {
            srcCounts[v.fromName] = (srcCounts[v.fromName] || 0) + 1;
        }
    });
    var topSrc = getTopKey(srcCounts);
    if (topSrc) {
        valBusiestSrc.textContent = topSrc.key;
    } else {
        valBusiestSrc.textContent = '—';
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
// Pie chart specific colors — vibrant, high-contrast palette
var pieColors = [
    'rgba(251, 146, 60, 0.85)',   // warm orange
    'rgba(56, 189, 248, 0.85)',   // sky blue
    'rgba(167, 139, 250, 0.85)',  // soft violet
    'rgba(52, 211, 153, 0.85)',   // mint green
    'rgba(251, 113, 133, 0.85)',  // coral pink
    'rgba(250, 204, 21, 0.85)',   // golden yellow
    'rgba(45, 212, 191, 0.85)',   // teal
    'rgba(192, 132, 252, 0.85)',  // lavender
    'rgba(248, 113, 113, 0.85)',  // soft red
    'rgba(74, 222, 128, 0.85)',   // lime green
];

// Bar chart colors
var chartColors = [
    'rgba(99, 102, 241, 0.8)',    // indigo
    'rgba(59, 130, 246, 0.8)',    // blue
    'rgba(139, 92, 246, 0.8)',    // violet
    'rgba(6, 182, 212, 0.8)',     // cyan
    'rgba(16, 185, 129, 0.8)',    // emerald
    'rgba(245, 158, 11, 0.8)',    // amber
    'rgba(236, 72, 153, 0.8)',    // pink
    'rgba(244, 63, 94, 0.8)',     // rose
    'rgba(168, 85, 247, 0.8)',    // purple
    'rgba(34, 197, 94, 0.8)',     // green
];

var chartBorderColors = [
    'rgba(99, 102, 241, 1)',
    'rgba(59, 130, 246, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(6, 182, 212, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(244, 63, 94, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(34, 197, 94, 1)',
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
                color: 'rgba(255,255,255,0.6)',
                font: { family: 'Inter', size: 13, weight: '600' },
                maxRotation: 30,
            },
            border: { display: false },
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            ticks: {
                color: 'rgba(255,255,255,0.6)',
                font: { family: 'JetBrains Mono', size: 13, weight: '600' },
                precision: 0,
                stepSize: 1
            },
            border: { display: false },
        }
    }
};


// --- Building Popularity PIE CHART ---
function renderBuildingsChart(visitors) {
    var counts = {};
    visitors.forEach(function (v) {
        if (v.toName) {
            counts[v.toName] = (counts[v.toName] || 0) + 1;
        }
    });

    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
    var labels = sorted.map(function (e) { return e[0]; });
    var data = sorted.map(function (e) { return e[1]; });
    var total = data.reduce(function (a, b) { return a + b; }, 0);

    if (buildingsChart) buildingsChart.destroy();

    var ctx = document.getElementById('chartBuildings').getContext('2d');
    buildingsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(function (_, i) { return pieColors[i % pieColors.length]; }),
                borderColor: 'rgba(10, 10, 15, 0.9)',
                borderWidth: 2,
                hoverOffset: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, bottom: 30, left: 20, right: 20 }
            },
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
                    callbacks: {
                        label: function (context) {
                            var pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return context.label + ': ' + context.raw + ' (' + pct + '%)';
                        }
                    }
                },
                datalabels: {
                    color: 'rgba(255,255,255,0.85)',
                    font: { family: 'Inter', size: 10, weight: '600' },
                    formatter: function (value, context) {
                        var pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                        var name = labels[context.dataIndex];
                        return name + '\n' + pct + '%';
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 6,
                    textAlign: 'center',
                    display: function (context) {
                        var pct = total > 0 ? (context.dataset.data[context.dataIndex] / total) * 100 : 0;
                        return pct > 3;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    // Build custom legend
    if (pieLegend) {
        var legendHTML = '';
        labels.forEach(function (label, i) {
            var pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : '0.0';
            legendHTML +=
                '<div class="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2 border border-white/5 hover:bg-white/10 transition-colors">' +
                '<div class="flex items-center gap-3">' +
                '<div class="legend-dot" style="background:' + pieColors[i % pieColors.length] + '"></div>' +
                '<span class="text-white/80 font-medium text-sm">' + label + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-3">' +
                '<span class="text-white/50 font-mono text-sm w-8 text-right">' + data[i] + '</span>' +
                '<span class="text-white/30 font-mono text-sm w-12 text-right">' + pct + '%</span>' +
                '</div>' +
                '</div>';
        });
        pieLegend.innerHTML = legendHTML;
    }
}


// --- Top 5 routes BAR CHART ---
function renderRoutesChart(visitors) {
    var counts = {};
    visitors.forEach(function (v) {
        if (v.fromName && v.toName) {
            var key = v.fromName + ' → ' + v.toName;
            counts[key] = (counts[key] || 0) + 1;
        }
    });

    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    var labels = sorted.map(function (e) { return e[0]; });
    var data = sorted.map(function (e) { return e[1]; });

    if (routesChart) routesChart.destroy();

    var ctx = document.getElementById('chartRoutes').getContext('2d');
    routesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: labels.map(function (_, i) { return pieColors[(i + 3) % pieColors.length]; }),
                borderColor: labels.map(function (_, i) { return pieColors[(i + 3) % pieColors.length].replace('0.85', '1'); }),
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 90,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 0, bottom: 0, left: 0, right: 0 }
            },
            plugins: {
                legend: { display: false },
                tooltip: chartDefaults.plugins.tooltip,
                datalabels: {
                    display: false
                }
            },
            scales: chartDefaults.scales,
        },
        plugins: []
    });
}


// =====================================================================
// SECTION 6: RECENT VISITORS TABLE
// =====================================================================

function renderTable(visitors, searchTerm) {
    searchTerm = (searchTerm || '').trim().toLowerCase();

    // Apply search filter
    var filtered = visitors;
    if (searchTerm) {
        filtered = visitors.filter(function (v) {
            return v.name && v.name.toLowerCase().indexOf(searchTerm) !== -1;
        });
    }

    // Show last 25 entries
    var recent = filtered.slice(0, 25);

    tableCount.textContent = recent.length + ' of ' + visitors.length;

    if (recent.length === 0) {
        visitorsTableBody.innerHTML =
            '<tr><td colspan="5" class="text-center py-12">' +
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
        // No path column needed

        // Format timestamp
        var timeStr = '—';
        if (v.timestamp && v.timestamp.toDate) {
            var d = v.timestamp.toDate();
            timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
                '<span class="block text-[10px] text-white/30 uppercase tracking-widest mt-0.5">' + 
                d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) + '</span>';
        }

        html +=
            '<tr class="fade-in" style="animation-delay:' + (i * 0.04) + 's">' +
            '<td class="font-mono text-white/30 text-xs">' + (i + 1) + '</td>' +
            '<td>' +
            '<span class="font-medium text-white/85">' + (v.name || '—') + '</span>' +
            '</td>' +
            '<td>' +
            '<span class="text-white/70">' + (v.fromName || v.from || '—') + '</span>' +
            '<span class="block text-[11px] text-white/25 font-mono">' + (v.from || '') + '</span>' +
            '</td>' +
            '<td>' +
            '<span class="text-white/70">' + (v.toName || v.to || '—') + '</span>' +
            '<span class="block text-[11px] text-white/25 font-mono">' + (v.to || '') + '</span>' +
            '</td>' +
            '<td class="text-xs text-white/35 font-mono whitespace-nowrap">' + timeStr + '</td>' +
            '</tr>';
    });

    visitorsTableBody.innerHTML = html;
}


// --- Table search handler ---
if (tableSearch) {
    tableSearch.addEventListener('input', function () {
        renderTable(currentFilteredVisitors, tableSearch.value);
    });
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
