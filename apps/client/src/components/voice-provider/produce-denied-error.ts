// the server refused to take a track (no permission to speak, film or share in this channel).
// typed so the caller can tell a refusal apart from a device that does not work
class ProduceDeniedError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'ProduceDeniedError';
  }
}

export { ProduceDeniedError };
