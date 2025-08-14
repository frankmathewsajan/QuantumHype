document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('message-form');
    const resultDiv = document.getElementById('result');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        resultDiv.innerHTML = 'Sending message...';
        const message = document.getElementById('message').value;
        const eavesdrop = document.getElementById('eavesdrop').checked;
        const response = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, eavesdrop })
        });
        const data = await response.json();
        let eveStatus = data.eve_detected
            ? '<span style="color:red;font-weight:bold;">Eavesdropping Detected! (QBER: ' + (data.qber*100).toFixed(2) + '%)</span>'
            : '<span style="color:green;font-weight:bold;">No Eavesdropping Detected (QBER: ' + (data.qber*100).toFixed(2) + '%)</span>';
        let deliveryStatus = (data.delivered_message === data.original_message)
            ? '<span style="color:green;font-weight:bold;">Message delivered securely to Bob!</span>'
            : '<span style="color:orange;font-weight:bold;">Message corrupted or incomplete.</span>';
        resultDiv.innerHTML = `
            <div style="margin-bottom:10px;">${eveStatus}</div>
            <div style="margin-bottom:10px;">${deliveryStatus}</div>
            <b>Alice sent:</b> ${data.original_message}<br>
            <b>Bob received:</b> ${data.delivered_message || '<i>(not enough bits to reconstruct)</i>'}<br>
            <details style="margin-top:10px;"><summary>Show BB84 Details</summary>
                <b>Total bits sent:</b> ${data.total_bits}<br>
                <b>Sifted key length:</b> ${data.sifted_key_length}<br>
                <b>Final shared key (Alice):</b> ${data.alice_key.join(' ')}<br>
                <b>Final shared key (Bob):</b> ${data.bob_key.join(' ')}<br>
            </details>
        `;
    });
});

let qberChart;
let qberData = [];
let msgCount = 0;

function initChart() {
    const ctx = document.getElementById('qberChart').getContext('2d');
    qberChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'QBER (%)',
                data: [],
                borderColor: 'rgba(99,102,241,1)',
                backgroundColor: 'rgba(99,102,241,0.1)',
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

function updateStats(eveDetected, qber) {
    document.getElementById('stat-eve').innerHTML = 'Eve status: <span class="font-semibold">' + (eveDetected ? 'Detected' : 'None') + '</span>';
    document.getElementById('stat-last').innerHTML = 'Last QBER: <span class="font-semibold">' + (qber*100).toFixed(2) + '%</span>';
    msgCount += 1;
    document.getElementById('stat-count').innerHTML = 'Messages exchanged: <span class="font-semibold">' + msgCount + '</span>';
}

function addLog(entry) {
    const div = document.createElement('div');
    div.className = 'message-log-item';
    div.innerHTML = entry;
    const log = document.getElementById('message-log');
    log.prepend(div);
}

function addAliceMessage(text) {
    const m = document.createElement('div');
    m.className = 'alice';
    m.textContent = text;
    document.getElementById('alice-messages').prepend(m);
}
function addBobMessage(text) {
    const m = document.createElement('div');
    m.className = 'bob';
    m.textContent = text;
    document.getElementById('bob-messages').prepend(m);
}

// Render detailed BB84 steps into HTML
function renderSteps(steps) {
    if (!steps || !steps.length) return '';
    let html = '';
    for (const s of steps) {
        if (s.step === 'text_to_bits') {
            html += `<div><b>Text → Bits</b>: "${s.text}" → <code>${s.bit_string}</code></div>`;
        } else if (s.step === 'alice_bases') {
            html += `<div><b>Alice bases</b>: [${s.bases.join(', ')}]</div>`;
        } else if (s.step === 'alice_prepare') {
            html += `<div><b>Alice prepared states</b>:<ul class="list-disc pl-6">`;
            s.prepared.forEach((p, i) => {
                html += `<li>#${i}: bit=${p.bit}, basis=${p.basis}, state=${p.state}</li>`;
            });
            html += `</ul></div>`;
        } else if (s.step === 'eve_actions') {
            html += `<div><b>Eve actions</b>:<ul class="list-disc pl-6">`;
            s.actions.forEach(a => {
                html += `<li>#${a.index}: eve_basis=${a.eve_basis}, eve_result=${a.eve_result}, resent=${a.resent_state}</li>`;
            });
            html += `</ul></div>`;
        } else if (s.step === 'bob_bases') {
            html += `<div><b>Bob bases</b>: [${s.bases.join(', ')}]</div>`;
        } else if (s.step === 'bob_results') {
            html += `<div><b>Bob measurement results</b>: [${s.results.join(', ')}]</div>`;
        } else if (s.step === 'sifting') {
            html += `<div><b>Sifting</b>: indices kept [${s.sifted_indices.join(', ')}], Alice sifted=[${s.alice_sifted.join(', ')}], Bob sifted=[${s.bob_sifted.join(', ')}]</div>`;
        } else if (s.step === 'qber') {
            html += `<div><b>QBER</b>: errors=${s.errors}, qber=${(s.qber*100).toFixed(2)}% — eve_detected=${s.eve_detected}</div>`;
        } else if (s.step === 'reconstruction') {
            if (s.reconstruction && s.reconstruction.length) {
                html += `<div><b>Reconstruction</b>:<ul class="list-disc pl-6">`;
                s.reconstruction.forEach(r => {
                    html += `<li>byte#${r.byte_index}: bits=[${r.bits.join('')}], value=${r.value}, char='${r.char}'</li>`;
                });
                html += `</ul></div>`;
            } else {
                html += `<div><b>Reconstruction</b>: Not enough bits to reconstruct message</div>`;
            }
        } else {
            html += `<div><b>${s.step}</b>: ${JSON.stringify(s)}</div>`;
        }
    }
    return html;
}

async function sendMessage(sender, message, eavesdrop, encrypted=false) {
    // call backend to simulate BB84 for this message
    const resp = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, eavesdrop, encrypted, sender })
    });
    const data = await resp.json();
    // update chart
    qberChart.data.labels.unshift(new Date().toLocaleTimeString());
    qberChart.data.datasets[0].data.unshift((data.qber*100).toFixed(2));
    if (qberChart.data.labels.length > 20) { qberChart.data.labels.pop(); qberChart.data.datasets[0].data.pop(); }
    qberChart.update();

    updateStats(data.eve_detected, data.qber);

    // deliver message to the other user; show encryption indicators
    if (sender === 'alice') {
        addAliceMessage('You' + (encrypted ? ' (encrypted)' : '') + ': ' + message);
        if (data.delivered_message) {
            addBobMessage('Alice' + (encrypted ? ' (decrypted)' : '') + ': ' + data.delivered_message);
        } else {
            addBobMessage('Alice: (message corrupted)');
        }
        const logHtml = '<b>Alice → Bob</b>' + (encrypted ? ' [encrypted]' : '') + ': ' + message + '<br>QBER: ' + (data.qber*100).toFixed(2) + '% — Eve: ' + (data.eve_detected ? 'Yes' : 'No');
        if (data.steps) {
            addLog(logHtml + '<details class="mt-2"><summary>Show detailed steps</summary><div class="mt-2">' + renderSteps(data.steps) + '</div></details>');
        } else {
            addLog(logHtml);
        }
    } else {
        addBobMessage('You' + (encrypted ? ' (encrypted)' : '') + ': ' + message);
        if (data.delivered_message) {
            addAliceMessage('Bob' + (encrypted ? ' (decrypted)' : '') + ': ' + data.delivered_message);
        } else {
            addAliceMessage('Bob: (message corrupted)');
        }
        const logHtml = '<b>Bob → Alice</b>' + (encrypted ? ' [encrypted]' : '') + ': ' + message + '<br>QBER: ' + (data.qber*100).toFixed(2) + '% — Eve: ' + (data.eve_detected ? 'Yes' : 'No');
        if (data.steps) {
            addLog(logHtml + '<details class="mt-2"><summary>Show detailed steps</summary><div class="mt-2">' + renderSteps(data.steps) + '</div></details>');
        } else {
            addLog(logHtml);
        }
    }
}

// Wire up UI
function wireUI() {
    initChart();
    document.getElementById('alice-send').addEventListener('click', async () => {
        const msg = document.getElementById('alice-message').value || '';
        const eve = document.getElementById('eavesdrop-toggle').checked;
        if (!msg) return;
        await sendMessage('alice', msg, eve, false);
        document.getElementById('alice-message').value = '';
    });
    document.getElementById('alice-send-anon').addEventListener('click', async () => {
        const msg = document.getElementById('alice-message').value || '';
        const eve = document.getElementById('eavesdrop-toggle').checked;
        if (!msg) return;
        await sendMessage('alice', msg, eve, true);
        document.getElementById('alice-message').value = '';
    });
    document.getElementById('bob-send').addEventListener('click', async () => {
        const msg = document.getElementById('bob-message').value || '';
        const eve = document.getElementById('eavesdrop-toggle').checked;
        if (!msg) return;
        await sendMessage('bob', msg, eve, false);
        document.getElementById('bob-message').value = '';
    });
    document.getElementById('bob-send-anon').addEventListener('click', async () => {
        const msg = document.getElementById('bob-message').value || '';
        const eve = document.getElementById('eavesdrop-toggle').checked;
        if (!msg) return;
        await sendMessage('bob', msg, eve, true);
        document.getElementById('bob-message').value = '';
    });
    document.getElementById('clear-btn').addEventListener('click', () => {
        document.getElementById('alice-messages').innerHTML = '';
        document.getElementById('bob-messages').innerHTML = '';
        document.getElementById('message-log').innerHTML = '';
        qberChart.data.labels = [];
        qberChart.data.datasets[0].data = [];
        qberChart.update();
        msgCount = 0;
        document.getElementById('stat-count').innerHTML = 'Messages exchanged: <span class="font-semibold">0</span>';
    });
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUI);
} else {
    wireUI();
}
