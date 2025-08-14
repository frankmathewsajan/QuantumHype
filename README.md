# QuantumHype — Quantum Message App Simulator

Professional documentation for the QuantumHype project.

Table of contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Frontend Usage](#frontend-usage)
- [Detailed Step View](#detailed-step-view)
- [Development Notes](#development-notes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Project Overview

QuantumHype is an educational full-stack simulator that demonstrates quantum key distribution (BB84) used to secure messages between two users (Alice and Bob). The project combines a Python Flask backend that uses Qiskit/Aer to simulate quantum operations and a modern frontend (Tailwind + Chart.js + Flowbite) that visualizes the whole process.

Use cases:
- Interactive learning of BB84 and quantum eavesdropping detection
- Visual trace of message → bits → qubits → measurement → reconstruction
- Simulated encrypted messaging using BB84-generated sifted keys

## Features
- Web UI built with Tailwind CSS, Flowbite utilities and Chart.js visualizations
- Flask backend exposing a REST API that runs BB84 simulations using Qiskit Aer
- Alice and Bob can send plain or encrypted messages to each other
- Toggle an eavesdropper (Eve) to observe the effect on QBER and message integrity
- Detailed step-by-step trace for each message (bits, bases, prepared states, Eve actions, sifting, reconstruction)
- QBER graph over recent messages and a message exchange log

## Architecture
- Backend: `main.py` — Flask application
  - Simulation logic: BB84 encoding, optional Eve interception, Bob's measurements, sifting, QBER computation
  - API endpoint: `POST /api/message` (see API Reference below)
- Frontend: `templates/index.html`, `static/app.js`, `static/style.css`
  - UI components for Alice and Bob, message log, QBER chart and detailed step viewer
- Libraries & tools: Flask, Qiskit (Aer), Tailwind (CDN), Chart.js (CDN), Flowbite (CDN)

## Prerequisites
- Python 3.10+ (3.13 recommended in the workspace)
- pip
- Recommended: Virtual environment (`venv`)
- Qiskit Aer components may have platform-specific requirements. On Windows, installing the Aer package can require a recent pip and wheels. See Qiskit documentation if installation fails.

## Installation

Open PowerShell (the project was developed on Windows) and run:

```powershell
# create virtual environment
python -m venv .venv
# activate
.\.venv\Scripts\Activate.ps1
# install packages
pip install flask qiskit qiskit-aer
```

If you prefer, install additional dev tools:

```powershell
pip install -U pip setuptools wheel
```

Note: For production or improved frontend workflow, install Tailwind via npm and bundle assets. The current project uses CDN-hosted Tailwind/Chart.js/Flowbite for simplicity.

## Running the App

Activate the virtual environment and run the Flask app:

```powershell
.\.venv\Scripts\Activate.ps1
python main.py
```

Open the app in your browser at `http://127.0.0.1:5000/`.

## API Reference

### POST /api/message
Simulate sending a message from one user to another using BB84. This endpoint runs a BB84 simulation for the message and returns simulation data including sifted keys, QBER and a detailed step trace.

Request JSON body:
- `message` (string) — The plaintext message to send.
- `eavesdrop` (bool) — Whether Eve is present during transmission.
- `encrypted` (bool) — If true, run BB84 key generation and XOR-encrypt the message using the sifted key.
- `sender` (string) — `"alice"` or `"bob"` — indicates sender of the message (used when creating/encrypting keys).

Response JSON fields (selection):
- `original_message` — message sent
- `delivered_message` — reconstructed message at receiver (or null if reconstruction failed)
- `eve_detected` — boolean indicating eavesdrop detection (based on QBER threshold)
- `qber` — quantum bit error rate (0..1)
- `alice_key` / `bob_key` — sifted bits used as the shared key (arrays of 0/1)
- `sifted_indices` — indices kept after sifting
- `steps` — array describing each step in the simulation (text->bits, prepared states, Eve actions, Bob results, sifting, reconstruction)

Example (PowerShell/curl):

```powershell
curl -X POST http://127.0.0.1:5000/api/message -H "Content-Type: application/json" -d '{"message":"Hi Alice","eavesdrop":true,"encrypted":false,"sender":"bob"}'
```

## Frontend Usage
- Alice and Bob each have input boxes and send buttons.
- Toggle the "Eavesdropper (Eve)" switch to insert Eve into the quantum channel.
- "Send Encrypted" will attempt to generate a BB84-based sifted key and XOR-encrypt the message before transmission. If insufficient sifted bits are produced, the message delivery will fail (frontend displays corrupted message and log entry).
- Open the message's "Show detailed steps" in the Exchange History to see the full trace.

## Detailed Step View
Each sent message returns a `steps` array. The UI displays the following step types:
- `text_to_bits` — shows the original text and the bit string representation (ASCII, 8 bits/char).
- `alice_bases` — the random bases Alice used to prepare each qubit.
- `alice_prepare` — a per-bit summary describing the prepared quantum state (|0>, |1>, |+>, |->).
- `eve_actions` — when Eve is enabled, shows Eve's measurement basis, result, and what she resends.
- `bob_bases` — Bob's measurement bases.
- `bob_results` — Bob's measurement outcomes.
- `sifting` — indices and bits that Alice and Bob keep after comparing bases.
- `qber` — error count and calculated QBER; eavesdrop detection flag.
- `reconstruction` — per-byte reconstruction showing bit groups, numeric values and decoded characters.

These are intended for education and visualization of the BB84 protocol.

## Development Notes
- The Flask backend is intentionally simple and synchronous to keep the simulation deterministic and easy to follow.
- For real-time multi-user experience, consider moving to WebSockets (Flask-SocketIO or FastAPI + WebSockets).
- Current encryption uses a simple XOR between the message bits and the sifted key — this is for demonstration only and is not production-grade cryptography.
- The Qiskit Aer simulator runs locally; Qiskit may be slow for long messages. Consider reducing message length or using dedicated key-generation with a fixed key length.

## Testing
- Manual testing via the web UI is recommended.
- Use the API examples to automate tests. Example: send several messages with/without Eve and observe QBER changes and logged steps.

## Troubleshooting
- Qiskit Aer installation issues on Windows: ensure `pip` is up-to-date and that you installed the appropriate wheel for your Python version. See Qiskit installation docs: https://qiskit.org/documentation/install.html
- If the frontend shows `null` for `delivered_message`, the sifted key did not provide enough bits for full reconstruction — reduce message length or allow unencrypted mode.

## Contributing
Contributions are welcome. Suggested workflow:
1. Fork the repository
2. Create a feature branch
3. Open a pull request with a clear description and tests or screenshots for UI changes

Please keep changes focused and document any API changes in this README.

## License
MIT License — see `LICENSE` if included.

## Acknowledgements
- Qiskit (IBM) for quantum simulation primitives
- Tailwind CSS, Flowbite and Chart.js for frontend UI and visualization

---

If you'd like, I can also:
- Add a `requirements.txt` and `setup` script,
- Add example screenshots into a `docs/` folder,
- Add step-by-step screenshots/gifs and a short tutorial walkthrough.
