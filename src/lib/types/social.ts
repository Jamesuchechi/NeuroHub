import type { Attachment } from '$lib/services/activity';

export type PostBlock = {
	id: string;
	content: string;
	attachments: Attachment[];
	showPollCreator: boolean;
	pollQuestion: string;
	pollOptions: string[];
};
