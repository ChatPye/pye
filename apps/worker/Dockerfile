FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY apps/worker/dist ./dist
COPY packages ./packages
CMD ["node", "dist/worker.js"]
