import { Injectable } from '@nestjs/common';

import type { ServerResponse } from 'node:http';

export interface Fault {
  status: number | 'hang';
  times: number;
  method?: string;
  pathIncludes?: string;
}

export interface RecordedRequest {
  method: string;
  path: string;
}

@Injectable()
export class FaultService {
  readonly requests: RecordedRequest[] = [];

  private faults: Fault[] = [];
  private readonly hanging = new Set<ServerResponse>();

  record(request: RecordedRequest): void {
    this.requests.push(request);
  }

  inject(fault: Fault): void {
    this.faults.push({ ...fault });
  }

  // consumes one use of the first fault that matches the request.
  take(method: string, path: string): Fault | undefined {
    const fault = this.faults.find(
      (item) =>
        item.times > 0 &&
        (!item.pathIncludes || path.includes(item.pathIncludes)) &&
        (!item.method || item.method === method)
    );

    if (fault) fault.times -= 1;

    return fault;
  }

  hold(response: ServerResponse): void {
    this.hanging.add(response);
  }

  releaseHanging(): void {
    for (const response of this.hanging) response.destroy();

    this.hanging.clear();
  }

  reset(): void {
    this.faults = [];
    this.requests.length = 0;
  }
}
