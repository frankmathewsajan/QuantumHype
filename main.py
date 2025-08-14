import random
from qiskit import QuantumCircuit
from qiskit_aer import Aer

def bb84(num_bits=20, eavesdrop=False):
    # Step 1: Alice chooses random bits and bases
    alice_bits = [random.randint(0, 1) for _ in range(num_bits)]
    alice_bases = [random.randint(0, 1) for _ in range(num_bits)]  # 0=Z basis, 1=X basis

    # Step 2: Alice prepares qubits
    qubits = []
    for bit, basis in zip(alice_bits, alice_bases):
        qc = QuantumCircuit(1, 1)
        if bit == 1:
            qc.x(0)  # Encode bit
        if basis == 1:

            from flask import Flask, render_template, jsonify

            app = Flask(__name__)

            @app.route('/')
            def index():
                return render_template('index.html')

            @app.route('/api/hello')
            def hello_api():
                return jsonify({'message': 'Hello from the Flask backend!'})

            if __name__ == '__main__':
                app.run(debug=True)

    # Step 3: Eve intercepts (optional)
    if eavesdrop:
        for qc in qubits:
            eve_basis = random.randint(0, 1)
            if eve_basis == 1:
                qc.h(0)
            qc.measure(0, 0)  # Eve measures
            qc.barrier()
            qc.reset(0)       # Resend qubit
            qc.barrier()

    # Step 4: Bob chooses random bases and measures
    bob_bases = [random.randint(0, 1) for _ in range(num_bits)]
    results = []
    simulator = Aer.get_backend('aer_simulator')

    for qc, basis in zip(qubits, bob_bases):
        circ = qc.copy()
        if basis == 1:
            circ.h(0)
        circ.measure(0, 0)

        # In Qiskit 1.x, use run() instead of execute()
        job = simulator.run(circ, shots=1, memory=True)
        result = job.result()
        results.append(int(result.get_memory()[0]))

    # Step 5: Key sifting
    sifted_key_alice = []
    sifted_key_bob = []
    for i in range(num_bits):
        if alice_bases[i] == bob_bases[i]:
            sifted_key_alice.append(alice_bits[i])
            sifted_key_bob.append(results[i])

    # Step 6: Calculate QBER
    errors = sum([a != b for a, b in zip(sifted_key_alice, sifted_key_bob)])
    qber = errors / len(sifted_key_alice) if sifted_key_alice else 0

    print("\n=== BB84 Simulation Results ===")
    print(f"Total bits sent: {num_bits}")
    print(f"Sifted key length: {len(sifted_key_alice)}")
    print(f"QBER: {qber*100:.2f}%")
    print("Final shared key (Alice):", sifted_key_alice)
    print("Final shared key (Bob)  :", sifted_key_bob)

# Run without Eve
print("Run 1: Without Eve (Expected low QBER)")
bb84(num_bits=20, eavesdrop=False)

# Run with Eve
print("\nRun 2: With Eve (Expected high QBER)")
bb84(num_bits=20, eavesdrop=True)
