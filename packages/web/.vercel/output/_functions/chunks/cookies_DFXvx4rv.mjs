const SESSION_ID_COOKIE = "sessionId";
const SESSION_TOKEN_COOKIE = "sessionToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const USER_EMAIL_COOKIE = "userEmail";
function setSessionCookies(cookies, sessionId, sessionToken, refreshToken, userEmail) {
  const twoHours = 2 * 60 * 60 * 1e3;
  const fiveDays = 5 * 24 * 60 * 60 * 1e3;
  cookies.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(twoHours / 1e3)
  });
  cookies.set(SESSION_TOKEN_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(twoHours / 1e3)
  });
  cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(fiveDays / 1e3)
  });
  cookies.set(USER_EMAIL_COOKIE, userEmail, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(twoHours / 1e3)
  });
}
function getSessionTokenCookie(cookies) {
  return cookies.get(SESSION_TOKEN_COOKIE)?.value || null;
}
function getRefreshTokenCookie(cookies) {
  return cookies.get(REFRESH_TOKEN_COOKIE)?.value || null;
}
function getSessionIdCookie(cookies) {
  return cookies.get(SESSION_ID_COOKIE)?.value || null;
}
function getUserEmailCookie(cookies) {
  return cookies.get(USER_EMAIL_COOKIE)?.value || null;
}
function clearSessionCookies(cookies) {
  cookies.delete(SESSION_ID_COOKIE, { path: "/" });
  cookies.delete(SESSION_TOKEN_COOKIE, { path: "/" });
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: "/" });
  cookies.delete(USER_EMAIL_COOKIE, { path: "/" });
}

export { getRefreshTokenCookie as a, getSessionIdCookie as b, clearSessionCookies as c, getUserEmailCookie as d, getSessionTokenCookie as g, setSessionCookies as s };
