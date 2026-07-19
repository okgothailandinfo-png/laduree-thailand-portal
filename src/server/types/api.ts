export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  requestId?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
  requestId?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
