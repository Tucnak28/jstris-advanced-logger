// ==UserScript==
// @name         Jstris Match Logger (Tetra Stats & Replay Edition)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Hooks StatsManager, logs metrics, minimal UI replays, Import/Export, and Advanced Filters.
// @match        https://jstris.jezevec10.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hook StatsManager
    let hookInterval = setInterval(() => {
        if (typeof StatsManager !== 'undefined' && StatsManager.prototype.render) {
            clearInterval(hookInterval);
            const originalRender = StatsManager.prototype.render;
            StatsManager.prototype.render = function() {
                window.myLiveStats = this;
                return originalRender.apply(this, arguments);
            };
            console.log("Advanced Tetra Stats & Replay Hook Injected! (v5.0 - Filter Edition)");
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
            try {
                let bot = game.Bots.bots[0];
                matchLog.BOT_NAME = bot.botType.name;

                if (bot.conf.speed === "PPS") {
                    // PPS mode
                    matchLog.BOT_SPEED = bot.conf.pps !== undefined ? bot.conf.pps : "PPS";
                } else {
                    // TB mode
                    matchLog.BOT_SPEED = bot.conf.speed !== undefined ? bot.conf.speed : "Unknown";
                }
            } catch (e) {
                matchLog.BOT_NAME = "Unknown";
                matchLog.BOT_SPEED = "Unknown";
            }

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
                            let timeVal = (parseInt(parts[0], 10) * 60) + parseFloat(parts[1]);
                            matchLog[key] = Math.round(timeVal * 1000) / 1000;
                        } else {
                            let num = Number(rawValue) || 0;
                            matchLog[key] = !Number.isInteger(num) ? Math.round(num * 1000) / 1000 : num;
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

    // --- CSV PARSER (For Imports) ---
    function parseCSV(csvText) {
        let lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        let headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
        let data = [];

        for (let i = 1; i < lines.length; i++) {
            let currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            let obj = {};
            for (let j = 0; j < headers.length; j++) {
                let val = currentline[j] ? currentline[j].replace(/^"|"$/g, '').trim() : '';
                if (val !== '' && !isNaN(val)) {
                    val = Number(val);
                    if (!Number.isInteger(val)) val = Math.round(val * 1000) / 1000;
                }
                obj[headers[j]] = val;
            }
            data.push(obj);
        }
        return data;
    }

    // --- CSV EXPORT GENERATOR ---
    async function generateCSV(data, isAdvanced, btnElement) {
        let originalText = btnElement.innerText;
        btnElement.innerText = "Exporting...";

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

        if (!rawData) rawData = [];

        let displayData = rawData.map(row => ({ ...row, ...calculateAdvancedStats(row) }));
        let currentFilteredData = [...displayData];
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

        contentBox.onclick = () => {
            if(exportDropdown) exportDropdown.style.display = 'none';
            if(filterDropdown) filterDropdown.style.display = 'none';
        };

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
        toolbar.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        const btnStyle = `background: #222; color: #ddd; border: 1px solid #555; cursor: pointer; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;`;

        // EXTRACT HEADERS FOR TABLES AND FILTERS
        let headerSet = new Set();
        displayData.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
        let allHeaders = Array.from(headerSet);
        let dataHeaders = allHeaders.filter(h => h !== 'REPLAY' && h !== 'BOT_REPLAY' && h !== 'TIMESTAMP');
        dataHeaders = ['TIMESTAMP', ...dataHeaders];

        // FILTER DROPDOWN SYSTEM
        const filterWrapper = document.createElement('div');
        filterWrapper.style.cssText = 'position: relative; display: inline-block;';

        const filterMainBtn = document.createElement('button');
        filterMainBtn.innerText = 'Filters ▼';
        filterMainBtn.style.cssText = btnStyle + ' border-color: #d7ba7d; color: #e5c07b;';

        const filterDropdown = document.createElement('div');
        filterDropdown.style.cssText = `
            display: none; position: absolute; top: 100%; right: 0; margin-top: 4px;
            background: #222; border: 1px solid #555; border-radius: 4px; z-index: 200;
            width: 320px; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            padding: 10px; cursor: default;
        `;
        filterDropdown.onclick = (e) => e.stopPropagation();

        const filterList = document.createElement('div');
        filterList.style.cssText = 'max-height: 200px; overflow-y: auto; margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px;';

        const addFilterBtn = document.createElement('button');
        addFilterBtn.innerText = '+ Add Filter Row';
        addFilterBtn.style.cssText = 'background: #333; color: #ddd; border: 1px solid #555; padding: 4px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-bottom: 10px; transition: background 0.2s;';
        addFilterBtn.onmouseover = () => addFilterBtn.style.background = '#444';
        addFilterBtn.onmouseout = () => addFilterBtn.style.background = '#333';

        function createFilterRow() {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; gap: 4px; align-items: center;';

            const statSel = document.createElement('select');
            statSel.style.cssText = 'background: #111; color: #ddd; border: 1px solid #444; border-radius: 3px; padding: 3px; width: 105px; font-size: 11px; outline: none;';
            dataHeaders.forEach(h => {
                let opt = document.createElement('option');
                opt.value = h; opt.innerText = h;
                statSel.appendChild(opt);
            });

            const opSel = document.createElement('select');
            opSel.style.cssText = 'background: #111; color: #ddd; border: 1px solid #444; border-radius: 3px; padding: 3px; width: 50px; font-size: 11px; text-align: center; outline: none;';
            ['=', '>', '<', '>=', '<=', '!=', 'has'].forEach(op => {
                let opt = document.createElement('option');
                opt.value = op; opt.innerText = op;
                opSel.appendChild(opt);
            });

            const valInp = document.createElement('input');
            valInp.type = 'text';
            valInp.placeholder = 'Value';
            valInp.style.cssText = 'background: #111; color: #ddd; border: 1px solid #444; border-radius: 3px; padding: 3px 5px; flex: 1; font-size: 11px; min-width: 0; outline: none;';

            valInp.addEventListener('keydown', (e) => e.stopPropagation());
            valInp.addEventListener('keyup', (e) => e.stopPropagation());
            valInp.addEventListener('keypress', (e) => e.stopPropagation());

            const rmBtn = document.createElement('button');
            rmBtn.innerText = 'X';
            rmBtn.style.cssText = 'background: #833; color: #fff; border: 1px solid #a44; border-radius: 3px; cursor: pointer; padding: 2px 7px; font-size: 11px; font-weight: bold; transition: background 0.2s;';
            rmBtn.onmouseover = () => rmBtn.style.background = '#a44';
            rmBtn.onmouseout = () => rmBtn.style.background = '#833';
            rmBtn.onclick = () => row.remove();

            row.appendChild(statSel);
            row.appendChild(opSel);
            row.appendChild(valInp);
            row.appendChild(rmBtn);

            row._getFilterData = () => ({
                stat: statSel.value,
                op: opSel.value,
                val: valInp.value
            });

            filterList.appendChild(row);
        }

        addFilterBtn.onclick = () => createFilterRow();

        const filterActions = document.createElement('div');
        filterActions.style.cssText = 'display: flex; justify-content: space-between; gap: 5px;';

        const applyFilterBtn = document.createElement('button');
        applyFilterBtn.innerText = 'Apply Filters';
        applyFilterBtn.style.cssText = 'background: #5b8254; color: #fff; border: 1px solid #4a6b45; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-weight: bold; flex: 1;';

        const clearFilterBtn = document.createElement('button');
        clearFilterBtn.innerText = 'Clear All';
        clearFilterBtn.style.cssText = 'background: #833; color: #fff; border: 1px solid #622; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-weight: bold; flex: 1;';

        const applyFiltersLogic = () => {
            let activeFilters = Array.from(filterList.children).map(row => row._getFilterData()).filter(f => f.val.trim() !== '');

            currentFilteredData = displayData.filter(row => {
                return activeFilters.every(f => {
                    let rowVal = row[f.stat];
                    let fVal = f.val.trim();

                    if (rowVal === undefined || rowVal === null) rowVal = '';

                    let numRow = Number(rowVal);
                    let numF = Number(fVal);
                    let isNum = !isNaN(numRow) && fVal !== '' && !isNaN(numF);

                    switch(f.op) {
                        case '=': return isNum ? numRow === numF : String(rowVal).toLowerCase() === String(fVal).toLowerCase();
                        case '!=': return isNum ? numRow !== numF : String(rowVal).toLowerCase() !== String(fVal).toLowerCase();
                        case '>': return isNum ? numRow > numF : String(rowVal).toLowerCase() > String(fVal).toLowerCase();
                        case '<': return isNum ? numRow < numF : String(rowVal).toLowerCase() < String(fVal).toLowerCase();
                        case '>=': return isNum ? numRow >= numF : String(rowVal).toLowerCase() >= String(fVal).toLowerCase();
                        case '<=': return isNum ? numRow <= numF : String(rowVal).toLowerCase() <= String(fVal).toLowerCase();
                        case 'has': return String(rowVal).toLowerCase().includes(String(fVal).toLowerCase());
                        default: return true;
                    }
                });
            });

            let counterText = currentFilteredData.length === displayData.length
                ? `${displayData.length} matches`
                : `${currentFilteredData.length} / ${displayData.length} matches`;
            title.innerText = `Advanced Match Stats (${counterText})`;

            updateTableBody();
        };

        applyFilterBtn.onclick = applyFiltersLogic;
        clearFilterBtn.onclick = () => {
            filterList.innerHTML = '';
            applyFiltersLogic();
        };

        filterActions.appendChild(applyFilterBtn);
        filterActions.appendChild(clearFilterBtn);
        filterDropdown.appendChild(filterList);
        filterDropdown.appendChild(addFilterBtn);
        filterDropdown.appendChild(filterActions);

        filterWrapper.appendChild(filterMainBtn);
        filterWrapper.appendChild(filterDropdown);

        filterMainBtn.onclick = (e) => {
            e.stopPropagation();
            exportDropdown.style.display = 'none';
            filterDropdown.style.display = filterDropdown.style.display === 'none' ? 'flex' : 'none';
        };

        // IMPORT LOGIC
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';

        fileInput.onchange = async (e) => {
            let file = e.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = async (event) => {
                let csvText = event.target.result;
                let importedData = parseCSV(csvText);

                if(importedData.length === 0) {
                    alert("Could not read any matches from the file.");
                    return;
                }

                let currentData = await localforage.getItem('jstris_log') || [];
                let existingTimestamps = new Set(currentData.map(d => d.TIMESTAMP));
                let addedCount = 0;

                importedData.forEach(row => {
                    if(row.TIMESTAMP && !existingTimestamps.has(row.TIMESTAMP)) {
                        currentData.push(row);
                        addedCount++;
                    }
                });

                await localforage.setItem('jstris_log', currentData);
                alert(`Successfully imported ${addedCount} new matches!`);

                document.body.removeChild(overlay);
                renderStatsPage();
            };
            reader.readAsText(file);
        };
        document.body.appendChild(fileInput);

        const importBtn = document.createElement('button');
        importBtn.innerText = 'Import CSV';
        importBtn.style.cssText = btnStyle + ' border-color: #5b8254; color: #a6e3a1;';
        importBtn.onclick = () => fileInput.click();

        // EXPORT DROPDOWN
        const exportWrapper = document.createElement('div');
        exportWrapper.style.cssText = 'position: relative; display: inline-block;';

        const exportMainBtn = document.createElement('button');
        exportMainBtn.innerText = 'Export ▼';
        exportMainBtn.style.cssText = btnStyle;

        const exportDropdown = document.createElement('div');
        exportDropdown.style.cssText = `
            display: none; position: absolute; top: 100%; right: 0; margin-top: 4px;
            background: #222; border: 1px solid #555; border-radius: 4px; z-index: 200;
            min-width: 140px; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            overflow: hidden;
        `;
        exportDropdown.onclick = (e) => e.stopPropagation();

        const dropBase = document.createElement('button');
        dropBase.innerText = 'Base CSV';
        dropBase.style.cssText = 'background: transparent; color: #ddd; border: none; padding: 10px; text-align: left; cursor: pointer; border-bottom: 1px solid #444; font-size: 12px; font-weight: bold; transition: background 0.2s;';
        dropBase.onmouseover = () => dropBase.style.background = '#333';
        dropBase.onmouseout = () => dropBase.style.background = 'transparent';
        dropBase.onclick = () => {
            exportDropdown.style.display = 'none';
            let exportData = rawData.filter(r => currentFilteredData.some(f => f.TIMESTAMP === r.TIMESTAMP));
            generateCSV(exportData, false, exportMainBtn);
        };

        const dropAdv = document.createElement('button');
        dropAdv.innerText = 'Advanced CSV';
        dropAdv.style.cssText = 'background: transparent; color: #7aa2f7; border: none; padding: 10px; text-align: left; cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s;';
        dropAdv.onmouseover = () => dropAdv.style.background = '#333';
        dropAdv.onmouseout = () => dropAdv.style.background = 'transparent';
        dropAdv.onclick = () => {
            exportDropdown.style.display = 'none';
            let exportData = rawData.filter(r => currentFilteredData.some(f => f.TIMESTAMP === r.TIMESTAMP));
            generateCSV(exportData, true, exportMainBtn);
        };

        exportMainBtn.onclick = (e) => {
            e.stopPropagation();
            filterDropdown.style.display = 'none';
            exportDropdown.style.display = exportDropdown.style.display === 'none' ? 'flex' : 'none';
        };

        exportDropdown.appendChild(dropBase);
        exportDropdown.appendChild(dropAdv);
        exportWrapper.appendChild(exportMainBtn);
        exportWrapper.appendChild(exportDropdown);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close X';
        closeBtn.style.cssText = btnStyle + `background: #833; color: white; border-color: #a44; margin-left: 10px;`;
        closeBtn.onclick = () => document.body.removeChild(overlay);

        toolbar.appendChild(importBtn);
        toolbar.appendChild(filterWrapper);
        toolbar.appendChild(exportWrapper);
        toolbar.appendChild(closeBtn);
        headerBox.appendChild(title);
        headerBox.appendChild(toolbar);

        // TABLE
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `flex-grow: 1; overflow: auto; padding: 0;`;

        const table = document.createElement('table');
        table.style.cssText = `width: 100%; border-collapse: collapse; color: #ccc; font-size: 12px; text-align: center; white-space: nowrap;`;

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

            let sortedData = [...currentFilteredData].sort((a, b) => {
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
                    td.style.cssText = 'padding: 6px 8px; border: 1px solid #333; text-align: center;';
                    let val = row[header] !== undefined ? row[header] : '-';

                    if (typeof val === 'number' && !Number.isInteger(val)) {
                        val = Math.round(val * 1000) / 1000;
                    }

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
