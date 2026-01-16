import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

interface IError {
  message: string;
  code_error: string | null;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request: any = ctx.getRequest();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message: IError = exception instanceof HttpException
      ? {
          message: 
            typeof exception.getResponse() === 'object' && exception.getResponse() !== null
              ? (exception.getResponse() as any).message || 'Unknown error'
              : exception.message,
          code_error: 
            typeof exception.getResponse() === 'object' && exception.getResponse() !== null
              ? (exception.getResponse() as any).code_error || null
              : null,
        }
      : { 
          message: (exception as Error).message || 'Internal server error', 
          code_error: null 
        };

    const responseData = {
      ...{
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      ...message,
    };

    this.logMessage(request, message, status, exception);
    response.status(status).json(responseData);
  }

  private logMessage(request: any, message: IError, status: number, exception: any): void {
    const logMessage = `method=${request.method} status=${status} code_error=${message.code_error || 'null'} message=${message.message || 'null'}`;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `End Request for ${request.path}`,
        logMessage,
        status >= 500 ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `End Request for ${request.path}`,
        logMessage,
      );
    }
  }
}