FROM node:16-alpine
LABEL name "displace submissions bot"

WORKDIR /opt/bot

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps curl

RUN curl -L https://unpkg.com/@pnpm/self-installer | node
RUN apk del .build-deps

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm i --frozen-lockfile

COPY src ./src
RUN pnpm run build
RUN pnpm prune --prod

CMD ["node", "--enable-source-maps", "./dist/index.js"]
