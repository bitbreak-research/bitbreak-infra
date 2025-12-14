import { atom } from 'nanostores';

const $authState = atom({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null
});
function setAuthenticated(user, accessToken, refreshToken) {
  $authState.set({
    isAuthenticated: true,
    isLoading: false,
    user,
    accessToken: null,
    // May be null since tokens are in cookies
    refreshToken: null
    // May be null since tokens are in cookies
  });
}
function setLoading(isLoading) {
  $authState.set({
    ...$authState.get(),
    isLoading
  });
}
function clearAuth() {
  $authState.set({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    accessToken: null,
    refreshToken: null
  });
}

export { $authState as $, setAuthenticated as a, clearAuth as c, setLoading as s };
