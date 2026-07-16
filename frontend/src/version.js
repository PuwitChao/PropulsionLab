import appVersion from '../../app_version.json'

export const APP_VERSION = appVersion.version
export const APP_BUILD_DATE = appVersion.build_date
export const APP_STATUS = appVersion.status

export const versionLabel = (prefix) => `${prefix}_V${APP_VERSION}`