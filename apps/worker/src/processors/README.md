# Worker Processors

This directory contains concrete BullMQ processor implementations for the current queue contracts:

- `csv-processing.processor.ts`: handles CSV upload parsing jobs
- `import.processor.ts`: handles confirmed import jobs
- `report.processor.ts`: handles report generation jobs
- `sync.processor.ts`: handles manual and scheduled sync jobs
- `notification.processor.ts`: handles notification jobs
- `outbox.processor.ts`: handles outbox dispatch jobs

Each processor is registered by `WorkerRuntimeService`, which creates BullMQ workers for every queue at application startup.
