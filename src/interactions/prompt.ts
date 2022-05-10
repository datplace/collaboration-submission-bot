import {
	ApplicationCommandType,
	PermissionFlagsBits,
	RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v9';

const promptCommand: RESTPostAPIApplicationCommandsJSONBody = {
	name: 'prompt',
	description: 'Posts the prompt for the FAQ in the current channel',
	type: ApplicationCommandType.ChatInput,
	options: [],
	// @ts-expect-error - discord-api-types is yet to support this field
	default_member_permission: String(PermissionFlagsBits.ManageGuild),
	dm_permission: false,
};

export default promptCommand;
