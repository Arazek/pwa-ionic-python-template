export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  emailVerified: boolean;
}

export interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  profile: null,
  loading: false,
  error: null,
};
