/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Queue consumer: a Worker that can consume from a
 * Queue: https://developers.cloudflare.com/queues/get-started/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {
	AssistantCore,
	AssistantRunner,
	AssistantRunnerEvent,
	ChatClientFactory, SuccessReturnValue,
	ToolRegistry
} from '@mockingmagician/assistant-runner';

export default {
	// Our fetch handler is invoked on a HTTP request: we can send a message to a queue
	// during (or after) a request.
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#producer
	async fetch(req, env, ctx): Promise<Response> {
		// To send a message on a queue, we need to create the queue first
		// https://developers.cloudflare.com/queues/get-started/#3-create-a-queue
		await env.MY_QUEUE.send({
			body: JSON.stringify(req.body),
			delay: 10,
			priority: 1,
		});

		const client = await ChatClientFactory.createClient({
			provider: 'openai-like',
			options: {
				apiKey: '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',
				baseURL: 'https://api.openai.com/v1',
			}
		})

		const toolRegistry = new ToolRegistry();

		const core = new AssistantCore({
			client,
			model: 'gpt-4.5-turbo',
			maxTokens: 40000,
			timeout: 1000,
			initialMemory: [],
			toolRegistry: toolRegistry
		})
		const ass = new AssistantRunner({
			core,
			memoryMaxTokens: 40000,
		})

		const promised = new Promise(resolve => {
			ass.on(AssistantRunnerEvent.RESPONSE, (response) => {
				console.log(response)
				resolve(new Response(response.message))
				return
			})
		})

		await ass.run({
			userMessage: 'salut'
		})
		return await promised as Awaited<Response>
	},
	// The queue handler is invoked when a batch of messages is ready to be delivered
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch, env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		for (let message of batch.messages) {
			// Process each message (we'll just log these)
			console.log(`message ${message.id} processed: ${JSON.stringify(message.body)}`);
		}
	},
} satisfies ExportedHandler<Env, Error>;
