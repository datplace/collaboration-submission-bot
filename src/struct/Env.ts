import { singleton } from 'tsyringe';

@singleton()
export class Env {
	public readonly discordToken = process.env.DISCORD_TOKEN!;
	public readonly discordClientId = process.env.DISCORD_CLIENT_ID!;
	public readonly guildId = process.env.GUILD_ID!;
	public readonly submissionsChannelId = process.env.SUBMISSIONS_CHANNEL_ID!;
	public readonly approvedChannelId = process.env.APPROVED_CHANNEL_ID!;

	private readonly KEYS = [
		'DISCORD_TOKEN',
		'DISCORD_CLIENT_ID',
		'GUILD_ID',
		'SUBMISSIONS_CHANNEL_ID',
		'APPROVED_CHANNEL_ID',
	] as const;

	public constructor() {
		for (const key of this.KEYS) {
			if (!(key in process.env)) {
				throw new Error(`Missing environment variable: ${key}`);
			}
		}
	}
}
