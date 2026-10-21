// plays the raw sound the capture helper sends: 16 bit, 2 channels, 48 kHz, interleaved. the
// chunks arrive unevenly through ipc, so a short buffer fills before playing starts, and the
// buffer is trimmed whenever it grows, so the stream's sound never drifts behind its picture

const PRIME_SECONDS = 0.06;
const MAX_LATENCY_SECONDS = 0.25;

class PcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();

    this.capacity = sampleRate * 2;
    this.left = new Float32Array(this.capacity);
    this.right = new Float32Array(this.capacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.available = 0;
    this.primed = false;
    this.primeFrames = Math.round(sampleRate * PRIME_SECONDS);
    this.maxFrames = Math.round(sampleRate * MAX_LATENCY_SECONDS);

    this.port.onmessage = (event) => this.push(event.data);
  }

  push(bytes) {
    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
    const frames = Math.floor(samples.length / 2);

    for (let frame = 0; frame < frames; frame++) {
      this.left[this.writeIndex] = samples[frame * 2] / 32768;
      this.right[this.writeIndex] = samples[frame * 2 + 1] / 32768;
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
    }

    this.available += frames;

    if (this.available > this.maxFrames) {
      const excess = this.available - this.primeFrames;

      this.readIndex = (this.readIndex + excess) % this.capacity;
      this.available -= excess;
    }
  }

  process(_inputs, outputs) {
    const [left, right] = outputs[0];

    if (!this.primed && this.available >= this.primeFrames) {
      this.primed = true;
    }

    for (let index = 0; index < left.length; index++) {
      if (!this.primed || this.available === 0) {
        left[index] = 0;
        right[index] = 0;

        continue;
      }

      left[index] = this.left[this.readIndex];
      right[index] = this.right[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
      this.available--;
    }

    if (this.available === 0) this.primed = false;

    return true;
  }
}

registerProcessor('pcm-player', PcmPlayer);
