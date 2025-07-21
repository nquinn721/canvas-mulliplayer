import { ArgumentsHost, Catch, WsExceptionFilter } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { ErrorLoggerService } from "../services/error-logger.service";

@Catch()
export class WebSocketExceptionFilter implements WsExceptionFilter {
  constructor(private readonly errorLogger: ErrorLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    let message: string;
    let error: any = {};

    if (exception instanceof WsException) {
      message = exception.message;
      error = exception.getError();
    } else if (exception instanceof Error) {
      message = exception.message;
      error = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = "WebSocket error occurred";
      error = { exception: String(exception) };
    }

    // Log the WebSocket error
    this.errorLogger.logWebSocketError(
      exception instanceof Error ? exception : new Error(message),
      client.id,
      "unknown"
    );

    // Emit error to client
    client.emit("error", {
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && { error }),
    });
  }
}
