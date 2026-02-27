// ==UserScript==
// @name         Jstris Match Logger (Tetra Stats & Replay Edition)
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Hooks StatsManager, logs base metrics, minimal UI replay buttons, organized CSVs.
// @match        https://jstris.jezevec10.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Hook StatsManager
    let hookInterval = setInterval(() => {
        if (typeof StatsManager !== 'undefined' && StatsManager.prototype.render) {
            clearInterval(hookInterval);
            const originalRender = StatsManager.prototype.render;
            StatsManager.prototype.render = function() {
                window.myLiveStats = this;
                return originalRender.apply(this, arguments);
            };
            console.log("Advanced Tetra Stats & Replay Hook Injected! (v4.7 - Clean UI Edition)");
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

    // --- DYNAMIC MATH CALCULATOR ---
    function calculateAdvancedStats(matchLog) {
        let pps = matchLog.PPS || 0;
        let blocks = matchLog.BLOCKS || 0;
        let attack = matchLog.ATTACK || 0;
        let apm = matchLog.APM || 0;
        let vs = matchLog.VS || 0;

        let adv = {};

        adv.APP = parseFloat((blocks > 0 ? (attack / blocks) : 0).toFixed(4));
        adv.VS_APM = parseFloat((apm > 0 ? (vs / apm) : 0).toFixed(4));
        adv.DSS = parseFloat(((vs / 100) - (apm / 60)).toFixed(4));
        adv.DSP = parseFloat((pps > 0 ? (adv.DSS / pps) : 0).toFixed(4));
        adv.APP_DSP = parseFloat((adv.APP + adv.DSP).toFixed(4));
        adv.CHEESE = parseFloat(((adv.DSP * 150) + ((adv.VS_APM - 2) * 50) + (0.6 - adv.APP) * 125).toFixed(2));
        adv.GBE = parseFloat((pps > 0 ? ((adv.APP * adv.DSS) / pps) * 2 : 0).toFixed(4));
        adv.WAPP = parseFloat((adv.APP - 5 * Math.tan(radians((adv.CHEESE / -30) + 1))).toFixed(4));
        adv.AREA = parseFloat(((apm * 1) + (pps * 45) + (vs * 0.444) + (adv.APP * 185) + (adv.DSS * 175) + (adv.DSP * 450) + (adv.GBE * 315)).toFixed(2));

        let srarea = (pps * 135) + (adv.APP * 290) + (adv.DSP * 700);
        let statrank = 11.2 * Math.atan((srarea - 93) / 130) + 1;
        if (statrank <= 0) statrank = 0.001;

        let ntemp = pps * (150 + (((adv.VS_APM) - 1.66) * 35)) + adv.APP * 290 + adv.DSP * 700;
        let estglicko = 0.000013 * Math.pow(ntemp, 3) - 0.0196 * Math.pow(ntemp, 2) + (12.645 * ntemp) - 1005.4;
        let pi = Math.PI, ln10 = Math.LN10;
        adv.EST_TR = parseFloat((25000 / (1 + Math.pow(10, (((1500 - estglicko) * pi) / Math.sqrt(((3 * Math.pow(ln10, 2)) * Math.pow(60, 2)) + (2500 * ((64 * Math.pow(pi, 2)) + (147 * Math.pow(ln10, 2))))))))).toFixed(2));

        let nmapm = ((apm / srarea) / ((0.069 * Math.pow(1.0017, (Math.pow(statrank, 5) / 4700))) + statrank / 360)) - 1;
        let nmpps = ((pps / srarea) / (0.0084264 * Math.pow(2.14, (-2 * (statrank / 2.7 + 1.03))) - statrank / 5750 + 0.0067)) - 1;
        let nmapp = (adv.APP / (0.1368803292 * Math.pow(1.0024, (Math.pow(statrank, 5) / 2800)) + statrank / 54)) - 1;
        let nmdsp = (adv.DSP / (0.02136327583 * Math.pow(14, ((statrank - 14.75) / 3.9)) + statrank / 152 + 0.022)) - 1;
        let nmgbe = (adv.GBE / (statrank / 350 + 0.005948424455 * Math.pow(3.8, ((statrank - 6.1) / 4)) + 0.006)) - 1;
        let nmvsapm = (adv.VS_APM / (-Math.pow(((statrank - 16) / 36), 2) + 2.133)) - 1;

        adv.STYLE_OPENER = parseFloat((((nmapm + nmpps * 0.75 + nmvsapm * -10 + nmapp * 0.75 + nmdsp * -0.25) / 3.5) + 0.5).toFixed(3));
        adv.STYLE_PLONK = parseFloat((((nmgbe + nmapp + nmdsp * 0.75 + nmpps * -1) / 2.73) + 0.5).toFixed(3));
        adv.STYLE_STRIDE = parseFloat((((nmapm * -0.25 + nmpps + nmapp * -2 + nmdsp * -0.5) * 0.79) + 0.5).toFixed(3));
        adv.STYLE_INFDS = parseFloat((((nmdsp + nmapp * -0.75 + nmapm * 0.5 + nmvsapm * 1.5 + nmpps * 0.5) * 0.9) + 0.5).toFixed(3));

        return adv;
    }

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

            matchLog.USER_WON = 0;
            try { matchLog.BOT_NAME = game.Bots.bots[0].botType.name; }
            catch (e) { matchLog.BOT_NAME = "Unknown"; }

            matchLog.BOT_APM = 0; matchLog.BOT_PPS = 0; matchLog.BOT_SENT = 0;

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
                            } else if (placement === "1.") {
                                matchLog.USER_WON = 1;
                            }
                        }
                    }
                }
            } catch (err) { console.error("Error scraping table:", err); }

            for (let key in engineStats) {
                if (engineStats.hasOwnProperty(key)) {
                    let rawValue = engineStats[key].value;
                    if (rawValue !== undefined) {
                        if (typeof rawValue === 'string' && rawValue.includes(':')) {
                            let parts = rawValue.split(':');
                            matchLog[key] = (parseInt(parts[0], 10) * 60) + parseFloat(parts[1]);
                        } else {
                            matchLog[key] = Number(rawValue) || 0;
                        }
                    } else { matchLog[key] = 0; }
                }
            }

            let clockTime = matchLog.CLOCK || 0, pps = matchLog.PPS || 0, blocks = matchLog.BLOCKS || 0;
            matchLog.TIME_SECONDS = parseFloat((clockTime > 0 ? clockTime : (pps > 0 ? (blocks / pps) : 0)).toFixed(2));

            if (blocks < 20) {
                console.log(`Match ignored: Only dropped ${blocks} blocks`);
                return;
            }

            // EXTRACT REPLAYS
            try {
                game.Replay.getData();
                matchLog.REPLAY = game?.Replay?.string || "";
            } catch (e) { matchLog.REPLAY = ""; }

            try {
                let botReplay = game?.Bots?.bots?.[0]?.g?.Replay;
                if(botReplay) {
                    botReplay.getData();
                    matchLog.BOT_REPLAY = botReplay.string || "";
                } else { matchLog.BOT_REPLAY = ""; }
            } catch (e) { matchLog.BOT_REPLAY = ""; }

            // SAVE ONLY BASE STATS TO DB
            try {
                let log = await localforage.getItem('jstris_log') || [];
                log.push(matchLog);
                await localforage.setItem('jstris_log', log);
                console.log("BASE MATCH LOG SAVED TO INDEXEDDB:", matchLog);
            } catch (storageError) {
                console.warn("IndexedDB error!", storageError);
            }
        } catch (e) { console.error("Error reading hooked stats:", e); }
    }

    // --- CSV EXPORT GENERATOR ---
    async function generateCSV(data, isAdvanced, btnElement) {
        let originalText = btnElement.innerText;
        btnElement.innerText = "Exporting...";
        btnElement.style.background = "#555";

        await new Promise(r => setTimeout(r, 50));

        try {
            let processData = data.map(row => {
                return isAdvanced ? { ...row, ...calculateAdvancedStats(row) } : row;
            });

            let headerSet = new Set();
            processData.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));

            let rawHeaders = Array.from(headerSet);
            let coreHeaders = rawHeaders.filter(h => h !== 'TIMESTAMP' && h !== 'REPLAY' && h !== 'BOT_REPLAY');
            let headers = ['TIMESTAMP', ...coreHeaders, 'REPLAY', 'BOT_REPLAY'];

            let csvContent = headers.join(',') + '\n';

            processData.forEach(row => {
                let values = headers.map(header => {
                    let val = row[header] !== undefined ? row[header] : 0;
                    if (typeof val === 'string') { val = '"' + val.replace(/"/g, '""') + '"'; }
                    return val;
                });
                csvContent += values.join(',') + '\n';
            });

            let now = new Date();
            let dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let name = isAdvanced ? `Jstris_Advanced_Stats_${dateStr}.csv` : `Jstris_Base_Stats_${dateStr}.csv`;

            let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = name;
            link.click();
        } catch (err) {
            alert("Failed to export. Check console.");
            console.error(err);
        } finally {
            btnElement.innerText = originalText;
            btnElement.style.background = "#222";
        }
    }

    // --- SMALL MENU ---
    function createMenu() {
        const targetContainer = document.getElementById('gstats');
        if (!targetContainer) {
            setTimeout(createMenu, 1000);
            return;
        }

        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = 'margin-top: -35px; margin-left: 50px; text-align: center; position: relative;';

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = 'Data Menu';
        toggleBtn.style.cssText = `
            background: #1e1e1e; color: #aaa; border: 1px solid #333; cursor: pointer;
            padding: 4px 10px; font-size: 11px; font-family: sans-serif; border-radius: 4px;
            transition: all 0.2s;
        `;
        toggleBtn.onmouseover = () => { toggleBtn.style.color = "#fff"; toggleBtn.style.borderColor = "#666"; };
        toggleBtn.onmouseout = () => { toggleBtn.style.color = "#aaa"; toggleBtn.style.borderColor = "#333"; };

        const panel = document.createElement('div');
        panel.style.cssText = `
            display: none; background: #111; border: 1px solid #444; border-radius: 4px;
            padding: 8px; position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
            margin-top: 5px; z-index: 100; min-width: 120px; box-shadow: 0px 4px 6px rgba(0,0,0,0.5);
        `;

        const viewStatsBtn = document.createElement('button');
        viewStatsBtn.innerText = 'View Stats';
        viewStatsBtn.style.cssText = `
            display: block; width: 100%; background: #2a2a2a; color: #ddd; border: 1px solid #555;
            cursor: pointer; padding: 5px; margin-bottom: 5px; font-size: 11px; border-radius: 3px;
        `;
        viewStatsBtn.onmouseover = () => viewStatsBtn.style.background = "#444";
        viewStatsBtn.onmouseout = () => viewStatsBtn.style.background = "#2a2a2a";
        viewStatsBtn.onclick = () => { panel.style.display = 'none'; renderStatsPage(); };

        const deleteLatestBtn = document.createElement('button');
        deleteLatestBtn.innerText = 'Delete Latest';
        deleteLatestBtn.style.cssText = `
            display: block; width: 100%; background: #442; color: #ddd; border: 1px solid #773;
            cursor: pointer; padding: 5px; margin-bottom: 5px; font-size: 11px; border-radius: 3px;
        `;
        deleteLatestBtn.onmouseover = () => deleteLatestBtn.style.background = "#663";
        deleteLatestBtn.onmouseout = () => deleteLatestBtn.style.background = "#442";
        deleteLatestBtn.onclick = async function() {
            try {
                let data = await localforage.getItem('jstris_log');
                if (data && data.length > 0) {
                    let latestMatch = data[data.length - 1];
                    let matchTime = latestMatch.TIMESTAMP || "Unknown";
                    if (confirm(`Remove the most recently logged match?\n\nTime: ${matchTime}\nBlocks: ${latestMatch.BLOCKS || '?'}`)) {
                        data.pop();
                        await localforage.setItem('jstris_log', data);
                        alert(`Latest entry removed successfully!`);
                        panel.style.display = 'none';
                    }
                } else { alert("No entries found to remove."); }
            } catch (err) { alert("Failed to remove data."); }
        };

        const clearBtn = document.createElement('button');
        clearBtn.innerText = 'Clear Data';
        clearBtn.style.cssText = `
            display: block; width: 100%; background: #422; color: #ddd; border: 1px solid #733;
            cursor: pointer; padding: 5px; font-size: 11px; border-radius: 3px;
        `;
        clearBtn.onmouseover = () => clearBtn.style.background = "#622";
        clearBtn.onmouseout = () => clearBtn.style.background = "#422";
        clearBtn.onclick = async function() {
            if (confirm("WARNING: This will permanently delete all logged Jstris match stats and replays. Are you sure?")) {
                await localforage.setItem('jstris_log', []);
                alert("Database cleared.");
                panel.style.display = 'none';
            }
        };

        toggleBtn.onclick = () => panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

        panel.appendChild(viewStatsBtn);
        panel.appendChild(deleteLatestBtn);
        panel.appendChild(clearBtn);
        menuContainer.appendChild(toggleBtn);
        menuContainer.appendChild(panel);
        targetContainer.appendChild(menuContainer);
    }

    // --- LARGE OVERLAY ---
    async function renderStatsPage() {
        let rawData;
        try { rawData = await localforage.getItem('jstris_log'); }
        catch (e) { alert("Error reading database!"); return; }

        if (!rawData || rawData.length === 0) {
            alert("No stats logged yet to view!"); return;
        }

        let displayData = rawData.map(row => ({ ...row, ...calculateAdvancedStats(row) }));
        let sortConfig = { column: 'TIMESTAMP', direction: 'desc' };

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

        // HEADER
        const headerBox = document.createElement('div');
        headerBox.style.cssText = `
            background: #222; padding: 15px; border-bottom: 2px solid #333;
            display: flex; justify-content: space-between; align-items: center;
        `;

        const title = document.createElement('h2');
        title.innerText = `Advanced Match Stats (${displayData.length} matches)`;
        title.style.cssText = 'color: #eee; margin: 0; font-size: 18px;';

        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display: flex; gap: 10px;';
        const btnStyle = `background: #222; color: #ddd; border: 1px solid #555; cursor: pointer; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;`;

        const expBaseBtn = document.createElement('button');
        expBaseBtn.innerText = 'Export Base CSV';
        expBaseBtn.style.cssText = btnStyle;
        expBaseBtn.onclick = () => generateCSV(rawData, false, expBaseBtn);

        const expAdvBtn = document.createElement('button');
        expAdvBtn.innerText = 'Export Advanced CSV';
        expAdvBtn.style.cssText = btnStyle + ' border-color: #357ebd; color: #7aa2f7;';
        expAdvBtn.onclick = () => generateCSV(rawData, true, expAdvBtn);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close X';
        closeBtn.style.cssText = btnStyle + `background: #833; color: white; border-color: #a44;`;
        closeBtn.onclick = () => document.body.removeChild(overlay);

        toolbar.appendChild(expBaseBtn);
        toolbar.appendChild(expAdvBtn);
        toolbar.appendChild(closeBtn);
        headerBox.appendChild(title);
        headerBox.appendChild(toolbar);

        // TABLE
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `flex-grow: 1; overflow: auto; padding: 0;`;

        const table = document.createElement('table');
        table.style.cssText = `width: 100%; border-collapse: collapse; color: #ccc; font-size: 12px; text-align: right; white-space: nowrap;`;


        let headerSet = new Set();
        displayData.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
        let allHeaders = Array.from(headerSet);

        let dataHeaders = allHeaders.filter(h => h !== 'REPLAY' && h !== 'BOT_REPLAY' && h !== 'TIMESTAMP');

        dataHeaders = ['TIMESTAMP', ...dataHeaders];

        let thead = document.createElement('thead');
        let headerRow = document.createElement('tr');
        let headerCells = {};

        let pRepTh = document.createElement('th');
        pRepTh.innerText = "Ply. Rep";
        pRepTh.style.cssText = `position: sticky; top: 0; background: #333; color: #fff; padding: 8px; border: 1px solid #444; z-index: 10; text-align: center;`;
        headerRow.appendChild(pRepTh);

        let bRepTh = document.createElement('th');
        bRepTh.innerText = "Bot Rep";
        bRepTh.style.cssText = `position: sticky; top: 0; background: #333; color: #fff; padding: 8px; border: 1px solid #444; border-right: 3px solid #555; z-index: 10; text-align: center;`;
        headerRow.appendChild(bRepTh);

        dataHeaders.forEach(header => {
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
                    sortConfig.column = header; sortConfig.direction = 'desc';
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

        const copyReplay = async (val, td, originalText) => {
            try {
                await navigator.clipboard.writeText(val);
                td.innerText = "[ ✔ ]";
                td.style.color = "#a6e3a1";
                setTimeout(() => { td.innerText = originalText; td.style.color = originalText === '[ P ]' ? '#7aa2f7' : '#f77a7a'; }, 1000);
            } catch (err) {
                td.innerText = "[ x ]";
                td.style.color = "#f38ba8";
            }
        };

        const updateTableBody = () => {
            dataHeaders.forEach(h => {
                headerCells[h].innerText = h + (sortConfig.column === h ? (sortConfig.direction === 'desc' ? ' ▼' : ' ▲') : '');
            });

            let sortedData = [...displayData].sort((a, b) => {
                let valA = a[sortConfig.column] !== undefined ? a[sortConfig.column] : '';
                let valB = b[sortConfig.column] !== undefined ? b[sortConfig.column] : '';
                let comp = (typeof valA === 'number' && typeof valB === 'number') ? valA - valB : String(valA).localeCompare(String(valB), undefined, { numeric: true });
                return sortConfig.direction === 'desc' ? -comp : comp;
            });

            tbody.innerHTML = '';
            sortedData.forEach((row, index) => {
                let tr = document.createElement('tr');
                tr.style.background = index % 2 === 0 ? '#1a1a1a' : '#111';

                let pRepTd = document.createElement('td');
                pRepTd.style.cssText = 'padding: 6px 8px; border: 1px solid #333; text-align: center;';
                if (row['REPLAY'] && row['REPLAY'].length > 20) {
                    pRepTd.innerText = "[ P ]";
                    pRepTd.title = "Copy Player Replay";
                    pRepTd.style.cssText += 'cursor: pointer; color: #7aa2f7; font-weight: bold;';
                    pRepTd.onclick = () => copyReplay(row['REPLAY'], pRepTd, "[ P ]");
                } else { pRepTd.innerText = "-"; }
                tr.appendChild(pRepTd);

                let bRepTd = document.createElement('td');
                bRepTd.style.cssText = 'padding: 6px 8px; border: 1px solid #333; border-right: 3px solid #555; text-align: center;';
                if (row['BOT_REPLAY'] && row['BOT_REPLAY'].length > 20) {
                    bRepTd.innerText = "[ B ]";
                    bRepTd.title = "Copy Bot Replay";
                    bRepTd.style.cssText += 'cursor: pointer; color: #f77a7a; font-weight: bold;';
                    bRepTd.onclick = () => copyReplay(row['BOT_REPLAY'], bRepTd, "[ B ]");
                } else { bRepTd.innerText = "-"; }
                tr.appendChild(bRepTd);

                dataHeaders.forEach(header => {
                    let td = document.createElement('td');
                    td.style.cssText = 'padding: 6px 8px; border: 1px solid #333;';
                    let val = row[header] !== undefined ? row[header] : '-';
                    td.innerText = val;
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
