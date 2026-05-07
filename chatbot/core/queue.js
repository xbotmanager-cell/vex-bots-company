// SIMPLE AI REQUEST QUEUE SYSTEM
// Controls request flow to avoid API spam / rate limits

class AIQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.delay = 800; // ms between requests
    }

    // Add request to queue
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            });

            this.run();
        });
    }

    // Start processing queue
    async run() {
        if (this.processing) return;

        this.processing = true;

        while (this.queue.length > 0) {

            const { task, resolve, reject } = this.queue.shift();

            try {
                const result = await task();
                resolve(result);
            } catch (err) {
                reject(err);
            }

            // small delay to prevent API spam
            await this.sleep(this.delay);
        }

        this.processing = false;
    }

    sleep(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    // optional: clear queue
    clear() {
        this.queue = [];
    }

    // optional: status check
    size() {
        return this.queue.length;
    }
}

module.exports = new AIQueue();
