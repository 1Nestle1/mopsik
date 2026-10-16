import type { TFile } from '@sharkord/shared';

// in development the api runs on its own port next to vite. using the hostname the page was
// opened with, instead of localhost, lets a phone or laptop on the same wifi reach it too
const DEV_SERVER_PORT = 4991;

const getHostFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `${window.location.hostname}:${DEV_SERVER_PORT}`;
  }

  return window.location.host;
};

const getUrlFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `http://${window.location.hostname}:${DEV_SERVER_PORT}`;
  }

  const host = window.location.host;
  const currentProtocol = window.location.protocol;

  const finalUrl = `${currentProtocol}//${host}`;

  return finalUrl;
};

const getFileUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const url = getUrlFromServer();

  let baseUrl = `${url}/public/${encodeURIComponent(file.name)}`;

  if (file._accessToken) {
    baseUrl += `?accessToken=${file._accessToken}`;

    if (file._accessTokenExpiresAt) {
      baseUrl += `&expires=${file._accessTokenExpiresAt}`;
    }
  }

  return baseUrl;
};

export { getFileUrl, getHostFromServer, getUrlFromServer };
