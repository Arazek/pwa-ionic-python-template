import { selectUserFullName, selectUserProfile } from './auth.selectors';
import { initialAuthState } from './auth.state';

const profile = {
  firstName: 'Ada', lastName: 'Lovelace',
  email: 'ada@example.com', username: 'ada', emailVerified: true,
};

describe('selectUserProfile', () => {
  it('returns null when no profile loaded', () => {
    expect(selectUserProfile.projector(initialAuthState)).toBeNull();
  });

  it('returns the profile when loaded', () => {
    expect(selectUserProfile.projector({ ...initialAuthState, profile })).toEqual(profile);
  });
});

describe('selectUserFullName', () => {
  it('returns empty string when profile is null', () => {
    expect(selectUserFullName.projector(null)).toBe('');
  });

  it('joins first and last name', () => {
    expect(selectUserFullName.projector(profile)).toBe('Ada Lovelace');
  });

  it('returns only first name when last name is empty', () => {
    expect(selectUserFullName.projector({ ...profile, lastName: '' })).toBe('Ada');
  });

  it('returns only last name when first name is empty', () => {
    expect(selectUserFullName.projector({ ...profile, firstName: '' })).toBe('Lovelace');
  });
});
