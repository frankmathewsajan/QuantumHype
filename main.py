import random
from qiskit import QuantumCircuit
from qiskit_aer import Aer
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

def bb84_message_sim(message, eavesdrop=False):
    steps = []
    # Convert message to bits (ASCII, 8 bits per char)
    bits = []
    for c in message:
        bits.extend([int(b) for b in format(ord(c), '08b')])
    num_bits = len(bits)
    steps.append({'step': 'text_to_bits', 'text': message, 'bits': bits, 'bit_string': ''.join(str(b) for b in bits)})

    alice_bits = bits
    alice_bases = [random.randint(0, 1) for _ in range(num_bits)]
    steps.append({'step': 'alice_bases', 'bases': alice_bases})

    qubits = []
    prepared_states = []
    for bit, basis in zip(alice_bits, alice_bases):
        qc = QuantumCircuit(1, 1)
        state_descr = None
        if bit == 1:
            qc.x(0)
        if basis == 1:
            qc.h(0)
        # Describe prepared quantum state for visualization
        if basis == 0 and bit == 0:
            state_descr = '|0>'
        elif basis == 0 and bit == 1:
            state_descr = '|1>'
        elif basis == 1 and bit == 0:
            state_descr = '|+>'
        elif basis == 1 and bit == 1:
            state_descr = '|->'
        prepared_states.append({'bit': bit, 'basis': basis, 'state': state_descr})
        qubits.append(qc)
    steps.append({'step': 'alice_prepare', 'prepared': prepared_states})

    eve_bases = []
    eve_results = []
    if eavesdrop:
        eve_actions = []
        for i, qc in enumerate(qubits):
            eve_basis = random.randint(0, 1)
            eve_bases.append(eve_basis)
            # Simulate Eve measurement result: if measuring in same basis as preparation, she'll get the prepared bit; otherwise random
            if eve_basis == alice_bases[i]:
                eve_result = alice_bits[i]
            else:
                eve_result = random.randint(0, 1)
            eve_results.append(eve_result)
            # Reprepare qubit according to Eve's measured outcome in the same basis (so she resends her measured state)
            qc.reset(0)
            if eve_basis == 0:
                if eve_result == 1:
                    qc.x(0)
            else:
                if eve_result == 0:
                    qc.h(0)
                else:
                    qc.x(0)
                    qc.h(0)
            eve_actions.append({'index': i, 'eve_basis': eve_basis, 'eve_result': eve_result, 'resent_state': ('|0>' if (eve_basis==0 and eve_result==0) else ('|1>' if (eve_basis==0 and eve_result==1) else ('|+>' if (eve_basis==1 and eve_result==0) else '|->')) )})
        steps.append({'step': 'eve_actions', 'actions': eve_actions})

    bob_bases = [random.randint(0, 1) for _ in range(num_bits)]
    steps.append({'step': 'bob_bases', 'bases': bob_bases})

    results = []
    simulator = Aer.get_backend('aer_simulator')
    for qc, basis in zip(qubits, bob_bases):
        circ = qc.copy()
        if basis == 1:
            circ.h(0)
        circ.measure(0, 0)
        job = simulator.run(circ, shots=1, memory=True)
        result = job.result()
        results.append(int(result.get_memory()[0]))
    steps.append({'step': 'bob_results', 'results': results})

    sifted_key_alice = []
    sifted_key_bob = []
    sifted_indices = []
    for i in range(num_bits):
        if alice_bases[i] == bob_bases[i]:
            sifted_key_alice.append(alice_bits[i])
            sifted_key_bob.append(results[i])
            sifted_indices.append(i)
    steps.append({'step': 'sifting', 'sifted_indices': sifted_indices, 'alice_sifted': sifted_key_alice, 'bob_sifted': sifted_key_bob})

    errors = sum([a != b for a, b in zip(sifted_key_alice, sifted_key_bob)])
    qber = errors / len(sifted_key_alice) if sifted_key_alice else 0
    eve_detected = qber > 0.15  # Arbitrary threshold for eavesdropping detection
    steps.append({'step': 'qber', 'errors': errors, 'qber': qber, 'eve_detected': eve_detected})

    # Try to reconstruct message from sifted key (if enough bits)
    delivered_message = None
    reconstruction_steps = []
    if len(sifted_key_bob) >= 8:
        chars = []
        for i in range(0, len(sifted_key_bob) - len(sifted_key_bob)%8, 8):
            byte = sifted_key_bob[i:i+8]
            val = int(''.join(str(b) for b in byte), 2)
            chars.append({'byte_index': i//8, 'bits': byte, 'value': val, 'char': chr(val)})
        delivered_message = ''.join([c['char'] for c in chars])
        reconstruction_steps = chars
    steps.append({'step': 'reconstruction', 'reconstruction': reconstruction_steps, 'delivered_message': delivered_message})

    return {
        'original_message': message,
        'delivered_message': delivered_message,
        'eve_detected': eve_detected,
        'qber': qber,
        'alice_key': sifted_key_alice,
        'bob_key': sifted_key_bob,
        'sifted_indices': sifted_indices,
        'total_bits': num_bits,
        'sifted_key_length': len(sifted_key_alice),
        'steps': steps
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/message', methods=['POST'])
def api_message():
    data = request.get_json()
    message = data.get('message', '')
    eavesdrop = bool(data.get('eavesdrop', False))
    result = bb84_message_sim(message, eavesdrop=eavesdrop)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
