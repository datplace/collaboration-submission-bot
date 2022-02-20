import { Rest } from '@cordis/rest';
import {
	APIActionRowComponent,
	APIApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponseChannelMessageWithSource,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APITextInputComponent,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	RESTPatchAPIChannelMessageJSONBody,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RESTPostAPIApplicationCommandsJSONBody,
	RESTPostAPIChannelMessageJSONBody,
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
	private readonly replied = new Set<string>();

	public constructor(private readonly rest: Rest, private readonly env: Env) {}

	public async registerInteractions(): Promise<void> {
		const commandsData: RESTPutAPIApplicationCommandsJSONBody = [];

		for await (const path of readdirRecurse(join(__dirname, '..', 'interactions'), { fileExtensions: ['js'] })) {
			const interaction = await (import(path) as Promise<{ default?: RESTPostAPIApplicationCommandsJSONBody }>).catch(
				(error) => {
					console.error('Error while resolving interaction object', path, error);
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
		if (this.replied.has(interaction.token)) {
			return this.rest.patch<unknown, RESTPatchAPIWebhookWithTokenMessageJSONBody>(
				Routes.webhookMessage(this.env.discordClientId, interaction.token, '@original'),
				{
					data: (data as APIInteractionResponseChannelMessageWithSource).data,
				},
			);
		}

		this.replied.add(interaction.token);
		setTimeout(() => this.replied.delete(interaction.token), 6e4).unref();

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

				case InteractionType.ModalSubmit: {
					return await this.handleModal(interaction);
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
				const makeActionRows = (components: APITextInputComponent[]): APIActionRowComponent<APITextInputComponent>[] =>
					components.map((component) => ({
						type: ComponentType.ActionRow,
						components: [component],
					}));

				return this.respond(interaction, {
					type: InteractionResponseType.Modal,
					data: {
						title: 'Submit a potential collaboration',
						custom_id: 'submit-collaboration',
						components: makeActionRows([
							{
								label: 'Project name',
								type: ComponentType.TextInput,
								custom_id: 'Project name',
								style: TextInputStyle.Short,
								placeholder:
									'This is the name of whatever project you need help with, which can also be a server name.',
								min_length: 2,
								max_length: 40,
							},
							{
								label: 'Type of help needed',
								type: ComponentType.TextInput,
								custom_id: 'Type of help needed',
								style: TextInputStyle.Paragraph,
								placeholder: 'This could be a few things, briefly describe the help you need in a list.',
								min_length: 50,
								max_length: 1000,
							},
							{
								label: 'Time Commitment Required',
								type: ComponentType.TextInput,
								custom_id: 'Time Commitment Required',
								style: TextInputStyle.Paragraph,
								placeholder:
									'If no real time commitment is needed, such as a one and done collaboration, you can put N/A.',
								min_length: 50,
								max_length: 1000,
							},
							{
								label: 'Paid Collaboration?',
								type: ComponentType.TextInput,
								custom_id: 'Paid Collaboration?',
								style: TextInputStyle.Paragraph,
								placeholder: 'If you expect to provide any financial compensation, please describe that here!',
								min_length: 50,
								max_length: 1000,
							},
							{
								label: 'Extra Information',
								type: ComponentType.TextInput,
								custom_id: 'Extra Information',
								style: TextInputStyle.Paragraph,
								placeholder:
									'This is for any extra information about posts. Tell them whatever else you want them to know.',
								min_length: 50,
								max_length: 1000,
							},
						]),
					},
				});
			}
		}
	}

	private async handleComponent(interaction: APIMessageComponentInteraction): Promise<unknown> {
		await this.respond(interaction, {
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});

		const [id, userId] = interaction.data.custom_id.split('|') as [string, string?];

		switch (id) {
			case 'approve': {
				await this.rest.post<unknown, RESTPostAPIChannelMessageJSONBody>(
					Routes.channelMessages(this.env.approvedChannelId),
					{
						data: {
							content: `<@${userId!}>`,
							embeds: [
								{
									...interaction.message.embeds[0]!,
									title: 'Collaboration opportunity',
									color: 7506394,
									footer: undefined,
									timestamp: new Date().toISOString(),
								},
							],
						},
					},
				);

				await this.rest.patch<unknown, RESTPatchAPIChannelMessageJSONBody>(
					Routes.channelMessage(interaction.channel_id, interaction.message.id),
					{
						data: {
							embeds: [
								{
									...interaction.message.embeds[0]!,
									color: 6931610,
									footer: {
										text: 'Approved',
									},
								},
							],
						},
					},
				);

				return this.respond(interaction, {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Approved! Please keep in mind that you can indicate that you've changed your mind by pressing the opposite button - but the bot won't delete the message it just posted.",
						flags: MessageFlags.Ephemeral,
					},
				});
			}

			case 'deny': {
				await this.rest.patch<unknown, RESTPatchAPIChannelMessageJSONBody>(
					Routes.channelMessage(interaction.channel_id, interaction.message.id),
					{
						data: {
							embeds: [
								{
									...interaction.message.embeds[0]!,
									color: 15953004,
									footer: {
										text: 'Denied',
									},
								},
							],
						},
					},
				);

				return this.respond(interaction, {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Denied. Please keep in mind that you can indicate that you've changed your mind by pressing the opposite button.",
						flags: MessageFlags.Ephemeral,
					},
				});
			}

			default: {
				console.warn('Somehow got unknown custom_id on a button');
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
	}

	private async handleModal(interaction: APIModalSubmitInteraction): Promise<unknown> {
		await this.respond(interaction, {
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});

		const submissionText = interaction.data.components
			?.map((c) => c.components[0]!)
			.map((component) => `**${component.custom_id}:**\n${component.value}`)
			.join('\n\n');

		const { user } = interaction.member!;

		await this.rest.post<unknown, RESTPostAPIChannelMessageJSONBody>(
			Routes.channelMessages(this.env.submissionsChannelId),
			{
				data: {
					embeds: [
						{
							title: 'Collaboration Submission',
							description: submissionText,
							author: {
								name: `${user.username}#${user.discriminator} (${user.id})`,
								icon_url: user.avatar
									? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
									: `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator, 10) % 5}.png`,
							},
							color: 7506394,
							footer: {
								text: 'Pending approval...',
							},
							timestamp: new Date().toISOString(),
						},
					],
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: `approve|${user.id}`,
									style: ButtonStyle.Success,
									label: 'Approve',
								},
								{
									type: ComponentType.Button,
									custom_id: 'deny',
									style: ButtonStyle.Danger,
									label: 'Deny',
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		);

		return this.respond(interaction, {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: 'Thank you for your submission! Please wait while the staff team reviews it.',
				flags: MessageFlags.Ephemeral,
			},
		});
	}
}
