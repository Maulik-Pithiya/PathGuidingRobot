// =====================================================================
// script.js — White-Line Following Robot Navigation System
//
// This file contains:
//   1. Campus Map Data (Adjacency List)
//   2. BFS (Breadth-First Search) Algorithm
//   3. UI Logic (dropdowns, status card, map visualisation)
//
// Heavily commented for project examiner presentation.
// =====================================================================


// =====================================================================
// SECTION 1: CAMPUS MAP DATA — ADJACENCY LIST
// =====================================================================
//
// An Adjacency List represents a graph where each key is a node
// (location) and the value is an array of directly connected nodes.
//
//  (A) Main Entrance ------ (C) Junction ------ (D) Admin Block
//                             |     \
//  (B) Library ---------------     (F) Corridor Jn.
//                                   |         \
//                             (E) Canteen    (G) Lab
//
// This is an UNDIRECTED graph — connections go both ways.
// =====================================================================

const campusMap = {
    'N1': ['N3'],
    'N2': ['N3'],
    'N3': ['N1', 'N2', 'N4'],
    'N4': ['N3', 'N5', 'N6', 'N7'],
    'N5': ['N4'],
    'N6': ['N4'],
    'N7': ['N4']
};

// Human-readable names for each node
const locationNames = {
    'N1': 'MTIN',
    'N2': 'CMPICA',
    'N3': 'PDPIAS',
    'N4': 'Center',
    'N5': 'DEPSTAR',
    'N6': 'CSPIT',
    'N7': 'Library'
};

// SVG icon paths for each location (used in location cards)
const locationIcons = {
    'N1': '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 6.75l10.5-6 4.5 2.571" />',
    'N2': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />',
    'N3': '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />',
    'N4': '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />',
    'N5': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12" />',
    'N6': '<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />',
    'N7': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />'
};

const nodeCoords = {
    'N1': { x: 580, y: 60 },
    'N2': { x: 460, y: 60 },
    'N3': { x: 350, y: 160 },
    'N4': { x: 350, y: 280 },
    'N5': { x: 580, y: 280 },
    'N6': { x: 120, y: 280 },
    'N7': { x: 350, y: 420 }
};

const edgeSegments = {
    'N3-N1': [{ x: 350, y: 160 }, { x: 580, y: 160 }, { x: 580, y: 60 }],
    'N1-N3': [{ x: 580, y: 60 }, { x: 580, y: 160 }, { x: 350, y: 160 }],
    'N3-N2': [{ x: 350, y: 160 }, { x: 350, y: 60 }, { x: 460, y: 60 }],
    'N2-N3': [{ x: 460, y: 60 }, { x: 350, y: 60 }, { x: 350, y: 160 }]
};

function getTurnInstruction(prev, curr, next) {
    function getSegment(u, v) {
        return edgeSegments[`${u}-${v}`] || [nodeCoords[u], nodeCoords[v]];
    }
    const inSeg = getSegment(prev, curr);
    const inVec = {
        x: inSeg[inSeg.length - 1].x - inSeg[inSeg.length - 2].x,
        y: inSeg[inSeg.length - 1].y - inSeg[inSeg.length - 2].y
    };
    const outSeg = getSegment(curr, next);
    const outVec = {
        x: outSeg[1].x - outSeg[0].x,
        y: outSeg[1].y - outSeg[0].y
    };
    const angle1 = Math.atan2(inVec.y, inVec.x);
    const angle2 = Math.atan2(outVec.y, outVec.x);
    const diff = (angle2 - angle1) * 180 / Math.PI;
    let normDiff = (diff + 360) % 360;
    if (normDiff > 180) normDiff -= 360;

    // Check ranges
    if (normDiff > 20 && normDiff < 160) return 'Turn Right';
    if (normDiff < -20 && normDiff > -160) return 'Turn Left';
    if (Math.abs(normDiff) <= 20) return 'Go Straight';
    return 'U-Turn';
}



// =====================================================================
// SECTION 2: BFS (BREADTH-FIRST SEARCH) ALGORITHM
// =====================================================================
//
// BFS finds the SHORTEST PATH in an unweighted graph.
//
// How it works:
//   1. Put the start node into a QUEUE and mark it VISITED.
//   2. While the queue is not empty:
//      a. Dequeue the first node ('current').
//      b. If 'current' === destination → reconstruct and return path.
//      c. For each unvisited neighbor → mark visited, record parent,
//         enqueue.
//   3. If queue empties without finding destination → no path exists.
//
// Time:  O(V + E)   Space: O(V)
// =====================================================================

function bfs(graph, start, end) {
    // Edge case: already at destination
    if (start === end) return [start];

    const visited = new Set();   // Tracks visited nodes (O(1) lookup)
    const queue = [];          // FIFO queue for BFS traversal
    const parent = {};          // Maps each node to its predecessor

    // Seed the queue with the start node
    visited.add(start);
    queue.push(start);
    parent[start] = null;

    // Main BFS loop
    while (queue.length > 0) {
        const current = queue.shift();  // Dequeue (FIFO)

        // Found destination?
        if (current === end) {
            return reconstructPath(parent, start, end);
        }

        // Explore all neighbors
        const neighbors = graph[current];
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent[neighbor] = current;
                queue.push(neighbor);
            }
        }
    }

    return null; // No path between start and end
}


// =====================================================================
// HELPER: reconstructPath
// Backtrack through parent pointers from end → start, then reverse.
// Example: parent = {A:null, C:'A', F:'C', G:'F'}
//          G → F → C → A  →  reversed:  ['A','C','F','G']
// =====================================================================

function reconstructPath(parent, start, end) {
    const path = [];
    let current = end;
    while (current !== null) {
        path.push(current);
        current = parent[current];
    }
    path.reverse();
    return path;
}


// =====================================================================
// SECTION 3: UI LOGIC
// =====================================================================

// --- DOM references ---
const startSelect = document.getElementById('startNode');
const endSelect = document.getElementById('endNode');
const navigateBtn = document.getElementById('navigateBtn');
const navBtnContent = document.getElementById('navBtnContent');
const navBtnLoader = document.getElementById('navBtnLoader');
const swapBtn = document.getElementById('swapBtn');
const statusEmpty = document.getElementById('statusEmpty');
const statusResult = document.getElementById('statusResult');
const statusError = document.getElementById('statusError');
const pathDisplay = document.getElementById('pathDisplay');
const errorMsg = document.getElementById('errorMsg');
const locationGrid = document.getElementById('locationGrid');


// --- Toggle button loading state ---
function setNavButtonLoading(isLoading) {
    if (isLoading) {
        navigateBtn.disabled = true;
        navBtnContent.classList.add('hidden');
        navBtnLoader.classList.remove('hidden');
    } else {
        navigateBtn.disabled = false;
        navBtnContent.classList.remove('hidden');
        navBtnLoader.classList.add('hidden');
    }
}


// --- Populate dropdown <option> elements ---
function populateDropdowns() {
    Object.keys(campusMap).forEach(function (key) {
        const o1 = document.createElement('option');
        o1.value = key;
        o1.textContent = key + ' — ' + locationNames[key];
        startSelect.appendChild(o1);

        const o2 = document.createElement('option');
        o2.value = key;
        o2.textContent = key + ' — ' + locationNames[key];
        endSelect.appendChild(o2);
    });
}


// --- Build the Location Reference grid ---
// Each card shows: node code, name, and icon
function populateLocationGrid() {
    Object.keys(campusMap).forEach(function (key) {
        const card = document.createElement('div');
        card.id = 'loc-' + key;
        card.className = 'loc-card relative overflow-hidden rounded-2xl p-5 bg-white/[0.04] border-[1.5px] border-white/[0.08] transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-lg';
        card.innerHTML =
            '<div class="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/[0.15]">' +
            '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">' +
            locationIcons[key] +
            '</svg>' +
            '</div>' +
            '<div class="font-mono text-2xl font-bold text-white/[0.85] mb-1">' + key + '</div>' +
            '<div class="text-sm font-medium text-white/[0.55]">' + locationNames[key] + '</div>';
        locationGrid.appendChild(card);
    });
}


// --- Swap start ↔ destination ---
swapBtn.addEventListener('click', function () {
    var temp = startSelect.value;
    startSelect.value = endSelect.value;
    endSelect.value = temp;
});


// --- Toast notification ---
function showToast(message, type) {
    var existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast-notification toast-enter';
    toast.innerHTML =
        '<div class="toast-body toast-' + type + '">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />' +
        '</svg>' +
        message +
        '</div>';
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}


// --- Update SVG map visualisation ---
function updateMapVisualization(path) {
    // Reset
    document.querySelectorAll('.graph-edge').forEach(function (e) { e.classList.remove('active', 'dimmed'); });
    document.querySelectorAll('.graph-node').forEach(function (n) { n.classList.remove('active', 'start', 'end', 'dimmed'); });
    document.querySelectorAll('.loc-card').forEach(function (c) { c.classList.remove('active'); });

    if (!path || path.length === 0) return;

    // Dim everything
    document.querySelectorAll('.graph-edge').forEach(function (e) { e.classList.add('dimmed'); });
    document.querySelectorAll('.graph-node').forEach(function (n) { n.classList.add('dimmed'); });

    // Highlight path nodes
    path.forEach(function (key, i) {
        var nodeEl = document.getElementById('node-' + key);
        if (nodeEl) {
            nodeEl.classList.remove('dimmed');
            nodeEl.classList.add('active');
            if (i === 0) nodeEl.classList.add('start');
            else if (i === path.length - 1) nodeEl.classList.add('end');
        }
        var locCard = document.getElementById('loc-' + key);
        if (locCard) locCard.classList.add('active');
    });

    // Highlight path edges
    for (var i = 0; i < path.length - 1; i++) {
        var from = path[i], to = path[i + 1];
        var edgeEl = document.getElementById('edge-' + from + '-' + to)
            || document.getElementById('edge-' + to + '-' + from);
        if (edgeEl) { edgeEl.classList.remove('dimmed'); edgeEl.classList.add('active'); }
    }
}


// --- Display path as a vertical timeline ---
function displayPath(path) {
    pathDisplay.innerHTML = '';

    path.forEach(function (key, i) {
        var step = document.createElement('div');
        step.className = 'path-step';
        step.style.animationDelay = (i * 0.1) + 's';

        // Determine dot and tag styles
        var dotClass, tagClass, tagText;
        if (i === 0) {
            dotClass = 'dot-start'; tagClass = 'tag-start'; tagText = 'Start';
        } else if (i === path.length - 1) {
            dotClass = 'dot-end'; tagClass = 'tag-end'; tagText = 'Destination';
        } else {
            dotClass = 'dot-mid'; tagClass = 'tag-via';
            tagText = getTurnInstruction(path[i - 1], path[i], path[i + 1]);
        }

        step.innerHTML =
            '<div class="step-line"></div>' +
            '<div class="step-dot ' + dotClass + '">' + key + '</div>' +
            '<div class="step-info">' +
            '<div class="step-name">' + locationNames[key] + '</div>' +
            '<div class="step-label">Node ' + key + (i < path.length - 1 ? ' → ' + path[i + 1] : '') + '</div>' +
            '</div>' +
            '<span class="step-tag ' + tagClass + '">' + tagText + '</span>';

        pathDisplay.appendChild(step);
    });
}


// --- Toggle status card sections ---
function showStatus(section) {
    statusEmpty.classList.add('hidden');
    statusResult.classList.add('hidden');
    statusError.classList.add('hidden');
    if (section === 'empty') statusEmpty.classList.remove('hidden');
    if (section === 'result') statusResult.classList.remove('hidden');
    if (section === 'error') statusError.classList.remove('hidden');
}


// --- Modal DOM references ---
var visitorModal = document.getElementById('visitorModal');
var modalBackdrop = document.getElementById('modalBackdrop');
var modalCard = document.getElementById('modalCard');
var visitorNameInput = document.getElementById('visitorNameInput');
var visitorNameError = document.getElementById('visitorNameError');
var modalCancelBtn = document.getElementById('modalCancelBtn');
var modalStartBtn = document.getElementById('modalStartBtn');


// --- Open the visitor modal with animation ---
function openVisitorModal() {
    visitorModal.classList.remove('hidden');
    visitorModal.classList.add('flex');
    visitorNameInput.value = '';
    visitorNameError.classList.add('hidden');
    visitorNameInput.classList.remove('border-red-500/50');

    // Trigger enter animation on next frame
    requestAnimationFrame(function () {
        modalBackdrop.classList.remove('opacity-0');
        modalBackdrop.classList.add('opacity-100');
        modalCard.classList.remove('scale-95', 'opacity-0');
        modalCard.classList.add('scale-100', 'opacity-100');
    });

    // Focus the input after animation
    setTimeout(function () { visitorNameInput.focus(); }, 200);
}


// --- Close the visitor modal with animation ---
function closeVisitorModal() {
    modalBackdrop.classList.remove('opacity-100');
    modalBackdrop.classList.add('opacity-0');
    modalCard.classList.remove('scale-100', 'opacity-100');
    modalCard.classList.add('scale-95', 'opacity-0');

    setTimeout(function () {
        visitorModal.classList.remove('flex');
        visitorModal.classList.add('hidden');
    }, 300);
}


// --- Modal Cancel button ---
modalCancelBtn.addEventListener('click', function () {
    closeVisitorModal();
});


// --- Close modal on backdrop click ---
modalBackdrop.addEventListener('click', function () {
    closeVisitorModal();
});


// --- Close modal on Escape key ---
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !visitorModal.classList.contains('hidden')) {
        closeVisitorModal();
    }
});


// --- Clear validation error on input ---
visitorNameInput.addEventListener('input', function () {
    if (visitorNameInput.value.trim().length > 0) {
        visitorNameError.classList.add('hidden');
        visitorNameInput.classList.remove('border-red-500/50');
    }
});


// --- Main navigation handler — now opens modal first ---
navigateBtn.addEventListener('click', function () {
    var start = startSelect.value;
    var end = endSelect.value;

    if (!start || !end) {
        showToast('Please select both locations.', 'error');
        return;
    }
    if (start === end) {
        showToast('Start and destination cannot be the same.', 'error');
        return;
    }

    // Open the modal to collect visitor name
    openVisitorModal();
});


// --- Modal Start button — runs the actual navigation ---
modalStartBtn.addEventListener('click', function () {
    handleModalStart();
});

// --- Also handle Enter key inside the input ---
visitorNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        handleModalStart();
    }
});

function handleModalStart() {
    var visitorName = visitorNameInput.value.trim();

    // Validate
    if (!visitorName) {
        visitorNameError.classList.remove('hidden');
        visitorNameInput.classList.add('border-red-500/50');
        visitorNameInput.focus();
        return;
    }

    // Close modal
    closeVisitorModal();

    var start = startSelect.value;
    var end = endSelect.value;

    // Enter loading state
    setNavButtonLoading(true);

    // Run BFS
    var path = bfs(campusMap, start, end);

    if (path === null) {
        setNavButtonLoading(false);
        showStatus('error');
        errorMsg.textContent = 'No path found between ' + locationNames[start] + ' and ' + locationNames[end] + '.';
        updateMapVisualization(null);
        return;
    }

    // Display result on the UI
    showStatus('result');
    displayPath(path);
    updateMapVisualization(path);

    // --- FIREBASE: Log visitor entry first, then send navigation command ---
    // Uses push() so each entry gets a unique key under /visitors
    //   /visitors/<unique-key>
    //     name:     "John"           ← visitor's name
    //     from:     "N1"             ← start node id
    //     to:       "N5"             ← destination node id
    //     fromName: "MTIN"           ← building name
    //     toName:   "DEPSTAR"        ← building name
    //     path:     ["N1","N3","N4","N5"]  ← array of route nodes

    if (!window.firebaseReady) {
        // Firebase not loaded yet — queue for when it's ready
        updateRobotStatusUI('pending');
        window.onFirebaseReady = function () {
            pushVisitorAndNavigate(visitorName, start, end, path);
        };
        return;
    }

    pushVisitorAndNavigate(visitorName, start, end, path);
}


// --- Log visitor to Firestore, then send navigation command ---
function pushVisitorAndNavigate(visitorName, start, end, path) {
    var firestore = window.firestoreDB;
    var collection = window.firestoreCollection;
    var addDoc = window.firestoreAddDoc;
    var serverTimestamp = window.firestoreServerTimestamp;

    var visitorEntry = {
        name: visitorName,
        from: start,
        to: end,
        fromName: locationNames[start],
        toName: locationNames[end],
        path: path,                      // stored as array, e.g. ["N1","N3","N4","N5"]
        timestamp: serverTimestamp()      // Firebase server timestamp
    };

    // addDoc() creates a new document with auto-generated ID in /visitors
    addDoc(collection(firestore, 'visitors'), visitorEntry)
        .then(function (docRef) {
            console.log('✅ Visitor logged to Firestore (ID: ' + docRef.id + '):', visitorEntry);
            // Only proceed with navigation command after successful log
            sendToFirebase(start, end, path, visitorName);
        })
        .catch(function (error) {
            console.error('❌ Failed to log visitor:', error);
            showToast('Failed to log visitor. Check connection.', 'error');
            setNavButtonLoading(false);
        });
}


// =====================================================================
// SECTION 4: FIREBASE INTEGRATION
// =====================================================================
//
// HOW THE COMMUNICATION WORKS:
//
//   WEBSITE (this code)                     ROBOT (ESP32 / Arduino)
//   ─────────────────                       ──────────────────────
//   1. User clicks "Start Navigation"
//   2. Website writes to Firebase:
//      { from:"A", to:"E",
//        path:"A,C,F,E",
//        status:"pending" }
//                                           3. Robot reads `from` and `to`
//                                              from Firebase.
//                                           4. Robot runs its OWN BFS
//                                              and starts moving.
//                                           5. Robot updates status →
//                                              "running"
//   6. Website LISTENS for status
//      changes and updates the UI
//      automatically (pending → running).
//                                           7. Robot reaches destination.
//                                           8. Robot updates status →
//                                              "reached"
//   9. Website shows "Reached!" in the
//      status banner.
//
// Firebase path used: /navigation_command
// =====================================================================


// --- Cache robot status banner DOM elements ---
var robotStatusBanner = document.getElementById('robotStatusBanner');
var robotStatusDot = document.getElementById('robotStatusDot');
var robotStatusText = document.getElementById('robotStatusText');
var robotStatusDesc = document.getElementById('robotStatusDesc');
var robotStatusBadge = document.getElementById('robotStatusBadge');
var robotLastUpdated = document.getElementById('robotLastUpdated');


// --- sendToFirebase: writes the navigation command ---
// Called after BFS computes the path.
// @param {string} from  - start node key, e.g. 'A'
// @param {string} to    - destination node key, e.g. 'E'
// @param {string[]} path - computed BFS path, e.g. ['A','C','F','E']

function sendToFirebase(from, to, path, visitorName) {

    // Check if Firebase is loaded (the module script runs after script.js)
    if (!window.firebaseReady) {
        updateRobotStatusUI('pending');
        console.log('⏳ Firebase not ready yet, will send when ready...');

        // Disable but don't re-enable until ready
        window.onFirebaseReady = function () {
            sendToFirebase(from, to, path, visitorName);
        };
        return;
    }

    var db = window.firebaseDB;
    var ref = window.firebaseRef;
    var set = window.firebaseSet;

    // Build the step-by-step direction string from the BFS path.
    // Each turn instruction is mapped to an uppercase keyword.
    // The result is stored as a single comma-separated string in Firebase.
    // Example path ['N1','N3','N4','N5'] → "FORWARD,LEFT,STOP"
    var directionMap = {
        'Go Straight': 'Forward',
        'Turn Left': 'Left',
        'Turn Right': 'Right',
        'U-Turn': 'UTURN'
    };
    var directionParts = [];
    for (var i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
            // Last node — robot stops here
            directionParts.push('Stop');
        } else if (i === 0) {
            // First segment: no incoming vector, go straight
            directionParts.push('Forward');
        } else {
            // Intermediate node — compute turn from previous → current → next
            var raw = getTurnInstruction(path[i - 1], path[i], path[i + 1]);
            directionParts.push(directionMap[raw] || 'Forward');
        }
    }

    // Build the command object
    // `directions` is stored as a plain comma-separated string (not an array)
    // e.g. "FORWARD,LEFT,STOP"
    var command = {
        from: from,                              // e.g. "N1"
        to: to,                                  // e.g. "N5"
        path: path.join(','),                    // e.g. "N1,N3,N4,N5"
        directions: directionParts.join(','),    // e.g. "FORWARD,LEFT,STOP"
        visitor: visitorName || '',               // visitor's name
        status: 'pending',                       // website sets → robot updates
        timestamp: Date.now()                    // Unix timestamp in ms
    };

    // Write to /navigation_command in Firebase Realtime Database
    set(ref(db, 'navigation_command'), command)
        .then(function () {
            console.log('✅ Navigation command sent to Firebase:', command);
            showToast('Command sent to robot!', 'info');
            updateRobotStatusUI('pending');

            // Start listening for the robot's status updates
            listenForRobotStatus();
        })
        .catch(function (error) {
            console.error('❌ Firebase write error:', error);
            showToast('Failed to send command. Check connection.', 'error');
        })
        .finally(function () {
            // Re-enable the button regardless of success or failure
            setNavButtonLoading(false);
        });
}


// --- listenForRobotStatus: real-time listener on /navigation_command/status ---
// The robot updates this field:  pending → running → reached
// This function listens and updates the website UI automatically.

var statusListenerActive = false;  // prevent duplicate listeners

function listenForRobotStatus() {

    if (!window.firebaseReady) return;
    if (statusListenerActive) return;  // already listening

    var db = window.firebaseDB;
    var ref = window.firebaseRef;
    var onValue = window.firebaseOnValue;

    statusListenerActive = true;

    // Listen to the entire /navigation_command node for changes
    onValue(ref(db, 'navigation_command'), function (snapshot) {
        var data = snapshot.val();
        if (!data || !data.status) return;

        console.log('📡 Firebase status update:', data.status);

        // Update timestamp display if available
        if (data.timestamp && robotLastUpdated) {
            var date = new Date(data.timestamp);
            var dateString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            robotLastUpdated.textContent = 'Updated: ' + dateString;
            robotLastUpdated.classList.remove('hidden');
        }

        // Update the robot status banner in the UI
        updateRobotStatusUI(data.status);

        // If the robot has reached, stop showing the pulse after a delay
        if (data.status === 'reached') {
            statusListenerActive = false;  // allow re-listening on next nav
        }
    });
}


// --- updateRobotStatusUI: changes the status banner appearance ---
// @param {string} status - 'pending', 'running', or 'reached'

function updateRobotStatusUI(status) {

    if (!robotStatusBanner) return;

    switch (status) {

        case 'pending':
            // Amber/yellow theme — waiting for robot
            robotStatusBanner.className = 'mt-4 rounded-xl border p-4 transition-all duration-500 border-amber-500/20 bg-amber-500/5';
            robotStatusDot.className = 'w-3 h-3 rounded-full bg-amber-400 animate-pulse';
            robotStatusText.textContent = 'Sending to Robot...';
            robotStatusDesc.textContent = 'Waiting for robot to start moving';
            robotStatusBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-400';
            robotStatusBadge.textContent = 'Pending';
            break;

        case 'running':
            // Blue theme — robot is moving
            robotStatusBanner.className = 'mt-4 rounded-xl border p-4 transition-all duration-500 border-blue-500/25 bg-blue-500/5';
            robotStatusDot.className = 'w-3 h-3 rounded-full bg-blue-400 animate-pulse';
            robotStatusText.textContent = 'Robot is Moving';
            robotStatusDesc.textContent = 'Following the white line along the path';
            robotStatusBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/15 text-blue-400';
            robotStatusBadge.textContent = 'Running';
            break;

        case 'reached':
            // Green theme — robot arrived
            robotStatusBanner.className = 'mt-4 rounded-xl border p-4 transition-all duration-500 border-emerald-500/25 bg-emerald-500/5';
            robotStatusDot.className = 'w-3 h-3 rounded-full bg-emerald-400';  // no pulse
            robotStatusText.textContent = 'Destination Reached!';
            robotStatusDesc.textContent = 'Robot has arrived at the destination';
            robotStatusBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400';
            robotStatusBadge.textContent = 'Reached';
            break;

        default:
            break;
    }
}



// =====================================================================
// SECTION 5: INITIALISATION
// =====================================================================

populateDropdowns();
populateLocationGrid();
showStatus('empty');

console.log('🤖 RoboNav loaded. Campus map:', campusMap);
console.log('📡 Firebase integration active. Commands will be sent to /navigation_command');


// =====================================================================
// SECTION 6: ESP32 CONNECTION STATUS WATCHER
// =====================================================================
//
// The ESP32 periodically writes its millis() timestamp to:
//     /esp32/lastHeartbeat
//
// Because millis() changes on every write, Firebase's onValue listener
// fires every time — unlike a static "Online" string which only fires
// once and then stops triggering (causing false Offline status).
//
// This listener:
//   • Marks the header badge ✅ ONLINE  when a heartbeat is received
//   • Starts a 12-second watchdog timer on every heartbeat
//   • If no heartbeat arrives within 12 s  → marks ❌ OFFLINE
//   • Recovers automatically the moment heartbeats resume
// =====================================================================

var connectionStatusDot = document.getElementById('connectionStatusBadge');
var connectionStatusLabel = document.getElementById('connectionStatusLabel');
var offlineTimer = null;        // watchdog timeout handle
var OFFLINE_TIMEOUT_MS = 12000; // 12 seconds with no heartbeat → offline
// (ESP32 sends every 5 s, so 12 s = ~2 missed beats)

// Set the header badge to ONLINE (green pulse)
function setConnectionOnline() {
    if (!connectionStatusDot || !connectionStatusLabel) return;
    connectionStatusDot.classList.remove('offline');   // green + pulse
    connectionStatusLabel.textContent = 'Online';
}

// Set the header badge to OFFLINE (red, static)
function setConnectionOffline() {
    if (!connectionStatusDot || !connectionStatusLabel) return;
    connectionStatusDot.classList.add('offline');      // red, no pulse
    connectionStatusLabel.textContent = 'Offline';
}

// Start watching; called once Firebase is ready
function listenForESP32Connection() {
    if (!window.firebaseReady) return;

    var db = window.firebaseDB;
    var ref = window.firebaseRef;
    var onValue = window.firebaseOnValue;

    // Start as offline until first heartbeat arrives
    setConnectionOffline();

    // Listen to /esp32/lastHeartbeat
    // The ESP32 writes millis() here every 5 seconds.
    // Because the value is always different, onValue fires every time.
    onValue(ref(db, 'esp32/lastHeartbeat'), function (snapshot) {
        var value = snapshot.val();

        if (value !== null) {
            // ✅ Heartbeat received — mark online and reset the watchdog
            setConnectionOnline();

            clearTimeout(offlineTimer);
            offlineTimer = setTimeout(function () {
                // No heartbeat for OFFLINE_TIMEOUT_MS → mark offline
                setConnectionOffline();
                console.warn('⚠️ ESP32 heartbeat timed out — marked Offline');
            }, OFFLINE_TIMEOUT_MS);

            console.log('📶 ESP32 heartbeat received:', value);
        } else {
            // null means the path doesn't exist yet → treat as offline
            setConnectionOffline();
            clearTimeout(offlineTimer);
        }
    });
}

// Hook into the Firebase-ready callback so the watcher starts
// regardless of whether Firebase loads before or after this script
(function () {
    var _orig = window.onFirebaseReady;
    window.onFirebaseReady = function () {
        if (typeof _orig === 'function') _orig();
        listenForESP32Connection();
    };

    // If Firebase is already ready by the time this runs, start immediately
    if (window.firebaseReady) {
        listenForESP32Connection();
    }
})();


const lenis = new Lenis({
    duration: 0,
    lerp: 0.2,
    smoothWheel: true,
    // --- Mobile Touch Settings ---

})

function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
}

requestAnimationFrame(raf)