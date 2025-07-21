import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorLoggerService } from "../services/error-logger.service";

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly errorLogger: ErrorLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let details: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exceptionResponse as any).message || "HTTP Exception";
      details = typeof exceptionResponse === "object" ? exceptionResponse : {};
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      details = { name: exception.name, stack: exception.stack };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
      details = { exception: String(exception) };
    }

    // Log the error
    this.errorLogger.logError({
      type: "SYSTEM",
      severity: status >= 500 ? "HIGH" : "MEDIUM",
      message: `HTTP ${status}: ${message}`,
      stack: exception instanceof Error ? exception.stack : undefined,
      metadata: {
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
        params: request.params,
        query: request.query,
        userAgent: request.get("User-Agent"),
        ip: request.ip,
        status,
        details,
      },
    });

    // Send response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === "development" && { details }),
    };

    response.status(status).json(errorResponse);
  }
}
