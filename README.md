# About

Displace bot for helping us manage our #collaborations channel

## Contributing

Make sure you have an up-to-date install of pnpm on your machine. Install dependencies using `pnpm i`, fill out an `.env` file after the example, and get to deving! You can load environmental variables however you wish, but you should probably just use docker-compose. If you're not using docker, building the code can be done using `pnpm run build`.

## Self hosting

Running it on your own is very similar to the dev process, fill out an .env file, run it via docker (i.e. `docker-compose build` and `docker-compose up -d`) or `pnpm i`, `pnpm run build` and `node --enable-source-maps ./dist/index.js` (or however else you like running node processes, e.g. with pm2)

## Licensing

This repository is licensed under the GNU AGPLv3 license.
