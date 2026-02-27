// ==UserScript==
// @name         Jstris Match Logger (Tetra Stats & Replay Edition)
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Hooks StatsManager, calculates APP, logs advanced metrics/replays, and uses IndexedDB for massive storage and a Bot replay
// @match        https://jstris.jezevec10.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let hookInterval = setInterval(() => {
        if (typeof StatsManager !== 'undefined' && StatsManager.prototype.render) {
            clearInterval(hookInterval);
            const originalRender = StatsManager.prototype.render;
            StatsManager.prototype.render = function() {
                window.myLiveStats = this;
                return originalRender.apply(this, arguments);
            };
            console.log("🔥 Advanced Tetra Stats & Replay Hook Injected! (v4.3 - IndexedDB Edition)");
        }
    }, 500);

    let isMatchLogged = false;

    const observer = new MutationObserver((mutations) => {
        const gameOverScreen = document.querySelector('#resultsBox');
        if (gameOverScreen) {
            if (gameOverScreen.offsetParent !== null) {
                if (!isMatchLogged) {
                    logAllMatchData();
                    isMatchLogged = true;
                }
            } else {
                isMatchLogged = false;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const radians = (deg) => deg * (Math.PI / 180);

    async function logAllMatchData() {
        if (!window.myLiveStats || !window.myLiveStats.stats) return;

        try {
            let engineStats = window.myLiveStats.stats;

            let now = new Date();
            let localTime = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');

            let matchLog = { TIMESTAMP: localTime };

            // --- DOM SCRAPE: OPPONENT STATS & WIN/LOSS ---
            matchLog.USER_WON = 0;
            try {
                matchLog.BOT_NAME = game.Bots.bots[0].botType.name;
            } catch (e) {
                matchLog.BOT_NAME = "Unknown";
            }

            matchLog.BOT_APM = 0;
            matchLog.BOT_PPS = 0;
            matchLog.BOT_SENT = 0;

            try {
                const rows = document.querySelectorAll('#resultsContent table tr');
                if (rows.length >= 3) {
                    for (let i = 1; i < rows.length; i++) {
                        const cols = rows[i].querySelectorAll('td');
                        if (cols.length >= 7) {
                            const placement = cols[0].innerText.trim();
                            const isBot = cols[1].innerHTML.includes('label-bot');

                            if (isBot) {
                                matchLog.BOT_SENT = parseFloat(cols[4].innerText) || 0;
                                matchLog.BOT_PPS = parseFloat(cols[5].innerText) || 0;
                                matchLog.BOT_APM = parseFloat(cols[6].innerText) || 0;
                            } else {
                                if (placement === "1.") {
                                    matchLog.USER_WON = 1;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error scraping results table:", err);
            }

            for (let key in engineStats) {
                if (engineStats.hasOwnProperty(key)) {
                    let rawValue = engineStats[key].value;
                    if (rawValue !== undefined) {
                        if (typeof rawValue === 'string' && rawValue.includes(':')) {
                            let parts = rawValue.split(':');
                            let minutes = parseInt(parts[0], 10);
                            let seconds = parseFloat(parts[1]);
                            matchLog[key] = (minutes * 60) + seconds;
                        } else {
                            matchLog[key] = Number(rawValue) || 0;
                        }
                    } else {
                        matchLog[key] = 0;
                    }
                }
            }

            // --- BASE VARIABLES ---
            let pps = matchLog.PPS || 0;
            let blocks = matchLog.BLOCKS || 0;
            let attack = matchLog.ATTACK || 0;
            let apm = matchLog.APM || 0;
            let vs = matchLog.VS || 0;
            let clockTime = matchLog.CLOCK || 0;

            let timeSeconds = clockTime > 0 ? clockTime : (pps > 0 ? (blocks / pps) : 0);
            matchLog.TIME_SECONDS = parseFloat(timeSeconds.toFixed(2));

            if (blocks < 20) {
                console.log(`Match ignored: Only dropped ${blocks} blocks`);
                return;
            }

            // --- ADVANCED TETRA STATS MATH ---
            let app = (blocks > 0) ? (attack / blocks) : 0;
            matchLog.APP = parseFloat(app.toFixed(4));
            let vs_apm = (apm > 0) ? (vs / apm) : 0;
            matchLog.VS_APM = parseFloat(vs_apm.toFixed(4));
            let dss = (vs / 100) - (apm / 60);
            matchLog.DSS = parseFloat(dss.toFixed(4));
            let dsp = (pps > 0) ? (dss / pps) : 0;
            matchLog.DSP = parseFloat(dsp.toFixed(4));
            let app_dsp = app + dsp;
            matchLog.APP_DSP = parseFloat(app_dsp.toFixed(4));
            let cheese = (dsp * 150) + ((vs_apm - 2) * 50) + (0.6 - app) * 125;
            matchLog.CHEESE = parseFloat(cheese.toFixed(2));
            let gbe = (pps > 0) ? ((app * dss) / pps) * 2 : 0;
            matchLog.GBE = parseFloat(gbe.toFixed(4));
            let wapp = app - 5 * Math.tan(radians((cheese / -30) + 1));
            matchLog.WAPP = parseFloat(wapp.toFixed(4));
            let area = (apm * 1) + (pps * 45) + (vs * 0.444) + (app * 185) + (dss * 175) + (dsp * 450) + (gbe * 315);
            matchLog.AREA = parseFloat(area.toFixed(2));

            // --- ESTIMATED TR CALCULATIONS ---
            let srarea = (pps * 135) + (app * 290) + (dsp * 700);
            let statrank = 11.2 * Math.atan((srarea - 93) / 130) + 1;
            if (statrank <= 0) statrank = 0.001;

            let ntemp = pps * (150 + (((vs_apm) - 1.66) * 35)) + app * 290 + dsp * 700;
            let estglicko = 0.000013 * Math.pow(ntemp, 3) - 0.0196 * Math.pow(ntemp, 2) + (12.645 * ntemp) - 1005.4;
            let pi = Math.PI;
            let ln10 = Math.LN10;
            let esttr = 25000 / (1 + Math.pow(10, (((1500 - estglicko) * pi) / Math.sqrt(((3 * Math.pow(ln10, 2)) * Math.pow(60, 2)) + (2500 * ((64 * Math.pow(pi, 2)) + (147 * Math.pow(ln10, 2))))))));
            matchLog.EST_TR = parseFloat(esttr.toFixed(2));

            // --- PLAYSTYLE CALCULATIONS ---
            let nmapm = ((apm / srarea) / ((0.069 * Math.pow(1.0017, (Math.pow(statrank, 5) / 4700))) + statrank / 360)) - 1;
            let nmpps = ((pps / srarea) / (0.0084264 * Math.pow(2.14, (-2 * (statrank / 2.7 + 1.03))) - statrank / 5750 + 0.0067)) - 1;
            let nmapp = (app / (0.1368803292 * Math.pow(1.0024, (Math.pow(statrank, 5) / 2800)) + statrank / 54)) - 1;
            let nmdsp = (dsp / (0.02136327583 * Math.pow(14, ((statrank - 14.75) / 3.9)) + statrank / 152 + 0.022)) - 1;
            let nmgbe = (gbe / (statrank / 350 + 0.005948424455 * Math.pow(3.8, ((statrank - 6.1) / 4)) + 0.006)) - 1;
            let nmvsapm = (vs_apm / (-Math.pow(((statrank - 16) / 36), 2) + 2.133)) - 1;

            let style_opener = ((nmapm + nmpps * 0.75 + nmvsapm * -10 + nmapp * 0.75 + nmdsp * -0.25) / 3.5) + 0.5;
            let style_plonk = ((nmgbe + nmapp + nmdsp * 0.75 + nmpps * -1) / 2.73) + 0.5;
            let style_stride = ((nmapm * -0.25 + nmpps + nmapp * -2 + nmdsp * -0.5) * 0.79) + 0.5;
            let style_infds = ((nmdsp + nmapp * -0.75 + nmapm * 0.5 + nmvsapm * 1.5 + nmpps * 0.5) * 0.9) + 0.5;

            matchLog.STYLE_OPENER = parseFloat(style_opener.toFixed(3));
            matchLog.STYLE_PLONK = parseFloat(style_plonk.toFixed(3));
            matchLog.STYLE_STRIDE = parseFloat(style_stride.toFixed(3));
            matchLog.STYLE_INFDS = parseFloat(style_infds.toFixed(3));

            // --- EXTRACT REPLAY STRING ---
            try {
                game.Replay.getData()
                matchLog.REPLAY = typeof game !== 'undefined' && game.Replay && game.Replay.string ? game.Replay.string : "";
            } catch (e) {
                matchLog.REPLAY = "";
                console.warn("Could not extract replay string.", e);
            }

            try {
                game.Bots.bots[0].g.Replay.getData()

                matchLog.BOT_REPLAY = typeof game !== 'undefined' && game.Bots.bots[0].g.Replay && game.Bots.bots[0].g.Replay.string ? game.Bots.bots[0].g.Replay.string : "";
            } catch (e) {
                matchLog.BOT_REPLAY = "";
                console.warn("Could not extract bot replay string.", e);
            }

            // --- SAVE TO INDEXEDDB (localForage) ---
            try {
                let log = await localforage.getItem('jstris_log');
                log = log ? log : [];
                log.push(matchLog);

                await localforage.setItem('jstris_log', log);
                console.log("✅ ADVANCED MATCH LOG SAVED TO INDEXEDDB:", matchLog);
            } catch (storageError) {
                console.warn("⚠️ IndexedDB error! Checking quota/pruning...", storageError);
                try {
                    let log = await localforage.getItem('jstris_log');
                    if (log) {
                        log.splice(0, 50);
                        await localforage.setItem('jstris_log', log);
                    }
                } catch (e) {
                    console.error("Critical error pruning IndexedDB", e);
                }
            }

        } catch (e) {
            console.error("Error reading hooked stats:", e);
        }
    }

    // --- CSV EXPORT UI ---
    function createMenu() {
        const targetContainer = document.getElementById('gstats');
        if (!targetContainer) {
            setTimeout(createMenu, 1000);
            return;
        }

        // Main Container
        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = 'margin-top: -35px; margin-left: 50px; text-align: center; position: relative;';

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = 'Data Menu';
        toggleBtn.style.cssText = `
            background: #1e1e1e; color: #aaa; border: 1px solid #333; cursor: pointer;
            padding: 4px 10px; font-size: 11px; font-family: sans-serif; border-radius: 4px;
            transition: all 0.2s;
        `;
        toggleBtn.onmouseover = () => { toggleBtn.style.color = "#fff"; toggleBtn.style.borderColor = "#666"; };
        toggleBtn.onmouseout = () => { toggleBtn.style.color = "#aaa"; toggleBtn.style.borderColor = "#333"; };

        // Panel (Hidden by default)
        const panel = document.createElement('div');
        panel.style.cssText = `
            display: none; background: #111; border: 1px solid #444; border-radius: 4px;
            padding: 8px; position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
            margin-top: 5px; z-index: 100; min-width: 120px; box-shadow: 0px 4px 6px rgba(0,0,0,0.5);
        `;

        // Export Button
        const exportBtn = document.createElement('button');
        exportBtn.innerText = 'Export CSV';
        exportBtn.style.cssText = `
            display: block; width: 100%; background: #222; color: #ddd; border: 1px solid #555;
            cursor: pointer; padding: 5px; margin-bottom: 5px; font-size: 11px; border-radius: 3px;
        `;
        exportBtn.onmouseover = () => exportBtn.style.background = "#333";
        exportBtn.onmouseout = () => exportBtn.style.background = "#222";

        // Delete Latest Button
        const deleteLatestBtn = document.createElement('button');
        deleteLatestBtn.innerText = 'Delete Latest';
        deleteLatestBtn.style.cssText = `
            display: block; width: 100%; background: #442; color: #ddd; border: 1px solid #773;
            cursor: pointer; padding: 5px; margin-bottom: 5px; font-size: 11px; border-radius: 3px;
        `;
        deleteLatestBtn.onmouseover = () => deleteLatestBtn.style.background = "#663";
        deleteLatestBtn.onmouseout = () => deleteLatestBtn.style.background = "#442";

        // View Stats Button
        const viewStatsBtn = document.createElement('button');
        viewStatsBtn.innerText = 'View Stats Page';
        viewStatsBtn.style.cssText = `
            display: block; width: 100%; background: #2a2a2a; color: #ddd; border: 1px solid #555;
            cursor: pointer; padding: 5px; margin-bottom: 5px; font-size: 11px; border-radius: 3px;
        `;
        viewStatsBtn.onmouseover = () => viewStatsBtn.style.background = "#444";
        viewStatsBtn.onmouseout = () => viewStatsBtn.style.background = "#2a2a2a";

        viewStatsBtn.onclick = () => {
            panel.style.display = 'none';
            renderStatsPage();
        };

        panel.appendChild(viewStatsBtn);

        // Clear Button
        const clearBtn = document.createElement('button');
        clearBtn.innerText = 'Clear Data';
        clearBtn.style.cssText = `
            display: block; width: 100%; background: #422; color: #ddd; border: 1px solid #733;
            cursor: pointer; padding: 5px; font-size: 11px; border-radius: 3px;
        `;
        clearBtn.onmouseover = () => clearBtn.style.background = "#622";
        clearBtn.onmouseout = () => clearBtn.style.background = "#422";

        toggleBtn.onclick = () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };

        exportBtn.onclick = async function() {
            try {
                let data = await localforage.getItem('jstris_log');

                if (!data || data.length === 0) {
                    alert("No stats logged yet!");
                    return;
                }

                let headerSet = new Set();
                data.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
                let headers = Array.from(headerSet);

                let csvContent = headers.join(',') + '\n';

                data.forEach(row => {
                    let values = headers.map(header => {
                        let val = row[header] !== undefined ? row[header] : 0;
                        if (typeof val === 'string') {
                            val = '"' + val.replace(/"/g, '""') + '"';
                        }
                        return val;
                    });
                    csvContent += values.join(',') + '\n';
                });

                let now = new Date();
                let localDateStr = now.getFullYear() + '-' +
                                   String(now.getMonth() + 1).padStart(2, '0') + '-' +
                                   String(now.getDate()).padStart(2, '0');

                let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                let url = URL.createObjectURL(blob);
                let link = document.createElement('a');
                link.href = url;
                link.download = `Jstris_Advanced_Stats_${localDateStr}.csv`;
                link.click();

                panel.style.display = 'none';
            } catch (err) {
                console.error("Error generating CSV from IndexedDB", err);
                alert("Failed to export data. Check console for details.");
            }
        };

        deleteLatestBtn.onclick = async function() {
            try {
                let data = await localforage.getItem('jstris_log');

                if (data && data.length > 0) {

                    let latestMatch = data[data.length - 1];

                    let matchTime = latestMatch.TIMESTAMP || "Unknown";
                    let matchBlocks = latestMatch.BLOCKS !== undefined ? latestMatch.BLOCKS : "Unknown";

                    if (confirm(`Remove the most recently logged match?\n\nTime: ${matchTime}\nBlocks: ${matchBlocks}`)) {

                        data.pop();
                        await localforage.setItem('jstris_log', data);

                        alert(`Latest entry removed successfully!\n\nTime: ${matchTime}\nBlocks: ${matchBlocks}`);
                        panel.style.display = 'none';
                    }
                } else {
                    alert("No entries found to remove.");
                }
            } catch (err) {
                console.error("Error removing latest entry:", err);
                alert("Failed to remove data. Check console for details.");
            }
        };

        clearBtn.onclick = async function() {
            if (confirm("WARNING: This will permanently delete all logged Jstris match stats and replays. Are you sure?")) {
                try {
                    await localforage.setItem('jstris_log', []);
                    alert("Local database successfully cleared.");
                    panel.style.display = 'none';
                } catch (err) {
                    console.error("Error clearing data:", err);
                    alert("Failed to clear data. Check console for details.");
                }
            }
        };

        panel.appendChild(exportBtn);
        panel.appendChild(deleteLatestBtn);
        panel.appendChild(clearBtn);
        menuContainer.appendChild(toggleBtn);
        menuContainer.appendChild(panel);
        targetContainer.appendChild(menuContainer);
    }

    async function renderStatsPage() {
        let data;
        try {
            data = await localforage.getItem('jstris_log');
        } catch (e) {
            alert("Error reading database!");
            return;
        }

        if (!data || data.length === 0) {
            alert("No stats logged yet to view!");
            return;
        }

        // --- SORTING STATE ---
        let sortConfig = {
            column: 'TIMESTAMP',
            direction: 'desc'
        };

        const overlay = document.createElement('div');
        overlay.id = 'jstris-custom-stats-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); z-index: 99999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        const contentBox = document.createElement('div');
        contentBox.style.cssText = `
            background: #111; width: 95%; height: 90%; border: 2px solid #333;
            border-radius: 8px; display: flex; flex-direction: column;
            box-shadow: 0px 0px 20px rgba(0,0,0,1); overflow: hidden;
        `;

        const headerBox = document.createElement('div');
        headerBox.style.cssText = `
            background: #222; padding: 15px; border-bottom: 2px solid #333;
            display: flex; justify-content: space-between; align-items: center;
        `;

        const title = document.createElement('h2');
        title.innerText = `Advanced Match Stats (${data.length} matches)`;
        title.style.cssText = 'color: #eee; margin: 0; font-size: 18px;';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close X';
        closeBtn.style.cssText = `
            background: #833; color: white; border: none; padding: 8px 15px;
            cursor: pointer; border-radius: 4px; font-weight: bold;
        `;
        closeBtn.onclick = () => document.body.removeChild(overlay);
        closeBtn.onmouseover = () => closeBtn.style.background = "#a44";
        closeBtn.onmouseout = () => closeBtn.style.background = "#833";

        headerBox.appendChild(title);
        headerBox.appendChild(closeBtn);

        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `flex-grow: 1; overflow: auto; padding: 0;`;

        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%; border-collapse: collapse; color: #ccc; font-size: 12px;
            text-align: right; white-space: nowrap;
        `;

        let headerSet = new Set();
        data.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
        let headers = Array.from(headerSet);

        let thead = document.createElement('thead');
        let headerRow = document.createElement('tr');

        let headerCells = {};

        headers.forEach(header => {
            let th = document.createElement('th');
            th.innerText = header;
            th.style.cssText = `
                position: sticky; top: 0; background: #333; color: #fff;
                padding: 8px; border: 1px solid #444; z-index: 10; cursor: pointer;
                user-select: none; transition: background 0.2s;
            `;
            th.onmouseover = () => th.style.background = "#4a4a4a";
            th.onmouseout = () => th.style.background = "#333";

            th.onclick = () => {
                if (sortConfig.column === header) {
                    sortConfig.direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
                } else {
                    sortConfig.column = header;
                    sortConfig.direction = 'desc';
                }
                updateTableBody();
            };

            headerCells[header] = th;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        let tbody = document.createElement('tbody');
        table.appendChild(tbody);

        // --- DYNAMIC RENDERING FUNCTION ---
        const updateTableBody = () => {
            headers.forEach(h => {
                let text = h;
                if (sortConfig.column === h) {
                    text += sortConfig.direction === 'desc' ? ' ▼' : ' ▲';
                }
                headerCells[h].innerText = text;
            });

            let sortedData = [...data].sort((a, b) => {
                let valA = a[sortConfig.column];
                let valB = b[sortConfig.column];

                if (valA === undefined) valA = '';
                if (valB === undefined) valB = '';

                let comparison = 0;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                } else {
                    comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                }

                return sortConfig.direction === 'desc' ? -comparison : comparison;
            });

            tbody.innerHTML = '';
            sortedData.forEach((row, index) => {
                let tr = document.createElement('tr');
                tr.style.background = index % 2 === 0 ? '#1a1a1a' : '#111';

                headers.forEach(header => {
                    let td = document.createElement('td');
                    td.style.cssText = 'padding: 6px 8px; border: 1px solid #333;';

                    let val = row[header] !== undefined ? row[header] : '-';

                    if ((header === 'REPLAY' || header === 'BOT_REPLAY') && typeof val === 'string' && val.length > 20) {
                        let shortText = val.substring(0, 15) + '...';
                        td.innerText = shortText;
                        td.title = "Click to copy replay";
                        td.style.cursor = 'pointer';
                        td.style.color = '#7aa2f7';
                        td.style.fontWeight = 'bold';

                        td.onclick = async () => {
                            try {
                                await navigator.clipboard.writeText(val);
                                td.innerText = "Copied!";
                                td.style.color = "#a6e3a1";
                                setTimeout(() => {
                                    td.innerText = shortText;
                                    td.style.color = '#7aa2f7';
                                }, 1200);
                            } catch (err) {
                                console.error("Failed to copy", err);
                                td.innerText = "Error";
                                td.style.color = "#f38ba8";
                            }
                        };
                    } else {
                        td.innerText = val;
                    }

                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
        };

        updateTableBody();

        tableContainer.appendChild(table);
        contentBox.appendChild(headerBox);
        contentBox.appendChild(tableContainer);
        overlay.appendChild(contentBox);

        document.body.appendChild(overlay);
    }

    createMenu();

})();
