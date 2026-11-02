import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  verifyBearerToken,
  bearerAuthChallengeResponse
} from '@modelcontextprotocol/server';

import { requestContext } from '@woocommerce-mcp/shared';

import { INVALID_TOKEN_MESSAGE } from '@/core/auth/auth.constants';
import { StaticTokenVerifier } from '@/core/auth/static-token-verifier';

import type { Request, Response } from 'express';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

export type AuthenticatedRequest = Request & { auth?: AuthInfo };

// the SDK handler reads the verified client from req.auth.
@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly verifier: StaticTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();

    try {
      const auth = await verifyBearerToken(request.headers.authorization, {
        verifier: this.verifier
      });
      const store = requestContext.getStore();

      request.auth = auth;

      if (store) store.clientId = auth.clientId;

      return true;
    } catch (error) {
      const challenge =
        bearerAuthChallengeResponse(error).headers.get('www-authenticate');

      if (challenge)
        http.getResponse<Response>().setHeader('WWW-Authenticate', challenge);

      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
  }
}
