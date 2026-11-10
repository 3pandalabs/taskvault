// Domain errors thrown by routes; index.ts's error handler renders them as
// the ROUTES.md error body: { "error": "<snake_case_code>", "message": "..." }.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFound = (message = "Not found.") => new ApiError(404, "not_found", message);
export const invalid = (code: string, message: string) => new ApiError(400, code, message);
export const unauthorized = (code: string, message: string) => new ApiError(401, code, message);

export function errorBody(code: string, message: string): { error: string; message: string } {
  return { error: code, message };
}
