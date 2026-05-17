# Worker Schedulers

Use this directory for recurring BullMQ job setup such as:

- scheduled sync enqueueing
- report cleanup or expiry jobs
- retry or replay maintenance jobs

The current scaffold wires queue processors at startup; schedulers are the next layer to add when recurring jobs are introduced.
