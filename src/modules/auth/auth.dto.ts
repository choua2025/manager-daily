export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  currency?: string;
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
