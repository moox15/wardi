const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.join(__dirname, 'temp_edge_profile');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Clean previous temporary user data to avoid stale cache
try {
  if (fs.existsSync(USER_DATA_DIR)) {
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }
} catch (e) {
  console.warn('Could not remove temp profile dir:', e.message);
}

// 1. In-process static server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Service-Worker-Allowed': '/'
    });
    res.end(data);
  });
});

async function main() {
  await new Promise((resolve) => server.listen(8080, resolve));
  console.log('Static server started at http://localhost:8080');

  // Launch Edge headless with remote debugging
  const edgeArgs = [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    'http://localhost:8080/'
  ];
  const edgeProc = spawn(EDGE_PATH, edgeArgs, { stdio: 'ignore' });
  console.log('Launched Edge headless (PID:', edgeProc.pid, ')');

  // Wait for remote debugging endpoint to become available
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const tabs = await res.json();
      if (tabs && tabs.length > 0) {
        const pageTab = tabs.find(t => t.type === 'page');
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          wsUrl = pageTab.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    throw new Error('Could not connect to Edge DevTools WebSocket endpoint.');
  }
  console.log('Connected to Edge DevTools endpoint:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function send(method, params = {}) {
    const currentId = id++;
    return new Promise((resolve, reject) => {
      pending.set(currentId, { resolve, reject });
      ws.send(JSON.stringify({ id: currentId, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async function setViewport(width, height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true
    });
  }

  async function saveScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath} (${buffer.length} bytes)`);
  }

  // Enable needed domains
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  console.log('\n--- STARTING AUTOMATED TEST & SCREENSHOT SUITE ---');
  const results = [];

  // Wait for app initialization (2s)
  await new Promise(r => setTimeout(r, 2000));
  await setViewport(390, 844);

  // TEST 1: Service Worker Registration & PWA Manifest
  try {
    const swStatus = await evaluate(`
      (async () => {
        let swReg = null;
        for (let i = 0; i < 15; i++) {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs.length > 0) {
            swReg = regs[0];
            break;
          }
          await new Promise(r => setTimeout(r, 200));
        }
        const manifestLink = document.querySelector('link[rel="manifest"]');
        return {
          registered: !!swReg,
          scope: swReg ? swReg.scope : null,
          manifestHref: manifestLink ? manifestLink.getAttribute('href') : null
        };
      })()
    `);
    console.log('✓ TEST 1 (PWA & Service Worker):', swStatus);
    results.push({ name: 'PWA Service Worker & Manifest', passed: swStatus.registered && swStatus.manifestHref === './manifest.json', details: swStatus });
  } catch (err) {
    console.error('✗ TEST 1 Failed:', err);
    results.push({ name: 'PWA Service Worker & Manifest', passed: false, error: err.message });
  }

  // TEST 2: Dua Management CRUD & Modal
  try {
    await evaluate(`window.app.navigateTo('duas');`);
    await new Promise(r => setTimeout(r, 400));
    
    // Save screenshot of Duas screen
    await saveScreenshot('test_duas_section_390.png');

    // Open add modal
    await evaluate(`window.duasManager.openModal();`);
    await new Promise(r => setTimeout(r, 300));

    // Verify modal visibility & z-index
    const modalCheck = await evaluate(`(() => {
      const modal = document.getElementById('dua-modal');
      const overlay = document.getElementById('modal-overlay');
      const computed = window.getComputedStyle(modal);
      const overlayComputed = window.getComputedStyle(overlay);
      return {
        display: computed.display,
        zIndex: computed.zIndex,
        overlayDisplay: overlayComputed.display,
        overlayZIndex: overlayComputed.zIndex,
        isAboveOverlay: parseInt(computed.zIndex) > parseInt(overlayComputed.zIndex)
      };
    })()`);
    console.log('✓ Dua modal display & stacking context:', modalCheck);
    await saveScreenshot('test_dua_modal_open_390.png');

    // Validation check on empty submit
    const validationCheck = await evaluate(`(() => {
      document.getElementById('dua-text-input').value = '';
      window.duasManager.saveDuaFromModal();
      const input = document.getElementById('dua-text-input');
      return {
        hasInputError: input.classList.contains('input-error'),
        toastCount: document.querySelectorAll('.toast').length
      };
    })()`);
    console.log('✓ Validation check on empty submit:', validationCheck);

    // Add a valid dua
    const testDuaText = 'اللهم إنا نسألك من الخير كله عاجله وآجله ما علمنا منه وما لم نعلم (اختبار آلي)';
    await evaluate(`
      document.getElementById('dua-text-input').value = ${JSON.stringify(testDuaText)};
      document.getElementById('dua-category-select').value = 'personal';
      document.getElementById('dua-repetition-input').value = '3';
      window.duasManager.saveDuaFromModal();
    `);
    await new Promise(r => setTimeout(r, 600));

    const afterAdd = await evaluate(`(async () => {
      const allDuas = await window.storage.getAllItems('duas');
      const domCards = Array.from(document.querySelectorAll('.dua-card'));
      const foundInDom = domCards.some(card => card.innerText.includes('اختبار آلي'));
      const foundInDb = allDuas.find(d => d.text.includes('اختبار آلي'));
      return {
        foundInDom,
        dbId: foundInDb ? foundInDb.id : null,
        totalDbCount: allDuas.length
      };
    })()`);
    console.log('✓ Added Dua persistence verified:', afterAdd);

    // Edit the dua
    const createdId = afterAdd.dbId;
    await evaluate(`window.duasManager.openModal(${createdId});`);
    await new Promise(r => setTimeout(r, 300));
    await evaluate(`
      document.getElementById('dua-repetition-input').value = '7';
      window.duasManager.saveDuaFromModal();
    `);
    await new Promise(r => setTimeout(r, 600));

    const afterEdit = await evaluate(`(async () => {
      const d = await window.storage.getItem('duas', ${createdId});
      return { repetitionCount: d ? d.repetitionCount : null };
    })()`);
    console.log('✓ Edited Dua verified:', afterEdit);

    // Delete the dua (simulate confirm)
    await evaluate(`
      window.confirm = () => true;
      window.duasManager.deleteDua(${createdId});
    `);
    await new Promise(r => setTimeout(r, 600));

    const afterDelete = await evaluate(`(async () => {
      const d = await window.storage.getItem('duas', ${createdId});
      return { stillExists: !!d };
    })()`);
    console.log('✓ Deleted Dua verified (should be false):', afterDelete);

    const duaPassed = modalCheck.isAboveOverlay && 
                      validationCheck.hasInputError && 
                      afterAdd.foundInDom && 
                      afterEdit.repetitionCount === 7 && 
                      !afterDelete.stillExists;

    results.push({
      name: 'Dua Management CRUD & Modal',
      passed: duaPassed,
      details: { modalCheck, validationCheck, afterAdd, afterEdit, afterDelete }
    });
  } catch (err) {
    console.error('✗ TEST 2 Failed:', err);
    results.push({ name: 'Dua Management CRUD & Modal', passed: false, error: err.message });
  }

  // TEST 3: Prayer Calculation & Tracking Section
  try {
    await evaluate(`window.app.navigateTo('prayer');`);
    await new Promise(r => setTimeout(r, 500));

    const prayerData = await evaluate(`(() => {
      const rows = document.querySelectorAll('.prayer-time-row');
      const activeNext = document.querySelector('.active-next-prayer');
      const heroCard = document.getElementById('prayer-hero-card');
      const qiblaDeg = document.getElementById('qibla-degree-val');
      const weeklyMatrix = document.querySelectorAll('.weekly-day-col');

      return {
        rowsCount: rows.length,
        activeNextFound: !!activeNext,
        heroCardHtml: heroCard ? heroCard.innerText.slice(0, 100) : null,
        qiblaDegreeText: qiblaDeg ? qiblaDeg.innerText : null,
        weeklyDaysCount: weeklyMatrix.length
      };
    })()`);
    console.log('✓ Prayer times and widgets:', prayerData);

    // Toggle Fajr prayer to 'صليت'
    const toggleResult = await evaluate(`(async () => {
      await window.prayerManager.togglePrayerDone('fajr');
      const today = new Date().toISOString().split('T')[0];
      const record = await window.storage.getPrayerRecord(today);
      return {
        recordFajr: record ? record.fajr : null,
        recordCompleted: record ? record.fajr === true : false
      };
    })()`);
    console.log('✓ Prayer toggle (Fajr) verified in DB:', toggleResult);

    await saveScreenshot('test_prayer_section_390.png');

    results.push({
      name: 'Prayer Engine & Tracking',
      passed: prayerData.rowsCount === 6 && prayerData.weeklyDaysCount === 7 && toggleResult.recordFajr === true,
      details: { prayerData, toggleResult }
    });
  } catch (err) {
    console.error('✗ TEST 3 Failed:', err);
    results.push({ name: 'Prayer Engine & Tracking', passed: false, error: err.message });
  }

  // TEST 4: Tasbeeh Section UI Refinement
  try {
    await evaluate(`window.app.navigateTo('tasbeeh');`);
    await new Promise(r => setTimeout(r, 500));

    // Tap 3 times to see counter increase smoothly
    await evaluate(`
      window.tasbeehManager.increment();
      window.tasbeehManager.increment();
      window.tasbeehManager.increment();
    `);
    await new Promise(r => setTimeout(r, 300));

    const tasbeehData = await evaluate(`(() => {
      const countEl = document.getElementById('tasbeeh-count-display');
      const tapBtn = document.getElementById('tasbeeh-increment-btn');
      const controlsRow = document.querySelector('.tasbeeh-controls-row');
      const phraseList = document.querySelector('.phrase-select-list');
      const statsCard = document.querySelector('.tasbeeh-stats-card');

      return {
        currentCount: countEl ? countEl.innerText : null,
        tapBtnExists: !!tapBtn,
        controlsRowExists: !!controlsRow,
        phraseListExists: !!phraseList,
        statsCardExists: !!statsCard
      };
    })()`);
    console.log('✓ Tasbeeh section verified:', tasbeehData);

    await saveScreenshot('test_tasbeeh_section_390.png');

    results.push({
      name: 'Tasbeeh Ergonomic Controls & UI',
      passed: tasbeehData.currentCount === '3' && tasbeehData.tapBtnExists && tasbeehData.controlsRowExists,
      details: tasbeehData
    });
  } catch (err) {
    console.error('✗ TEST 4 (Tasbeeh) Failed:', err);
    results.push({ name: 'Tasbeeh Ergonomic Controls & UI', passed: false, error: err.message });
  }

  // TEST 5: Statistics & History Section UI Refinement
  try {
    await evaluate(`window.app.navigateTo('history');`);
    await new Promise(r => setTimeout(r, 500));

    const historyData = await evaluate(`(() => {
      const metricCards = document.querySelectorAll('.metric-card');
      const chartContainer = document.getElementById('history-chart-container');
      const recordsRows = document.querySelectorAll('.record-row, .record-item');

      return {
        metricCardsCount: metricCards.length,
        hasChartOrEmptyState: chartContainer ? chartContainer.children.length > 0 : false,
        recordsRowsCount: recordsRows.length
      };
    })()`);
    console.log('✓ History section verified:', historyData);

    await saveScreenshot('test_history_section_390.png');

    results.push({
      name: 'Statistics & History UI Refinement',
      passed: historyData.metricCardsCount === 3 && historyData.hasChartOrEmptyState && historyData.recordsRowsCount >= 3,
      details: historyData
    });
  } catch (err) {
    console.error('✗ TEST 5 (History) Failed:', err);
    results.push({ name: 'Statistics & History UI Refinement', passed: false, error: err.message });
  }

  // TEST 6: Personal Dashboard (Home Section)
  try {
    await evaluate(`window.app.navigateTo('home');`);
    await new Promise(r => setTimeout(r, 600));

    const dashData = await evaluate(`(() => {
      const overallPct = document.getElementById('dashboard-overall-pct');
      const overallFill = document.getElementById('dashboard-overall-fill');
      const streakCount = document.getElementById('dashboard-streak-count');
      const summaryCards = document.querySelectorAll('.dash-summary-card');
      const quickActionTiles = document.querySelectorAll('.quick-action-tile');
      const timelineItems = document.querySelectorAll('.timeline-row-item, .empty-timeline-card');
      const achievementCards = document.querySelectorAll('.achievement-card');

      return {
        overallPctText: overallPct ? overallPct.innerText : null,
        overallFillWidth: overallFill ? overallFill.style.width : null,
        streakCountText: streakCount ? streakCount.innerText : null,
        summaryCardsCount: summaryCards.length,
        quickActionTilesCount: quickActionTiles.length,
        timelineCount: timelineItems.length,
        achievementCount: achievementCards.length
      };
    })()`);
    console.log('✓ Dashboard elements verified:', dashData);

    await saveScreenshot('test_dashboard_390.png');

    results.push({
      name: 'Comprehensive Personal Dashboard',
      passed: dashData.summaryCardsCount === 5 && dashData.quickActionTilesCount === 8 && dashData.achievementCount >= 6,
      details: dashData
    });
  } catch (err) {
    console.error('✗ TEST 6 Failed:', err);
    results.push({ name: 'Comprehensive Personal Dashboard', passed: false, error: err.message });
  }

  // TEST 7: Responsive Check (360px, 390px, 430px)
  try {
    const responsiveResults = {};
    for (const width of [360, 390, 430]) {
      await setViewport(width, 844);
      await new Promise(r => setTimeout(r, 200));
      const overflow = await evaluate(`(() => {
        const html = document.documentElement;
        return {
          scrollWidth: html.scrollWidth,
          clientWidth: html.clientWidth,
          hasOverflow: html.scrollWidth > html.clientWidth + 1
        };
      })()`);
      responsiveResults[width] = overflow;
      await saveScreenshot(`test_responsive_${width}.png`);
      console.log(`✓ Responsive check at ${width}px:`, overflow);
    }

    const allPassed = Object.values(responsiveResults).every(r => !r.hasOverflow);
    results.push({
      name: 'Mobile Responsive Overflow Check (360px, 390px, 430px)',
      passed: allPassed,
      details: responsiveResults
    });
  } catch (err) {
    console.error('✗ TEST 7 Failed:', err);
    results.push({ name: 'Mobile Responsive Overflow Check', passed: false, error: err.message });
  }

  // Print Summary
  console.log('\n========================================');
  console.log('TEST SUITE EXECUTION SUMMARY');
  console.log('========================================');
  let passCount = 0;
  for (const r of results) {
    console.log(`${r.passed ? '✓ PASS' : '✗ FAIL'}: ${r.name}`);
    if (r.passed) passCount++;
  }
  console.log(`Passed: ${passCount} / ${results.length}`);

  // Shutdown
  ws.close();
  edgeProc.kill('SIGKILL');
  server.close();
  console.log('Test runner complete. Exiting.');
}

main().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
