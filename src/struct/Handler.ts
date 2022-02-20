import { Rest } from '@cordis/rest';
import {
	APIApplicationCommandInteraction,
	APIInteraction,
	APIMessageComponentInteraction,
	ApplicationCommandType,
	ComponentType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	RESTPostAPIApplicationCommandsJSONBody,
	RESTPostAPIInteractionCallbackJSONBody,
	RESTPutAPIApplicationCommandsJSONBody,
	RESTPutAPIApplicationCommandsResult,
	Routes,
	TextInputStyle,
} from 'discord-api-types/v9';
import { singleton } from 'tsyringe';
import { readdirRecurse } from '@chatsift/readdir';
import { join } from 'path';
import { Env } from './Env';

@singleton()
export class Handler {
	public constructor(private readonly rest: Rest, private readonly env: Env) {}

	public async registerInteractions(): Promise<void> {
		const commandsData: RESTPutAPIApplicationCommandsJSONBody = [];

		for await (const path of readdirRecurse(join(__dirname, '..', 'interactions'))) {
			const interaction = await (import(path) as Promise<{ default?: RESTPostAPIApplicationCommandsJSONBody }>).catch(
				(error) => {
					console.error(error);
					return null;
				},
			);

			if (interaction?.default) {
				commandsData.push(interaction.default);
			}
		}

		await this.rest.put<RESTPutAPIApplicationCommandsResult, RESTPutAPIApplicationCommandsJSONBody>(
			Routes.applicationGuildCommands(this.env.discordClientId, this.env.guildId),
			{
				data: commandsData,
			},
		);
	}

	public async respond(interaction: APIInteraction, data: RESTPostAPIInteractionCallbackJSONBody) {
		return this.rest.post<unknown, RESTPostAPIInteractionCallbackJSONBody>(
			Routes.interactionCallback(interaction.id, interaction.token),
			{
				data,
			},
		);
	}

	public async handle(interaction: APIInteraction): Promise<unknown> {
		if (!interaction.guild_id) {
			console.warn('Somehow got interaction outside of a guild', interaction);
			return this.respond(interaction, {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'This interaction is outside of a guild - if you somehow managed to get this error, please modmail us on how',
					flags: MessageFlags.Ephemeral,
				},
			});
		}

		try {
			switch (interaction.type) {
				case InteractionType.ApplicationCommand: {
					return await this.handleCommand(interaction);
				}

				case InteractionType.MessageComponent: {
					return await this.handleComponent(interaction);
				}

				default: {
					console.warn('Unexpected interaction type', interaction);
					return await this.respond(interaction, {
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							content:
								'Unexpected interaction type - if you somehow managed to get this error, please modmail us on how',
							flags: MessageFlags.Ephemeral,
						},
					});
				}
			}
		} catch (error) {
			console.error('Uncaught error while handling interaction', error);
			return this.respond(interaction, {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'Something went wrong while handling this interaction - please modmail us if you see this with steps on how to reproduce',
					flags: MessageFlags.Ephemeral,
				},
			});
		}
	}

	private async handleCommand(interaction: APIApplicationCommandInteraction): Promise<unknown> {
		if (interaction.data.type !== ApplicationCommandType.ChatInput) {
			console.warn('Got interaction with non-chat input command', interaction);
			return this.respond(interaction, {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						'This command is a non-chat input command - if you somehow managed to get this error, please modmail us on how',
					flags: MessageFlags.Ephemeral,
				},
			});
		}

		const name = interaction.data.name.toLowerCase();
		switch (name) {
			case 'submit': {
				// TODO(DD): Remove this
				console.log(interaction);
				return this.respond(interaction, {
					type: InteractionResponseType.Modal,
					data: {
						title: 'Submit a potential collaboration',
						custom_id: 'submit-collaboration',
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										label: 'Collaboration name',
										type: ComponentType.TextInput,
										custom_id: 'collaboration-name',
										style: TextInputStyle.Short,
									},
								],
							},
						],
					},
				});
			}
		}
	}

	private async handleComponent(interaction: APIMessageComponentInteraction): Promise<unknown> {
		return null;
	}
}
