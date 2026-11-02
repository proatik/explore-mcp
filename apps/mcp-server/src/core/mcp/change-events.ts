import { Injectable } from '@nestjs/common';

import type { ServerNotifier } from '@modelcontextprotocol/server';

// services publish here; the HTTP handler binds the notifier once it exists.
@Injectable()
export class ChangeEvents {
  private notifier: ServerNotifier | undefined;

  bind(notifier: ServerNotifier): void {
    this.notifier = notifier;
  }

  resourceUpdated(uri: string): void {
    this.notifier?.resourceUpdated(uri);
  }
}
