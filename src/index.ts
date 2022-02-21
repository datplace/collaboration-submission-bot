import 'reflect-metadata';
import { Cluster } from '@cordis/gateway';
import { Rest } from '@cordis/rest';
import { container } from 'tsyringe';
import { Env } from './struct/Env';
import { Handler } from './struct/Handler';
import { GatewayDispatchEvents } from 'discord-api-types/v9';

async function main(): Promise<void> {
	const { discordToken } = container.resolve(Env);
	container.register(Rest, { useValue: new Rest(discordToken) });

	const gateway = new Cluster(discordToken);
	const handler = container.resolve(Handler);

	gateway
		.on('ready', () => console.log('Listening to interactions'))
		.on('dispatch', (payload) => {
			// @ts-expect-error - Miss matched discord-api-types versions
			if (payload.t !== GatewayDispatchEvents.InteractionCreate) {
				console.warn('Unknown dispatch type (this could mean miss-configured intents or nothing at all):', payload.t);
				return null;
			}

			// @ts-expect-error - Miss matched discord-api-types versions
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			void handler.handle(payload.d);
		});

	await handler.registerInteractions();
	await gateway.connect();
}

void main();
