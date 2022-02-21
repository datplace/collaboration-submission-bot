import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';

const promptCommand: RESTPostAPIApplicationCommandsJSONBody = {
	name: 'prompt',
	description: 'Posts the prompt for the FAQ in the current channel',
	type: ApplicationCommandType.ChatInput,
	options: [],
	default_permission: false,
};

export default promptCommand;
