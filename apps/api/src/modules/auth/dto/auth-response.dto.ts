export class UserProfileDto {
  id: string;
  email: string;
  loyaltyPoints: number;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserProfileDto;
}
