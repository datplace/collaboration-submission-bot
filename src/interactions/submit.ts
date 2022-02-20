import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';

const submitCommand: RESTPostAPIApplicationCommandsJSONBody = {
	name: 'submit',
	description: 'Submits an entry to #collaborations',
	type: ApplicationCommandType.ChatInput,
	options: [],
};

export default submitCommand;
