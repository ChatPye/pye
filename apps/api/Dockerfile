FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY apps/api/dist ./dist
COPY packages ./packages
EXPOSE 8080
CMD ["node", "dist/server.js"]
