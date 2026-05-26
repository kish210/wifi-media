import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "4000"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "wifi-media-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  tvheadend: {
    url: process.env.TVHEADEND_URL ?? "http://localhost:9981",
    user: process.env.TVHEADEND_USER ?? "admin",
    pass: process.env.TVHEADEND_PASS ?? "admin",
  },

  db: {
    path: process.env.DB_PATH ?? "./data/wifi-media.db",
  },

  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },

  media: {
    path: process.env.MEDIA_PATH ?? "./media",
  },

  app: {
    name: process.env.APP_NAME ?? "WiFi-Media",
    tagline: process.env.APP_TAGLINE ?? "Entertainment. Anywhere. Offline.",
    localIp: process.env.LOCAL_IP ?? "192.168.1.1",
  },
} as const;
