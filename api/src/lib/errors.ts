export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`)
export const badRequest = (msg: string) => new AppError(400, msg)
export const conflict = (msg: string) => new AppError(409, msg)
export const unauthorized = (msg = 'Not signed in') => new AppError(401, msg)
