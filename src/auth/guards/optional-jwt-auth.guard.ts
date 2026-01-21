import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    
    // If no token, just continue without authentication
    if (!token) {
      return true;
    }
    
    // If token exists, try to authenticate
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context) {
    // If there's an error or no user, just return undefined
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}